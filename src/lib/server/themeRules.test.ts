import { describe, it, expect } from 'vitest';
import type { Theme } from '$lib/types';
import {
	mergeThemes,
	findTheme,
	slugifyThemeId,
	sanitizeGoalHint,
	validateThemeInput,
	decideDelete,
	GOAL_HINT_MAX
} from './themeRules';

function theme(over: Partial<Theme> = {}): Theme {
	return {
		id: 'sharing',
		label_en: 'Sharing',
		label_te: 'పంచుకోవడం',
		goal_hint: 'sharing something precious',
		sort_order: 10,
		archived: false,
		...over
	};
}

describe('mergeThemes', () => {
	it('leaves a default untouched when there is no row', () => {
		const out = mergeThemes([theme()], []);
		expect(out).toHaveLength(1);
		expect(out[0].label_en).toBe('Sharing');
	});

	it('lets a row override a default field by field', () => {
		const out = mergeThemes(
			[theme()],
			[theme({ label_en: 'Sharing Nicely', goal_hint: 'giving a turn to a friend' })]
		);
		expect(out).toHaveLength(1);
		expect(out[0].label_en).toBe('Sharing Nicely');
		expect(out[0].goal_hint).toBe('giving a turn to a friend');
	});

	it('appends a row whose id has no default', () => {
		const out = mergeThemes([theme()], [theme({ id: 'kindness', label_en: 'Kindness', sort_order: 50 })]);
		expect(out.map((t) => t.id)).toEqual(['sharing', 'kindness']);
	});

	it('lets a row flip a default archived in both directions', () => {
		const retired = mergeThemes([theme()], [theme({ archived: true })]);
		expect(retired[0].archived).toBe(true);

		const revived = mergeThemes([theme({ archived: true })], [theme({ archived: false })]);
		expect(revived[0].archived).toBe(false);
	});

	it('sorts by sort_order then label_en', () => {
		const out = mergeThemes(
			[
				theme({ id: 'c', label_en: 'Cherry', sort_order: 20 }),
				theme({ id: 'b', label_en: 'Banana', sort_order: 10 }),
				theme({ id: 'a', label_en: 'Apple', sort_order: 10 })
			],
			[]
		);
		expect(out.map((t) => t.id)).toEqual(['a', 'b', 'c']);
	});
});

describe('findTheme', () => {
	const all = [theme(), theme({ id: 'help_friend', archived: true })];

	it('finds an active theme', () => {
		expect(findTheme('sharing', all)?.id).toBe('sharing');
	});

	it('finds an archived theme, so old stories still resolve', () => {
		expect(findTheme('help_friend', all)?.id).toBe('help_friend');
	});

	it('returns undefined for an unknown id', () => {
		expect(findTheme('nope', all)).toBeUndefined();
	});
});

describe('slugifyThemeId', () => {
	it('lowercases and underscores spaces', () => {
		expect(slugifyThemeId('Good Habits')).toBe('good_habits');
	});

	it('collapses punctuation and repeated separators', () => {
		expect(slugifyThemeId('Be  Kind!! & Brave')).toBe('be_kind_brave');
	});

	it('trims leading and trailing separators', () => {
		expect(slugifyThemeId('  ...Sharing...  ')).toBe('sharing');
	});

	it('returns empty string when nothing survives', () => {
		expect(slugifyThemeId('!!!')).toBe('');
	});
});

describe('sanitizeGoalHint', () => {
	it('collapses whitespace and trims', () => {
		expect(sanitizeGoalHint('  sharing   a   toy  ')).toBe('sharing a toy');
	});

	it('strips quote and backtick delimiters', () => {
		expect(sanitizeGoalHint('sharing a "toy" and a `ball`')).toBe('sharing a toy and a ball');
	});

	it('caps length', () => {
		expect(sanitizeGoalHint('x'.repeat(500))).toHaveLength(GOAL_HINT_MAX);
	});

	it('returns empty string for a non-string', () => {
		expect(sanitizeGoalHint(42)).toBe('');
	});
});

describe('validateThemeInput', () => {
	const base = {
		id: 'kindness',
		label_en: 'Kindness',
		label_te: 'దయ',
		goal_hint: 'being kind to someone small',
		sort_order: '50',
		archived: false
	};

	it('accepts a good theme and sanitises the goal hint', () => {
		const r = validateThemeInput({ ...base, goal_hint: '  being  "kind"  ' }, []);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.theme.id).toBe('kindness');
			expect(r.theme.goal_hint).toBe('being kind');
			expect(r.theme.sort_order).toBe(50);
		}
	});

	it('rejects a blank English label', () => {
		expect(validateThemeInput({ ...base, label_en: '   ' }, []).ok).toBe(false);
	});

	it('rejects a missing Telugu label', () => {
		expect(validateThemeInput({ ...base, label_te: '' }, []).ok).toBe(false);
	});

	it('rejects a blank goal hint', () => {
		expect(validateThemeInput({ ...base, goal_hint: '  ' }, []).ok).toBe(false);
	});

	it('rejects an id that collides', () => {
		const r = validateThemeInput(base, ['kindness']);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/already/i);
	});

	it('rejects a collision with an archived id, which would adopt its old stories', () => {
		expect(validateThemeInput({ ...base, id: 'help_friend' }, ['help_friend']).ok).toBe(false);
	});

	it('rejects an id that slugs to nothing', () => {
		expect(validateThemeInput({ ...base, id: '!!!' }, []).ok).toBe(false);
	});

	it('rejects a non-integer sort order', () => {
		expect(validateThemeInput({ ...base, sort_order: 'abc' }, []).ok).toBe(false);
		expect(validateThemeInput({ ...base, sort_order: '1.5' }, []).ok).toBe(false);
	});

	// Number('') and Number(null) are 0, Number(true) is 1, and Number.isInteger
	// accepts all three — so without an explicit guard a cleared sort field would
	// silently become 0 and reorder the picker with no error shown.
	it.each([
		['an empty string', ''],
		['whitespace only', '   '],
		['null', null],
		['undefined', undefined],
		['true', true],
		['false', false]
	])('rejects a sort order of %s rather than coercing it', (_label, value) => {
		expect(validateThemeInput({ ...base, sort_order: value }, []).ok).toBe(false);
	});

	it('accepts a negative sort order, so a theme can be pinned ahead of the defaults', () => {
		const r = validateThemeInput({ ...base, sort_order: '-5' }, []);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.theme.sort_order).toBe(-5);
	});

	it('defaults archived to false when absent', () => {
		const r = validateThemeInput({ ...base, archived: undefined }, []);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.theme.archived).toBe(false);
	});
});

describe('decideDelete', () => {
	it('resets a code-default theme regardless of story count', () => {
		expect(decideDelete(true, 0)).toBe('reset');
		expect(decideDelete(true, 99)).toBe('reset');
	});

	it('hard-deletes an admin-added theme with no stories', () => {
		expect(decideDelete(false, 0)).toBe('hard_delete');
	});

	it('refuses to delete an admin-added theme that stories reference', () => {
		expect(decideDelete(false, 1)).toBe('refuse');
	});
});
