import { describe, it, expect } from 'vitest';
import { parseGlossary, MAX_TERMS } from './glossary';

describe('parseGlossary', () => {
	it('reads one term per line', () => {
		expect(parseGlossary('snail = నత్త\nshell = పెంకు')).toEqual([
			{ en: 'snail', te: 'నత్త' },
			{ en: 'shell', te: 'పెంకు' }
		]);
	});

	it('accepts commas, semicolons, colons and dashes as operators type them', () => {
		expect(parseGlossary('bee: తేనెటీగ, honey – తేనె')).toEqual([
			{ en: 'bee', te: 'తేనెటీగ' },
			{ en: 'honey', te: 'తేనె' }
		]);
	});

	it('returns nothing for empty, blank or non-string input', () => {
		expect(parseGlossary('')).toEqual([]);
		expect(parseGlossary('   \n  ')).toEqual([]);
		expect(parseGlossary(undefined)).toEqual([]);
		expect(parseGlossary(42)).toEqual([]);
	});

	// A typo in an optional box must not cost a generation, so junk is dropped silently.
	it('drops lines with no pair instead of failing', () => {
		expect(parseGlossary('snail = నత్త\njust some noise\n\n=\nshell = పెంకు')).toEqual([
			{ en: 'snail', te: 'నత్త' },
			{ en: 'shell', te: 'పెంకు' }
		]);
	});

	// Same hygiene as the brief and a theme's goal_hint: this reaches the model, so the
	// quote and backtick delimiters that could end the surrounding block are stripped.
	it('strips quote and backtick delimiters and collapses whitespace', () => {
		const [t] = parseGlossary('  "snail"  =  `నత్త`  ');
		expect(t).toEqual({ en: 'snail', te: 'నత్త' });
	});

	it('keeps the first spelling of a repeated english word', () => {
		expect(parseGlossary('snail = నత్త\nSnail = తప్పు')).toEqual([{ en: 'snail', te: 'నత్త' }]);
	});

	it(`stops at ${MAX_TERMS} terms`, () => {
		const many = Array.from({ length: MAX_TERMS + 5 }, (_, i) => `word${i} = తెలుగు${i}`).join('\n');
		expect(parseGlossary(many)).toHaveLength(MAX_TERMS);
	});

	it('caps a very long term rather than dropping it', () => {
		const [t] = parseGlossary(`${'a'.repeat(200)} = ${'బ'.repeat(200)}`);
		expect(t.en.length).toBeLessThanOrEqual(40);
		expect(t.te.length).toBeLessThanOrEqual(60);
	});
});
