import { describe, it, expect } from 'vitest';
import type { Theme } from '$lib/types';
import { validateRetag } from './retag';

const themes: Theme[] = [
	{
		id: 'sharing',
		label_en: 'Sharing',
		label_te: 'పంచుకోవడం',
		goal_hint: 'sharing something precious',
		sort_order: 10,
		archived: false
	},
	{
		id: 'help_friend',
		label_en: 'Help a Friend',
		label_te: 'స్నేహితుడికి సహాయం',
		goal_hint: 'helping someone in trouble',
		sort_order: 900,
		archived: true
	}
];

describe('validateRetag', () => {
	it('accepts an active theme and a real age band', () => {
		const r = validateRetag({ theme_id: 'sharing', age_tag: '5-6' }, themes);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.themeId).toBe('sharing');
			expect(r.ageTag).toBe('5-6');
		}
	});

	it('accepts every age band', () => {
		for (const band of ['2-4', '5-6', '7-8']) {
			expect(validateRetag({ theme_id: 'sharing', age_tag: band }, themes).ok).toBe(true);
		}
	});

	it('rejects an unknown theme', () => {
		const r = validateRetag({ theme_id: 'nope', age_tag: '5-6' }, themes);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/theme/i);
	});

	// Re-tagging exists to move stories OFF retired themes, so it must not move one on.
	it('rejects an archived theme', () => {
		expect(validateRetag({ theme_id: 'help_friend', age_tag: '5-6' }, themes).ok).toBe(false);
	});

	it('rejects the legacy 5-8 value, which is not a real band', () => {
		const r = validateRetag({ theme_id: 'sharing', age_tag: '5-8' }, themes);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/age/i);
	});

	it('rejects a missing or non-string theme', () => {
		expect(validateRetag({ age_tag: '5-6' }, themes).ok).toBe(false);
		expect(validateRetag({ theme_id: 42, age_tag: '5-6' }, themes).ok).toBe(false);
	});

	it('rejects a missing or unknown age tag', () => {
		expect(validateRetag({ theme_id: 'sharing' }, themes).ok).toBe(false);
		expect(validateRetag({ theme_id: 'sharing', age_tag: '9-10' }, themes).ok).toBe(false);
	});

	it('rejects a null or non-object body', () => {
		expect(validateRetag(null, themes).ok).toBe(false);
		expect(validateRetag('nope', themes).ok).toBe(false);
	});

	it('rejects everything when no themes are active', () => {
		const allArchived = themes.map((t) => ({ ...t, archived: true }));
		expect(validateRetag({ theme_id: 'sharing', age_tag: '5-6' }, allArchived).ok).toBe(false);
	});
});
