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
			{ text: 'p1', image_url: 'http://blob/p1.jpg' },
			{ text: 'p2', image_url: 'http://blob/p2.jpg' }
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
});
