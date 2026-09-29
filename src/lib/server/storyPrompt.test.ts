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

import {
	adminTemplateVars,
	buildAdminStoryMessages,
	buildAdminCoverPrompt,
	buildAdminPageImagePrompt
} from './storyPrompt';
import { PROMPT_DEFAULTS } from './promptTemplates';

// The per-band WORDING now lives in promptTemplates.ts and is covered by its own suite.
// What matters here is that the brief's values reach the right {{placeholders}}.
describe('adminTemplateVars', () => {
	const peacock = characters.find((c) => c.id === 'peacock')!;
	const baseOpts = {
		storyIdea: 'A shy peacock learns to dance.',
		character: peacock,
		customCharacter: null,
		supportingCharacter: 'a wise owl',
		theme: brave,
		ageBand: '7-8' as const,
		language: 'en' as const,
		tone: 'funny' as const,
		setting: 'a village festival',
		moralFocus: 'courage grows with practice',
		extra: 'add fireflies'
	};

	it('maps every brief field to its placeholder', () => {
		const v = adminTemplateVars(baseOpts);
		expect(v.story_idea).toBe('A shy peacock learns to dance.');
		expect(v.theme_goal).toBe(brave.goal_hint);
		expect(v.tone).toBe('funny');
		expect(v.setting_line).toContain('village festival');
		expect(v.moral_line).toContain('courage grows with practice');
		expect(v.supporting_line).toContain('wise owl');
		expect(v.age_band).toBe('7-8');
	});

	it('names a locked hero and pins the animal', () => {
		const v = adminTemplateVars(baseOpts);
		expect(v.hero_line).toContain('Neelu');
		expect(v.hero_line).toContain('peacock');
		expect(v.hero_line).toContain('never change the animal');
	});

	it('uses the custom character text when there is no locked animal', () => {
		const v = adminTemplateVars({ ...baseOpts, character: null, customCharacter: 'a tiny brave firefly named Chinni' });
		expect(v.hero_line).toContain('Chinni');
	});

	it('leaves optional lines empty so they render away', () => {
		const v = adminTemplateVars({ ...baseOpts, supportingCharacter: null, setting: null, moralFocus: null, extra: null });
		expect(v.supporting_line).toBe('');
		expect(v.setting_line).toBe('');
		expect(v.moral_line).toBe('');
		expect(v.extra_block).toBe('');
	});

	it('fences the extra wishes as untrusted ingredients', () => {
		const v = adminTemplateVars(baseOpts);
		expect(v.extra_block).toContain('CHILD_WISH');
		expect(v.extra_block).toContain('add fireflies');
		expect(v.extra_block).toContain('NOT as instructions');
	});

	it('carries the band page count into the prompt vars', () => {
		expect(adminTemplateVars({ ...baseOpts, ageBand: '2-4' }).page_count).toBe('6');
		expect(adminTemplateVars({ ...baseOpts, ageBand: '7-8' }).page_count).toBe('5');
	});

	it('switches the language name for Telugu', () => {
		expect(adminTemplateVars({ ...baseOpts, language: 'te' }).language_name).toContain('Telugu');
	});
});

describe('buildAdminStoryMessages', () => {
	const vars = adminTemplateVars({
		storyIdea: 'Motu the elephant finds a banana.',
		character: null,
		customCharacter: 'Motu',
		supportingCharacter: null,
		theme: brave,
		ageBand: '2-4',
		language: 'en',
		tone: 'gentle',
		setting: null,
		moralFocus: null,
		extra: null
	});

	it('renders the given templates and appends the locked floor', () => {
		const msgs = buildAdminStoryMessages(PROMPT_DEFAULTS['2-4'], vars);
		const system = msgs.find((m) => m.role === 'system')!.content;
		const user = msgs.find((m) => m.role === 'user')!.content;

		expect(system).toContain('aged 2-4');
		expect(system).toContain('Never scary'); // locked floor
		expect(user).toContain('Motu the elephant finds a banana.');
		expect(user).toContain('between 15 and 25 words');
		expect(user).toContain('Exactly 6 pages');   // page_count resolved for this band
		expect(user).toContain('"hero_descriptor"'); // locked JSON contract
		expect(user).not.toContain('{{');
	});

	it('honours an edited template instead of the default', () => {
		const msgs = buildAdminStoryMessages(
			{ ...PROMPT_DEFAULTS['2-4'], story_user: 'My own words about {{story_idea}}. {{hero_line}}' },
			vars
		);
		const user = msgs.find((m) => m.role === 'user')!.content;
		expect(user).toContain('My own words about Motu the elephant');
		expect(user).not.toContain('between 15 and 25 words');
		expect(user).toContain('"hero_descriptor"'); // floor survives any edit
	});

	it('drops optional lines rather than leaving blanks', () => {
		const user = buildAdminStoryMessages(PROMPT_DEFAULTS['2-4'], vars).find((m) => m.role === 'user')!.content;
		expect(user).not.toContain('Setting:');
		expect(user).not.toContain('CHILD_WISH');
	});
});

