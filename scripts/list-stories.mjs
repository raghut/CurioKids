import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/list-stories.mjs');
	process.exit(1);
}

const sql = neon(url);
const rows = await sql`
	SELECT id, created_at, language, title, age_tag,
	       (cover_url <> '') AS has_cover
	FROM stories
	ORDER BY created_at DESC
`;

console.log(`Total stories: ${rows.length}\n`);
for (const r of rows) {
	console.log(
		`${r.created_at.toISOString?.() ?? r.created_at}  [${r.language}] cover:${r.has_cover ? 'Y' : 'N'}  "${r.title}"  ${r.id}`
	);
}
