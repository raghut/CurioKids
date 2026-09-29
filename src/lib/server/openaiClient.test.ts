import { describe, it, expect } from 'vitest';
import { parseStoryJson } from './openaiClient';

const page = (n: number) => ({ text: `Page ${n} text.`, image_prompt: `scene ${n}` });
const good = {
	title: 'Motu Finds A Banana',
	pages: [1, 2, 3, 4, 5].map(page),
	moral: 'Sharing makes friends happy.',
	reflection_question: 'What would you share?',
	scene: 'a baby elephant holding a banana',
	hero_descriptor: 'a small grey baby elephant with big ears and a curled trunk'
};

describe('parseStoryJson', () => {
	it('accepts a well-formed payload and keeps hero_descriptor', () => {
		const r = parseStoryJson(JSON.stringify(good));
		expect(r.title).toBe('Motu Finds A Banana');
		expect(r.pages).toHaveLength(5);
		expect(r.hero_descriptor).toContain('baby elephant');
	});

	it('rejects non-JSON', () => {
		expect(() => parseStoryJson('not json')).toThrow(/invalid JSON/);
	});

	it('rejects the wrong page count', () => {
		expect(() => parseStoryJson(JSON.stringify({ ...good, pages: [1, 2, 3, 4].map(page) }))).toThrow(
			/missing required fields/
		);
	});

	it('rejects a missing title, moral, or reflection question', () => {
		for (const field of ['title', 'moral', 'reflection_question'] as const) {
			const bad = { ...good, [field]: '' };
			expect(() => parseStoryJson(JSON.stringify(bad)), field).toThrow(/missing required fields/);
		}
	});

	it('rejects an empty page', () => {
		const pages = [1, 2, 3, 4, 5].map(page);
		pages[2] = { text: '   ', image_prompt: 'x' };
		expect(() => parseStoryJson(JSON.stringify({ ...good, pages }))).toThrow(/empty page/);
	});

	it('still parses when hero_descriptor is absent (the kid flow never asks for it)', () => {
		const { hero_descriptor: _omit, ...withoutHero } = good;
		expect(parseStoryJson(JSON.stringify(withoutHero)).hero_descriptor).toBeUndefined();
	});
});

describe('supporting character fields', () => {
	it('parses supporting_descriptor and per-page has_supporting', () => {
		const pages = [1, 2, 3, 4, 5].map(page);
		pages[1] = { ...pages[1], has_supporting: true } as (typeof pages)[number];
		const r = parseStoryJson(
			JSON.stringify({ ...good, pages, supporting_descriptor: 'a small green parrot' })
		);
		expect(r.supporting_descriptor).toBe('a small green parrot');
		expect(r.pages[1].has_supporting).toBe(true);
		expect(r.pages[0].has_supporting).toBeUndefined();
	});

	it('stays optional — a story with no side character still parses', () => {
		expect(parseStoryJson(JSON.stringify(good)).supporting_descriptor).toBeUndefined();
	});
});

describe('expectedPages', () => {
	const withPages = (n: number) => JSON.stringify({ ...good, pages: Array.from({ length: n }, (_, i) => page(i + 1)) });

	it('defaults to 5, which keeps the kid flow unchanged', () => {
		expect(parseStoryJson(withPages(5)).pages).toHaveLength(5);
		expect(() => parseStoryJson(withPages(6))).toThrow(/missing required fields/);
	});

	it('accepts 6 pages when 6 are expected (the 2-4 band)', () => {
		expect(parseStoryJson(withPages(6), 6).pages).toHaveLength(6);
	});

	it('is an exact match — 5 pages fails when 6 were asked for', () => {
		// A band that asked for 6 and got 5 is a failure worth seeing, not one to absorb.
		expect(() => parseStoryJson(withPages(5), 6)).toThrow(/missing required fields/);
	});
});
