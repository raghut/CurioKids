import { describe, it, expect } from 'vitest';
import { buildStoryMessages, buildImagePrompts } from './storyPrompt';
import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';

const rabbit = characters.find((c) => c.id === 'rabbit')!;
const brave = themes.find((t) => t.id === 'be_brave')!;

describe('buildStoryMessages', () => {
	it('asks for a per-page image_prompt in the JSON shape', () => {
		const msgs = buildStoryMessages({ character: rabbit, theme: brave, childName: null, language: 'en' });
		const user = msgs.find((m) => m.role === 'user')!.content;
		expect(user).toContain('image_prompt');
	});
});

describe('buildImagePrompts', () => {
	it('returns cover + one prompt per page, each carrying the locked descriptor', () => {
		const pages = [
			{ image_prompt: 'rabbit hops into woods' },
			{ image_prompt: 'rabbit meets a bird' }
		];
		const prompts = buildImagePrompts(rabbit, 'a sunny meadow', pages);
		expect(prompts).toHaveLength(3); // 1 cover + 2 pages
		for (const p of prompts) {
			expect(p).toContain(rabbit.prompt_descriptor);
		}
		expect(prompts[1]).toContain('rabbit hops into woods');
	});
});
