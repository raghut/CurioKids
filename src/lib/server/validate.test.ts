import { describe, it, expect } from 'vitest';
import { validateGenerateRequest } from './validate';
import { MIN_SECTIONS, MAX_SECTIONS } from './factParse';
import { themes } from '$lib/data/themes';

describe('validateGenerateRequest', () => {
	it('accepts valid input and trims child_name', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '  Geeta  ' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character.id).toBe('rabbit');
			expect(r.theme.id).toBe('be_brave');
			expect(r.language).toBe('en');
			expect(r.childName).toBe('Geeta');
		}
	});
	it('rejects unknown character', () => {
		const r = validateGenerateRequest({ character_id: 'dragon', theme_id: 'be_brave', language: 'en' }, themes);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe('invalid_input');
	});
	it('rejects unknown theme', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'nope', language: 'en' }, themes);
		expect(r.ok).toBe(false);
	});
	it('rejects unknown language', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'fr' }, themes);
		expect(r.ok).toBe(false);
	});
	it('treats empty child_name as null', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '   ' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.childName).toBeNull();
	});
	it('defaults extra to null when absent', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra).toBeNull();
	});
	it('sanitizes extra: collapses whitespace and strips quotes', () => {
		const r = validateGenerateRequest({
			character_id: 'rabbit',
			theme_id: 'be_brave',
			language: 'en',
			extra: '  add a "turtle"\nand a  frog  '
		}, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra).toBe('add a turtle and a frog');
	});
	it('caps extra at 200 chars', () => {
		const r = validateGenerateRequest({
			character_id: 'rabbit',
			theme_id: 'be_brave',
			language: 'en',
			extra: 'a'.repeat(500)
		}, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra?.length).toBe(200);
	});
	it('treats blank/non-string extra as null', () => {
		const r1 = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', extra: '   ' }, themes);
		const r2 = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', extra: 42 }, themes);
		if (r1.ok) expect(r1.extra).toBeNull();
		if (r2.ok) expect(r2.extra).toBeNull();
	});
});

import { validateAdminBrief } from './validate';

