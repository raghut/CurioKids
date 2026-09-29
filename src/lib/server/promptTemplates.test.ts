import { describe, it, expect } from 'vitest';
import {
	PAGES_PER_BAND,
	PROMPT_DEFAULTS,
	PROMPT_KINDS,
	ALLOWED_VARS,
	REQUIRED_VARS,
	renderTemplate,
	renderWithFloor,
	validateTemplate,
	resolveTemplates,
	TEMPLATE_MAX_CHARS
} from './promptTemplates';
import type { AgeBand } from '$lib/types';

const BANDS: AgeBand[] = ['2-4', '5-6', '7-8'];

describe('renderTemplate', () => {
	it('substitutes placeholders, with or without inner spaces', () => {
		expect(renderTemplate('Hi {{name}} and {{ other }}.', { name: 'A', other: 'B' })).toBe('Hi A and B.');
	});

	it('drops a line that held a placeholder and rendered empty', () => {
		const out = renderTemplate('Keep me\n{{setting_line}}\nKeep me too', { setting_line: '' });
		expect(out).toBe('Keep me\nKeep me too');
	});

	it('drops the WHOLE line when an optional value is empty, fragment and all', () => {
		// Otherwise an absent supporting character leaves "Also in this picture: ."
		const out = renderTemplate('Hero: {{a}}.\nAlso in shot: {{b}}.\nScene: {{c}}.', {
			a: 'an elephant', b: '', c: 'a pond'
		});
		expect(out).toBe('Hero: an elephant.\nScene: a pond.');
	});

	it('keeps intentional blank lines that held no placeholder', () => {
		expect(renderTemplate('a\n\nb', {})).toBe('a\n\nb');
	});

	it('leaves no placeholder syntax behind, even for missing vars', () => {
		expect(renderTemplate('x {{nope}} y', {})).not.toContain('{{');
	});

	it('handles a multi-line value', () => {
		expect(renderTemplate('before\n{{block}}\nafter', { block: 'one\ntwo' })).toBe('before\none\ntwo\nafter');
	});
});

describe('renderWithFloor', () => {
	it('always appends the locked safety floor to a story prompt', () => {
		const out = renderWithFloor('story_system', 'Anything goes here.', { language_name: 'Telugu' });
		expect(out).toContain('Anything goes here.');
		expect(out).toContain('Never scary, never violent');
		expect(out).toContain('Telugu');
	});

	it('appends the JSON contract and hero_descriptor field to story instructions', () => {
		const out = renderWithFloor('story_user', 'Write a story about {{story_idea}}. {{hero_line}}', {
			story_idea: 'a banana', hero_line: 'HERO: an elephant.', language_name: 'English'
		});
		expect(out).toContain('"hero_descriptor"');
		expect(out).toContain('Return ONLY this JSON shape');
		expect(out).toContain("Do not invent a real child's name");
	});

	it('joins an image prompt as one paragraph and keeps the no-text rule', () => {
		const out = renderWithFloor('image_page', 'Draw {{hero_descriptor}} doing {{scene}}.', {
			hero_descriptor: 'a baby elephant', scene: 'sharing a banana'
		});
		expect(out).not.toContain('\n');
		expect(out).toContain('No text, no words, no letters');
	});
});

describe('validateTemplate', () => {
	it('accepts every shipped default', () => {
		for (const band of BANDS) {
			for (const kind of PROMPT_KINDS) {
				const r = validateTemplate(kind, PROMPT_DEFAULTS[band][kind]);
				expect(r, `${band}/${kind}: ${r.ok ? '' : r.message}`).toEqual({ ok: true });
			}
		}
	});

	it('rejects an empty template', () => {
		expect(validateTemplate('image_page', '   ').ok).toBe(false);
	});

	it('rejects an unknown placeholder and names the allowed ones', () => {
		const r = validateTemplate('image_page', 'Draw {{hero_descriptor}} at {{scene}} in {{weather}}.');
		expect(r.ok).toBe(false);
		if (!r.ok) {
			expect(r.message).toContain('{{weather}}');
			expect(r.message).toContain('{{hero_descriptor}}');
		}
	});

	it('refuses to drop {{hero_descriptor}} from an image template', () => {
		// This is the elephant-turns-into-a-kid bug; the guard exists to make it unrepeatable.
		for (const kind of ['image_cover', 'image_page'] as const) {
			const r = validateTemplate(kind, 'Draw a nice picture of {{scene}}.');
			expect(r.ok).toBe(false);
			if (!r.ok) expect(r.message).toContain('{{hero_descriptor}}');
		}
	});

	it('refuses to drop the required story placeholders', () => {
		expect(validateTemplate('story_user', 'Write anything you like.').ok).toBe(false);
	});

	it('rejects an over-long template', () => {
		const long = 'x'.repeat(TEMPLATE_MAX_CHARS + 1) + ' {{hero_descriptor}} {{scene}}';
		expect(validateTemplate('image_page', long).ok).toBe(false);
	});

	it('allows only the documented vars per kind', () => {
		expect(ALLOWED_VARS.image_page).toEqual(['hero_descriptor', 'supporting_descriptor', 'scene']);
		expect(REQUIRED_VARS.story_user).toContain('story_idea');
	});

	it('allows the supporting descriptor without requiring it', () => {
		// A story may have no side character, so the placeholder must stay optional.
		for (const kind of ['image_cover', 'image_page'] as const) {
			expect(ALLOWED_VARS[kind]).toContain('supporting_descriptor');
			expect(REQUIRED_VARS[kind]).not.toContain('supporting_descriptor');
			expect(validateTemplate(kind, 'Draw {{hero_descriptor}} at {{scene}}.').ok).toBe(true);
		}
	});
});

