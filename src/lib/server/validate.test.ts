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
});
