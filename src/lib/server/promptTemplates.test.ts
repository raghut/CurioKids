import { describe, it, expect } from 'vitest';
import {
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
		expect(ALLOWED_VARS.image_page).toEqual(['hero_descriptor', 'scene']);
		expect(REQUIRED_VARS.story_user).toContain('story_idea');
	});
});

describe('PROMPT_DEFAULTS', () => {
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

	it('asks 2-4 for a whole-story cover and one clear subject per page', () => {
		expect(PROMPT_DEFAULTS['2-4'].story_user).toContain('WHOLE story in one picture');
		expect(PROMPT_DEFAULTS['2-4'].image_page).toContain('uncluttered background');
		expect(PROMPT_DEFAULTS['7-8'].story_user).toContain('OPENING scene');
	});

	it('tells the illustrator not to swap the hero for a person', () => {
		for (const band of BANDS) {
			expect(PROMPT_DEFAULTS[band].image_page).toContain('do not substitute a human child');
		}
	});

	it('requires each page image_prompt to name the creature, not just the name', () => {
		for (const band of BANDS) {
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