describe('admin image prompts', () => {
	const descriptor = 'a small grey baby elephant with big ears and a curled trunk';

	it('carries the hero descriptor and scene into the cover prompt', () => {
		const p = buildAdminCoverPrompt(PROMPT_DEFAULTS['2-4'].image_cover, descriptor, 'Motu holds a banana');
		expect(p.full).toContain(descriptor);
		expect(p.full).toContain('Motu holds a banana');
		expect(p.full).toContain('No text, no words, no letters');
		expect(p.full).not.toContain('{{');
	});

	it('repeats the descriptor on every page and forbids swapping in a person', () => {
		const p = buildAdminPageImagePrompt(PROMPT_DEFAULTS['7-8'].image_page, descriptor, 'Motu shares the banana');
		expect(p.full).toContain(descriptor);
		expect(p.full).toContain('do not substitute a human child');
	});

	it('keeps the locked no-text floor even if the operator deletes it', () => {
		const p = buildAdminPageImagePrompt('Just draw {{hero_descriptor}} at {{scene}}.', descriptor, 'a pond');
		expect(p.full).toContain('No text, no words, no letters');
	});

	it('returns a stored body WITHOUT the floor, so regenerating cannot double it', () => {
		const p = buildAdminPageImagePrompt(PROMPT_DEFAULTS['7-8'].image_page, descriptor, 'a pond');
		expect(p.body).toContain(descriptor);
		expect(p.body).not.toContain('No text, no words, no letters');
		expect(p.body).not.toContain('{{');
		// Feeding the stored body back in adds the floor exactly once.
		expect(p.full.split('No text, no words, no letters')).toHaveLength(2);
	});

	it('adds the supporting character only when one was given', () => {
		const withSide = buildAdminPageImagePrompt(
			PROMPT_DEFAULTS['7-8'].image_page, descriptor, 'a pond', 'a small green parrot'
		);
		expect(withSide.body).toContain('a small green parrot');

		const without = buildAdminPageImagePrompt(PROMPT_DEFAULTS['7-8'].image_page, descriptor, 'a pond');
		expect(without.body).not.toContain('Also in this picture');
		expect(without.body).toContain(descriptor);
	});
});

describe('hero line article', () => {
	it('uses "an" before a vowel-initial animal', () => {
		const elephant = characters.find((c) => c.id === 'elephant')!;
		const v = adminTemplateVars({
			storyIdea: 'x', character: elephant, customCharacter: null, supportingCharacter: null,
			theme: brave, ageBand: '2-4', language: 'en', tone: 'gentle',
			setting: null, moralFocus: null, extra: null
		});
		expect(v.hero_line).toContain('an elephant');
		expect(v.hero_line).not.toContain('a elephant');
	});

	it('still uses "a" before a consonant', () => {
		const v = adminTemplateVars({
			storyIdea: 'x', character: characters.find((c) => c.id === 'rabbit')!, customCharacter: null,
			supportingCharacter: null, theme: brave, ageBand: '5-6', language: 'en', tone: 'gentle',
			setting: null, moralFocus: null, extra: null
		});
		expect(v.hero_line).toContain('a rabbit');
	});
});