describe('validateAdminBrief', () => {
	const base = {
		story_idea: 'A shy peacock learns to dance at the festival.',
		character_id: 'peacock',
		theme_id: 'be_brave',
		age_band: '7-8',
		language: 'en'
	};

	it('accepts a full valid brief with a locked animal', () => {
		const r = validateAdminBrief({ ...base, tone: 'funny', setting: 'festival', moral_focus: 'courage', supporting_character: 'a wise owl', extra: 'add fireflies' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character?.id).toBe('peacock');
			expect(r.customCharacter).toBe(null);
			expect(r.ageBand).toBe('7-8');
			expect(r.tone).toBe('funny');
			expect(r.setting).toBe('festival');
			expect(r.moralFocus).toBe('courage');
			expect(r.supportingCharacter).toBe('a wise owl');
			expect(r.extra).toBe('add fireflies');
		}
	});

	it('accepts a custom-character brief (no character_id)', () => {
		const r = validateAdminBrief({ ...base, character_id: undefined, custom_character: 'a tiny brave firefly named Chinni' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character).toBe(null);
			expect(r.customCharacter).toContain('firefly');
		}
	});

	it('defaults tone to gentle when missing/invalid', () => {
		const r = validateAdminBrief({ ...base, tone: 'spicy' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.tone).toBe('gentle');
	});

	it('rejects an empty story idea', () => {
		const r = validateAdminBrief({ ...base, story_idea: '   ' }, themes);
		expect(r.ok).toBe(false);
	});

	it('rejects when neither character nor custom is given', () => {
		const r = validateAdminBrief({ ...base, character_id: undefined }, themes);
		expect(r.ok).toBe(false);
	});

	it('rejects when BOTH character and custom are given', () => {
		const r = validateAdminBrief({ ...base, custom_character: 'a fox' }, themes);
		expect(r.ok).toBe(false);
	});

	it('accepts the 2-4 age band', () => {
		const r = validateAdminBrief({ ...base, age_band: '2-4' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.ageBand).toBe('2-4');
	});

	it('rejects bad theme, age band, and language', () => {
		expect(validateAdminBrief({ ...base, theme_id: 'nope' }, themes).ok).toBe(false);
		expect(validateAdminBrief({ ...base, age_band: '9-10' }, themes).ok).toBe(false);
		expect(validateAdminBrief({ ...base, language: 'fr' }, themes).ok).toBe(false);
	});

	it('sanitizes and caps free-text fields', () => {
		const r = validateAdminBrief({ ...base, moral_focus: '  be `brave`  and "kind"  ' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.moralFocus).toBe('be brave and kind');
	});
});

import { validateFactBrief } from './validate';

describe('validateFactBrief', () => {
	const base = {
		brief: 'why do ants walk in a line',
		topic: 'Ants',
		languages: ['en', 'te'],
		illustration: 'cover_plus',
		section_target: 4
	};

	it('accepts a good brief', () => {
		const r = validateFactBrief(base);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.topic).toBe('Ants');
			expect(r.languages).toEqual(['en', 'te']);
			expect(r.illustration).toBe('cover_plus');
			expect(r.sectionTarget).toBe(4);
		}
	});

	it('rejects a blank brief or topic', () => {
		expect(validateFactBrief({ ...base, brief: '   ' }).ok).toBe(false);
		expect(validateFactBrief({ ...base, topic: '' }).ok).toBe(false);
	});

	it('sanitises the brief like other operator free text', () => {
		const r = validateFactBrief({ ...base, brief: '  why do  "ants"  walk  ' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.brief).toBe('why do ants walk');
	});

	it('rejects an unknown illustration level', () => {
		expect(validateFactBrief({ ...base, illustration: 'all_the_pictures' }).ok).toBe(false);
	});

	it('rejects an unknown language and an empty language list', () => {
		expect(validateFactBrief({ ...base, languages: ['en', 'fr'] }).ok).toBe(false);
		expect(validateFactBrief({ ...base, languages: [] }).ok).toBe(false);
	});

	// The floor is 4, not 1: a shorter fact cannot be built from one question, at least one
	// discovery, one fun_facts and one lesson, and asking for fewer let the model choose its
	// own length — which made the create screen's rupee estimate quote for the wrong fact.
	it(`rejects a section target outside ${MIN_SECTIONS}..${MAX_SECTIONS}`, () => {
		expect(validateFactBrief({ ...base, section_target: 0 }).ok).toBe(false);
		expect(validateFactBrief({ ...base, section_target: MIN_SECTIONS - 1 }).ok).toBe(false);
		expect(validateFactBrief({ ...base, section_target: MAX_SECTIONS + 1 }).ok).toBe(false);
		expect(validateFactBrief({ ...base, section_target: 'four' }).ok).toBe(false);
	});

	it(`accepts the ${MIN_SECTIONS}..${MAX_SECTIONS} ends`, () => {
		expect(validateFactBrief({ ...base, section_target: MIN_SECTIONS }).ok).toBe(true);
		expect(validateFactBrief({ ...base, section_target: MAX_SECTIONS }).ok).toBe(true);
	});

	it('parses the optional Telugu glossary and defaults it to empty', () => {
		const withTerms = validateFactBrief({ ...base, glossary: 'snail = నత్త' });
		expect(withTerms.ok && withTerms.glossary).toEqual([{ en: 'snail', te: 'నత్త' }]);

		const without = validateFactBrief(base);
		expect(without.ok && without.glossary).toEqual([]);
	});

	// The box is optional, so junk in it must never block a generation.
	it('accepts a brief whose glossary is unparseable', () => {
		const r = validateFactBrief({ ...base, glossary: 'no pairs here at all' });
		expect(r.ok).toBe(true);
		expect(r.ok && r.glossary).toEqual([]);
	});

	it('rejects a null body', () => {
		expect(validateFactBrief(null).ok).toBe(false);
	});
});

describe('theme validation against the resolved list', () => {
	it('accepts an active theme', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'sharing', language: 'en' },
			themes
		);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.theme.id).toBe('sharing');
	});

	it('rejects an unknown theme', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'nope', language: 'en' },
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('rejects an ARCHIVED theme — retired themes cannot start new stories', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'help_friend', language: 'en' },
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('rejects an archived theme on the admin brief path too', () => {
		const r = validateAdminBrief(
			{
				story_idea: 'A rabbit shares a carrot.',
				character_id: 'rabbit',
				theme_id: 'help_friend',
				age_band: '5-6',
				language: 'en'
			},
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('accepts an admin-added theme that is not a code default', () => {
		const extended = [
			...themes,
			{
				id: 'kindness',
				label_en: 'Kindness',
				label_te: 'దయ',
				goal_hint: 'being kind to someone small',
				sort_order: 50,
				archived: false
			}
		];
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'kindness', language: 'en' },
			extended
		);
		expect(r.ok).toBe(true);
	});
});
