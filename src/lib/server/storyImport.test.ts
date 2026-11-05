import { describe, it, expect } from 'vitest';
import { parseStoryImport } from './storyImport';
import { themes } from '$lib/data/themes';

// Every story file in content/stories is checked with the same rules the import page
// uses, so a broken file fails `npm test` before it reaches the admin.
const files = import.meta.glob<string>('../../../content/stories/*.json', {
	query: '?raw',
	import: 'default',
	eager: true
});

let n = 0;
const opts = { themes, newId: () => `uuid-${++n}`, now: () => '2026-11-05T00:00:00.000Z' };

const page = (t: string) => ({ text: t });
function words(pages = 4) {
	return {
		title: 'Mishti shares',
		pages: Array.from({ length: pages }, (_, i) => page(`Page ${i + 1}.`)),
		moral: 'Sharing is kind.',
		reflection_question: 'What would you share?'
	};
}
function base(extra: Record<string, unknown> = {}) {
	return { character_id: 'rabbit', theme_id: 'sharing', age_tag: '5-6', content: { en: words() }, ...extra };
}
const run = (o: unknown) => parseStoryImport(JSON.stringify(o), opts);

describe('parseStoryImport', () => {
	it('imports a plain story as one draft with no pictures', () => {
		const r = run(base());
		expect(r.ok).toBe(true);
		if (!r.ok) return;
		expect(r.stories).toHaveLength(1);
		const s = r.stories[0];
		expect(s.status).toBe('draft');
		expect(s.language).toBe('en');
		expect(s.cover_image_url).toBe('');
		expect(s.pages.every((p) => p.image_url === '')).toBe(true);
		expect(s.child_name).toBeNull();
		expect(s.scene).toBeUndefined();
	});

	it('makes one row per language, with ids suffixed by language', () => {
		const r = run(base({ id: 'story-x', content: { en: words(), te: words() } }));
		expect(r.ok && r.stories.map((s) => s.id)).toEqual(['story-x-en', 'story-x-te']);
		expect(run(base({ id: '../etc' })).ok).toBe(false);
	});

	it('rejects languages whose page counts differ, since they share one scene', () => {
		const r = run(base({ content: { en: words(4), te: words(5) } }));
		expect(!r.ok && r.message).toMatch(/same number of pages/);
	});

	it('rejects unknown characters, archived themes and bad age bands', () => {
		expect(run(base({ character_id: 'dragon' })).ok).toBe(false);
		expect(run(base({ theme_id: 'help_friend' })).ok).toBe(false);
		expect(run(base({ age_tag: '5-8' })).ok).toBe(false);
	});

	it('rejects too few pages, blank pages and missing moral', () => {
		expect(run(base({ content: { en: words(3) } })).ok).toBe(false);
		const blank = words();
		blank.pages[1] = page('  ');
		expect(run(base({ content: { en: blank } })).ok).toBe(false);
		expect(run(base({ content: { en: { ...words(), moral: '' } } })).ok).toBe(false);
	});

	it('rejects broken JSON and an unknown language', () => {
		expect(parseStoryImport('{ "id": ', opts).ok).toBe(false);
		expect(run(base({ content: { hi: words() } })).ok).toBe(false);
	});

	it('accepts a scene with one known-layer list per page and dedupes layers', () => {
		const layers = [['day', 'pull'], ['carrot', 'carrot'], ['tortoise'], []];
		const r = run(base({ scene: { id: 'carrot-share', page_layers: layers } }));
		expect(r.ok && r.stories[0].scene?.page_layers[1]).toEqual(['carrot']);
	});

	it('rejects an unknown scene, a wrong layer count and a misspelt layer', () => {
		expect(run(base({ scene: { id: 'nope', page_layers: [[], [], [], []] } })).ok).toBe(false);
		expect(run(base({ scene: { id: 'carrot-share', page_layers: [[]] } })).ok).toBe(false);
		const r = run(base({ scene: { id: 'carrot-share', page_layers: [['carot'], [], [], []] } }));
		expect(!r.ok && r.message).toMatch(/carot/);
	});

	it('finds at least one story file', () => {
		expect(Object.keys(files).length).toBeGreaterThan(0);
	});

	for (const [path, raw] of Object.entries(files)) {
		it(`imports ${path.split('/').pop()}`, () => {
			const r = parseStoryImport(raw, opts);
			expect(r.ok ? 'ok' : r.message).toBe('ok');
		});
	}
});
