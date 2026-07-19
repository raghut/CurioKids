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
