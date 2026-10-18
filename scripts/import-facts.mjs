import { neon } from '@neondatabase/serverless';
import { readFile } from 'node:fs/promises';

/**
 * One-time import of the bundled facts into the `facts` table.
 *
 * Idempotent: ON CONFLICT DO NOTHING, so re-running imports nothing and is safe.
 * The bundled JSON is left in place and in git history — it simply stops being read
 * once loadContent.ts points at /api/facts.
 *
 * Imported facts keep their original id (e.g. "fact-001") because the progress store
 * keys a child's completion on that exact string; a new id would silently un-complete
 * a fact they had already read.
 *
 * Run with: node --env-file=.env scripts/import-facts.mjs
 */

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/import-facts.mjs');
	process.exit(1);
}

const sql = neon(url);

const SOURCES = [
	{ language: 'en', path: 'static/content/facts/en/index.json' },
	{ language: 'te', path: 'static/content/facts/te/index.json' }
];

/** Bundled kid-facing Fact -> stored FactRecord (single language filled). */
function toRecord(fact, language) {
	const sections = Array.isArray(fact.sections) ? fact.sections : [];
	return {
		id: fact.id,
		type: 'nature_fact',
		topic: fact.topic ?? '',
		age_range: '5-8',
		// These are live for children today; importing them as drafts would be a
		// silent regression.
		status: 'published',
		cover_image_url: fact.cover_image ?? '',
		// Hand-authored facts have no generated prompts behind their pictures.
		section_images: sections.map((s) => s.image ?? ''),
		structure: sections.map((s) => ({ type: s.type })),
		content: {
			[language]: {
				title: fact.title,
				...(fact.subtitle ? { subtitle: fact.subtitle } : {}),
				sections: sections.map((s) =>
					s.type === 'fun_facts' ? { items: s.items ?? [] } : { text: s.text ?? '' }
				),
				reflection_question: fact.reflection_question ?? '',
				real_world_mission: fact.real_world_mission ?? ''
			}
		},
		created_at: new Date().toISOString()
	};
}

let imported = 0;
let skipped = 0;
let missing = 0;

for (const { language, path } of SOURCES) {
	let raw;
	try {
		raw = await readFile(path, 'utf8');
	} catch {
		console.log(`· ${path} not present — nothing to import for ${language}`);
		missing++;
		continue;
	}

	const facts = JSON.parse(raw);
	for (const fact of facts) {
		const record = toRecord(fact, language);
		const rows = await sql`
			INSERT INTO facts (id, topic, status, cover_url, fact)
			VALUES (${record.id}, ${record.topic}, ${record.status}, ${record.cover_image_url}, ${JSON.stringify(record)})
			ON CONFLICT (id) DO NOTHING
			RETURNING id
		`;
		if (rows.length) {
			imported++;
			console.log(`✓ imported ${record.id} (${language}) — ${record.structure.length} sections`);
		} else {
			skipped++;
			console.log(`· ${record.id} already present, left alone`);
		}
	}
}

console.log(
	`\n✅ facts import done — ${imported} imported, ${skipped} already present` +
		(missing ? `, ${missing} source file(s) absent` : '')
);
