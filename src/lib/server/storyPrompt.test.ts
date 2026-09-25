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

import { buildAdminStoryMessages, buildAdminCoverPrompt } from './storyPrompt';

describe('buildAdminStoryMessages', () => {
	const peacock = characters.find((c) => c.id === 'peacock')!;
	const beBrave = themes.find((t) => t.id === 'be_brave')!;
	const baseOpts = {
		storyIdea: 'A shy peacock learns to dance.',
		character: peacock,
		customCharacter: null,
		supportingCharacter: 'a wise owl',
		theme: beBrave,
		ageBand: '7-8' as const,
		language: 'en' as const,
		tone: 'funny' as const,
		setting: 'a village festival',
		moralFocus: 'courage grows with practice',
		extra: 'add fireflies'
	};

	it('includes the story idea, theme, tone, setting, supporting char, and moral', () => {
		const msgs = buildAdminStoryMessages(baseOpts);
		const user = msgs.find((m) => m.role === 'user')!.content;
		expect(user).toContain('A shy peacock learns to dance.');
		expect(user).toContain(beBrave.goal_hint);
		expect(user).toContain('funny');
		expect(user).toContain('village festival');
		expect(user).toContain('wise owl');
		expect(user).toContain('courage grows with practice');
	});

	it('names a locked hero and keeps it that animal', () => {
		const user = buildAdminStoryMessages(baseOpts).find((m) => m.role === 'user')!.content;
		expect(user).toContain('Neelu');
		expect(user).toContain('peacock');
	});

	it('uses the custom character text when no locked animal', () => {
		const user = buildAdminStoryMessages({ ...baseOpts, character: null, customCharacter: 'a tiny brave firefly named Chinni' }).find((m) => m.role === 'user')!.content;
		expect(user).toContain('Chinni');
	});

	it('applies the 5-6 sentence rule (max 8 words) vs 7-8 (max 12 words)', () => {
		const young = buildAdminStoryMessages({ ...baseOpts, ageBand: '5-6' }).find((m) => m.role === 'user')!.content;
		const older = buildAdminStoryMessages({ ...baseOpts, ageBand: '7-8' }).find((m) => m.role === 'user')!.content;
		expect(young).toContain('max 8 words');
		expect(older).toContain('max 12 words');
	});

	it('keeps the 5-page / 30-50-word HARD RULES and fences the extra wishes', () => {
		const user = buildAdminStoryMessages(baseOpts).find((m) => m.role === 'user')!.content;
		expect(user).toContain('Exactly 5 pages.');
		expect(user).toContain('30 and 50 words');
		expect(user).toContain('CHILD_WISH');
		expect(user).toContain('add fireflies');
	});
});

describe('buildAdminCoverPrompt', () => {
	it('includes the hero descriptor, scene, and no-text watercolor style', () => {
		const p = buildAdminCoverPrompt('a tiny glowing firefly', 'flying over a pond at dusk');
		expect(p).toContain('a tiny glowing firefly');
		expect(p).toContain('flying over a pond at dusk');
		expect(p).toContain('no text');
	});
});