describe('PROMPT_DEFAULTS', () => {
	const buildLine = (supporting: string) =>
		renderWithFloor('image_page', PROMPT_DEFAULTS['2-4'].image_page, {
			hero_descriptor: 'a baby elephant',
			supporting_descriptor: supporting,
			scene: 'beside the pond'
		});

	it('gives each band its own page lengths', () => {
		expect(PROMPT_DEFAULTS['2-4'].story_user).toContain('between 15 and 25 words');
		expect(PROMPT_DEFAULTS['5-6'].story_user).toContain('between 30 and 50 words');
		expect(PROMPT_DEFAULTS['7-8'].story_user).toContain('between 30 and 50 words');
		expect(PROMPT_DEFAULTS['2-4'].story_user).toContain('max 6 words');
		expect(PROMPT_DEFAULTS['5-6'].story_user).toContain('max 8 words');
		expect(PROMPT_DEFAULTS['7-8'].story_user).toContain('max 12 words');
	});

	it('names the band in each system message', () => {
		for (const band of BANDS) expect(PROMPT_DEFAULTS[band].story_system).toContain(`aged ${band}`);
	});

	it('asks 2-4 for a whole-story cover and one clear action per page', () => {
		expect(PROMPT_DEFAULTS['2-4'].story_user).toContain('central idea of the whole story');
		expect(PROMPT_DEFAULTS['2-4'].image_page).toContain('uncluttered background');
		expect(PROMPT_DEFAULTS['7-8'].story_user).toContain('OPENING scene');
	});

	it('gives 2-4 six pages and the others five', () => {
		expect(PAGES_PER_BAND).toEqual({ '2-4': 6, '5-6': 5, '7-8': 5 });
		// The count reaches the prompt through {{page_count}}, not a hardcoded number.
		for (const band of BANDS) expect(PROMPT_DEFAULTS[band].story_user).toContain('Exactly {{page_count}} pages');
	});

	it('tells 2-4 to name the hero but re-describe every other character', () => {
		const t = PROMPT_DEFAULTS['2-4'].story_user;
		expect(t).toContain('does NOT re-describe it');
		expect(t).toContain('fully re-describe every OTHER character');
		expect(t).toContain('remembers nothing');
	});

	it('keeps the 2-4 character-presence and one-moment rules', () => {
		const t = PROMPT_DEFAULTS['2-4'].story_user;
		expect(t).toContain('names EVERY character taking part');
		expect(t).toContain('never drop one');
		expect(t).toContain('shows exactly ONE moment');
	});

	it('carries the supporting character only when there is one', () => {
		const withSide = buildLine('a small green parrot with a red beak');
		expect(withSide).toContain('a small green parrot with a red beak');

		const without = buildLine('');
		expect(without).not.toContain('Also in this picture');
		expect(without).toContain('a baby elephant'); // the hero line survives
	});

	it('no longer asks 2-4 for a single subject, which excluded the side character', () => {
		expect(PROMPT_DEFAULTS['2-4'].image_page).not.toContain('one clear simple subject');
		expect(PROMPT_DEFAULTS['2-4'].image_page).toContain('One clear simple action');
	});

	it('tells the illustrator not to swap the hero for a person', () => {
		for (const band of BANDS) {
			expect(PROMPT_DEFAULTS[band].image_page).toContain('do not substitute a human child');
		}
	});

	it('requires 5-6 and 7-8 image prompts to name the creature, not just the name', () => {
		// 2-4 states this differently: it names the hero and re-describes everyone else.
		for (const band of ['5-6', '7-8'] as const) {
			expect(PROMPT_DEFAULTS[band].story_user).toContain('Always name what kind of creature');
		}
	});
});

describe('resolveTemplates', () => {
	it('returns defaults when there are no overrides', () => {
		expect(resolveTemplates('5-6')).toEqual(PROMPT_DEFAULTS['5-6']);
	});

	it('layers an override over just that one kind', () => {
		const r = resolveTemplates('7-8', { image_page: 'mine {{hero_descriptor}} {{scene}}' });
		expect(r.image_page).toBe('mine {{hero_descriptor}} {{scene}}');
		expect(r.story_user).toBe(PROMPT_DEFAULTS['7-8'].story_user);
	});
});
