import { describe, it, expect } from 'vitest';
import { assembleStory } from './assembleStory';
import type { StoryTextResult } from './openaiClient';

const text: StoryTextResult = {
	title: 'Brave Mishti',
	pages: [
		{ text: 'p1', image_prompt: 'a' },
		{ text: 'p2', image_prompt: 'b' }
	],
	moral: 'Be brave.',
	reflection_question: 'What made you brave?',
	scene: 'a meadow'
};

describe('assembleStory', () => {
	it('maps page image urls in order and sets metadata', () => {
		const story = assembleStory({
			id: 'abc',
			text,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: 'Geeta',
			coverUrl: 'http://blob/cover.jpg',
			pageUrls: ['http://blob/p1.jpg', 'http://blob/p2.jpg'],
			createdAt: '2026-01-01T00:00:00Z',
			status: 'published'
		});
		expect(story.id).toBe('abc');
		expect(story.source).toBe('generated');
		expect(story.age_tag).toBe('5-8');
		expect(story.cover_image_url).toBe('http://blob/cover.jpg');
		expect(story.pages).toEqual([
			{ text: 'p1', image_url: 'http://blob/p1.jpg', image_prompt: '' },
			{ text: 'p2', image_url: 'http://blob/p2.jpg', image_prompt: '' }
		]);
		expect(story.child_name).toBe('Geeta');
	});
	it('uses empty string for a missing page url (failed/disabled image)', () => {
		const story = assembleStory({
			id: 'abc',
			text,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: null,
			coverUrl: '',
			pageUrls: ['http://blob/p1.jpg', ''],
			createdAt: '2026-01-01T00:00:00Z',
			status: 'draft'
		});
		expect(story.pages[1].image_url).toBe('');
		expect(story.cover_image_url).toBe('');
	});
	it('sets the status passed in', () => {
		const story = assembleStory({
			id: 'id-1',
			text: { title: 'T', pages: [{ text: 'p1' }], moral: 'm', reflection_question: 'r', scene: 's' } as never,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: null,
			coverUrl: '',
			pageUrls: [],
			createdAt: '2026-09-19T00:00:00.000Z',
			status: 'published'
		});
		expect(story.status).toBe('published');
	});
	it('uses a passed age_tag and defaults to 5-8 when omitted', () => {
		const withBand = assembleStory({
			id: 'id-2', text: { title: 'T', pages: [{ text: 'p1' }], moral: 'm', reflection_question: 'r', scene: 's' } as never,
			language: 'en', character_id: 'rabbit', theme_id: 'be_brave', childName: null,
			coverUrl: '', pageUrls: [], createdAt: '2026-09-25T00:00:00.000Z', status: 'draft', age_tag: '5-6'
		});
		expect(withBand.age_tag).toBe('5-6');
		const noBand = assembleStory({
			id: 'id-3', text: { title: 'T', pages: [{ text: 'p1' }], moral: 'm', reflection_question: 'r', scene: 's' } as never,
			language: 'en', character_id: 'rabbit', theme_id: 'be_brave', childName: null,
			coverUrl: '', pageUrls: [], createdAt: '2026-09-25T00:00:00.000Z', status: 'published'
		});
		expect(noBand.age_tag).toBe('5-8');
	});
});

describe('stored prompts', () => {
	const base = {
		id: 'x', language: 'en' as const, character_id: 'rabbit', theme_id: 'be_brave',
		childName: null, coverUrl: 'c', createdAt: '2026-09-27T00:00:00.000Z', status: 'draft' as const
	};
	const text = {
		title: 'T', moral: 'M', reflection_question: 'Q', scene: 's',
		pages: [1, 2, 3, 4, 5].map((n) => ({ text: `p${n}`, image_prompt: `ip${n}` }))
	};

	it('records the rendered cover and page prompts', () => {
		const story = assembleStory({
			...base, text, pageUrls: ['a', 'b', 'c', 'd', 'e'],
			coverPrompt: 'COVER PROMPT', pagePrompts: ['P1', 'P2', 'P3', 'P4', 'P5']
		});
		expect(story.cover_prompt).toBe('COVER PROMPT');
		expect(story.pages.map((p) => p.image_prompt)).toEqual(['P1', 'P2', 'P3', 'P4', 'P5']);
	});

	it('falls back to empty strings when prompts are not passed', () => {
		const story = assembleStory({ ...base, text, pageUrls: [] });
		expect(story.cover_prompt).toBe('');
		expect(story.pages.every((p) => p.image_prompt === '')).toBe(true);
	});
});
