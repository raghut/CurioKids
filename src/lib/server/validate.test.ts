import { describe, it, expect } from 'vitest';
import { validateGenerateRequest } from './validate';

describe('validateGenerateRequest', () => {
	it('accepts valid input and trims child_name', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '  Geeta  ' });
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character.id).toBe('rabbit');
			expect(r.theme.id).toBe('be_brave');
			expect(r.language).toBe('en');
			expect(r.childName).toBe('Geeta');
		}
	});
	it('rejects unknown character', () => {
		const r = validateGenerateRequest({ character_id: 'dragon', theme_id: 'be_brave', language: 'en' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe('invalid_input');
	});
	it('rejects unknown theme', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'nope', language: 'en' });
		expect(r.ok).toBe(false);
	});
	it('rejects unknown language', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'fr' });
		expect(r.ok).toBe(false);
	});
	it('treats empty child_name as null', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '   ' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.childName).toBeNull();
	});
	it('defaults extra to null when absent', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra).toBeNull();
	});
	it('sanitizes extra: collapses whitespace and strips quotes', () => {
		const r = validateGenerateRequest({
			character_id: 'rabbit',
			theme_id: 'be_brave',
			language: 'en',
			extra: '  add a "turtle"\nand a  frog  '
		});
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra).toBe('add a turtle and a frog');
	});
	it('caps extra at 200 chars', () => {
		const r = validateGenerateRequest({
			character_id: 'rabbit',
			theme_id: 'be_brave',
			language: 'en',
			extra: 'a'.repeat(500)
		});
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.extra?.length).toBe(200);
	});
	it('treats blank/non-string extra as null', () => {
		const r1 = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', extra: '   ' });
		const r2 = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', extra: 42 });
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
		const r = validateAdminBrief({ ...base, tone: 'funny', setting: 'festival', moral_focus: 'courage', supporting_character: 'a wise owl', extra: 'add fireflies' });
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
		const r = validateAdminBrief({ ...base, character_id: undefined, custom_character: 'a tiny brave firefly named Chinni' });
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character).toBe(null);
			expect(r.customCharacter).toContain('firefly');
		}
	});

	it('defaults tone to gentle when missing/invalid', () => {
		const r = validateAdminBrief({ ...base, tone: 'spicy' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.tone).toBe('gentle');
	});

	it('rejects an empty story idea', () => {
		const r = validateAdminBrief({ ...base, story_idea: '   ' });
		expect(r.ok).toBe(false);
	});

	it('rejects when neither character nor custom is given', () => {
		const r = validateAdminBrief({ ...base, character_id: undefined });
		expect(r.ok).toBe(false);
	});

	it('rejects when BOTH character and custom are given', () => {
		const r = validateAdminBrief({ ...base, custom_character: 'a fox' });
		expect(r.ok).toBe(false);
	});

	it('accepts the 2-4 age band', () => {
		const r = validateAdminBrief({ ...base, age_band: '2-4' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.ageBand).toBe('2-4');
	});

	it('rejects bad theme, age band, and language', () => {
		expect(validateAdminBrief({ ...base, theme_id: 'nope' }).ok).toBe(false);
		expect(validateAdminBrief({ ...base, age_band: '9-10' }).ok).toBe(false);
		expect(validateAdminBrief({ ...base, language: 'fr' }).ok).toBe(false);
	});

	it('sanitizes and caps free-text fields', () => {
		const r = validateAdminBrief({ ...base, moral_focus: '  be `brave`  and "kind"  ' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.moralFocus).toBe('be brave and kind');
	});
});
