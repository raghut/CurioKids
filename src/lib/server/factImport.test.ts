import { describe, it, expect } from 'vitest';
// ?raw keeps node:fs (and its missing type package) out of the test.
import waterCycleRaw from '../../../content/facts/water-cycle.json?raw';
import { parseFactImport } from './factImport';
import { flattenFact } from './factFlatten';

const opts = { newId: () => 'uuid-1', now: () => '2026-11-05T00:00:00.000Z' };

function base(extra: Record<string, unknown> = {}) {
	return {
		topic: 'rain',
		structure: [{ type: 'question' }, { type: 'discovery' }, { type: 'lesson' }],
		content: {
			en: {
				title: 'Where does rain come from?',
				sections: [{ text: 'Q?' }, { text: 'D.' }, { text: 'L.' }],
				reflection_question: 'Why?',
				real_world_mission: 'Look up.'
			}
		},
		...extra
	};
}
const run = (o: unknown) => parseFactImport(JSON.stringify(o), opts);

describe('parseFactImport', () => {
	it('imports a plain fact as a draft with empty images and a fresh id', () => {
		const r = run(base());
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.fact.id).toBe('uuid-1');
		expect(r.fact.status).toBe('draft');
		expect(r.fact.section_images).toEqual(['', '', '']);
		expect(r.fact.cover_image_url).toBe('');
		expect(r.fact.scene).toBeUndefined();
	});

	it('keeps a valid stable id and rejects an unsafe one', () => {
		const ok = run(base({ id: 'fact-water-cycle' }));
		expect(ok.ok && ok.fact.id).toBe('fact-water-cycle');
		expect(run(base({ id: '../etc' })).ok).toBe(false);
		expect(run(base({ id: 'Has Spaces' })).ok).toBe(false);
	});

	it('rejects broken JSON and non-objects with a readable message', () => {
		const bad = parseFactImport('{ "topic": ', opts);
		expect(bad.ok).toBe(false);
		expect(!bad.ok && bad.message).toMatch(/not valid JSON/);
		expect(parseFactImport('[1,2]', opts).ok).toBe(false);
	});

	it('passes through the same validation a generated fact faces', () => {
		const r = run(base({ structure: [{ type: 'question' }] }));
		expect(r.ok).toBe(false);
		expect(!r.ok && r.message).toMatch(/^The fact \(en\) has 3 sections/);
	});

	it('accepts a scene with one known-layer list per section', () => {
		const r = run(base({ scene: { id: 'water-cycle', section_layers: [['rain'], ['vapor', 'vapor'], []] } }));
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.fact.scene).toEqual({ id: 'water-cycle', section_layers: [['rain'], ['vapor'], []] });
	});

	it('rejects an unknown scene, a wrong layer count and an unknown layer', () => {
		expect(run(base({ scene: { id: 'no-such-scene', section_layers: [[], [], []] } })).ok).toBe(false);
		expect(run(base({ scene: { id: 'water-cycle', section_layers: [[], []] } })).ok).toBe(false);
		const typo = run(base({ scene: { id: 'water-cycle', section_layers: [['rian'], [], []] } }));
		expect(typo.ok).toBe(false);
		expect(!typo.ok && typo.message).toMatch(/"rian"/);
	});
});

// Every bundled fact must pass the exact checks /admin/facts/import runs, in both
// languages, with one layer list per section — so a broken file fails here, not on upload.
const allFacts = import.meta.glob<string>('../../../content/facts/*.json', {
	query: '?raw',
	import: 'default',
	eager: true
});

describe('every bundled fact file', () => {
	const entries = Object.entries(allFacts);

	it('finds the fact files', () => {
		expect(entries.length).toBeGreaterThanOrEqual(20);
	});

	it.each(entries)('%s imports cleanly in English and Telugu with a scene', (_path, raw) => {
		const r = parseFactImport(raw, opts);
		if (!r.ok) throw new Error(r.message);
		expect(Object.keys(r.fact.content).sort()).toEqual(['en', 'te']);
		expect(r.fact.scene?.section_layers).toHaveLength(r.fact.structure.length);
		expect(r.fact.id).toMatch(/^fact-/);
	});

	it('uses a different id for every fact', () => {
		const ids = entries.map(([, raw]) => JSON.parse(raw).id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe('the bundled water-cycle fact', () => {
	const raw = waterCycleRaw;

	it('imports cleanly in both languages with its scene', () => {
		const r = parseFactImport(raw, opts);
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(Object.keys(r.fact.content).sort()).toEqual(['en', 'te']);
		expect(r.fact.scene?.id).toBe('water-cycle');
		expect(r.fact.scene?.section_layers).toHaveLength(r.fact.structure.length);
	});

	it('flattens with the scene shared by both languages', () => {
		const r = parseFactImport(raw, opts);
		if (!r.ok) throw new Error(r.message);
		const en = flattenFact(r.fact, 'en');
		const te = flattenFact(r.fact, 'te');
		expect(en?.scene).toEqual(te?.scene);
		expect(en?.sections[0]).toMatchObject({ type: 'question', image: '' });
	});
});
