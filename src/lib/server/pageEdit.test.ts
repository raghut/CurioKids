import { describe, it, expect } from 'vitest';
import { validatePageEdit, COVER_INDEX, PAGE_TEXT_MAX, PAGE_PROMPT_MAX } from './pageEdit';

const PAGES = 5;

describe('validatePageEdit', () => {
	it('accepts a text edit on a real page', () => {
		const r = validatePageEdit({ index: 2, action: 'text', text: '  Motu shares.  ' }, PAGES);
		expect(r).toEqual({ ok: true, index: 2, action: 'text', text: 'Motu shares.' });
	});

	it('accepts an image edit on a page and on the cover', () => {
		expect(validatePageEdit({ index: 0, action: 'image', prompt: 'a pond' }, PAGES).ok).toBe(true);
		expect(validatePageEdit({ index: COVER_INDEX, action: 'image', prompt: 'a pond' }, PAGES).ok).toBe(true);
	});

	it('refuses a text edit on the cover, which has no text', () => {
		const r = validatePageEdit({ index: COVER_INDEX, action: 'text', text: 'hi' }, PAGES);
		expect(r.ok).toBe(false);
	});

	it('rejects an out-of-range or non-integer index', () => {
		for (const index of [PAGES, 99, -2, 1.5, 'two', undefined]) {
			expect(validatePageEdit({ index, action: 'image', prompt: 'x' }, PAGES).ok, String(index)).toBe(false);
		}
	});

	it('rejects empty text and empty prompt', () => {
		expect(validatePageEdit({ index: 0, action: 'text', text: '   ' }, PAGES).ok).toBe(false);
		expect(validatePageEdit({ index: 0, action: 'image', prompt: '  ' }, PAGES).ok).toBe(false);
	});

	it('caps the lengths', () => {
		expect(validatePageEdit({ index: 0, action: 'text', text: 'x'.repeat(PAGE_TEXT_MAX + 1) }, PAGES).ok).toBe(false);
		expect(validatePageEdit({ index: 0, action: 'image', prompt: 'x'.repeat(PAGE_PROMPT_MAX + 1) }, PAGES).ok).toBe(false);
	});

	it('rejects an unknown action', () => {
		expect(validatePageEdit({ index: 0, action: 'delete' }, PAGES).ok).toBe(false);
	});
});
