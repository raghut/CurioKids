import { describe, it, expect } from 'vitest';
import type { Story, StorySummary } from '$lib/types';
import {
	EMPTY_FILTER,
	curatedToFilterable,
	filterToParams,
	generatedToFilterable,
	isFilterActive,
	matchesFilter,
	parseFilter,
	type FilterableStory,
	type StoryFilter
} from './filterStories';

function story(over: Partial<FilterableStory> = {}): FilterableStory {
	return { id: 's1', ageTag: '7-8', themeId: 'sharing', ...over };
}

function filter(over: Partial<StoryFilter> = {}): StoryFilter {
	return { ...EMPTY_FILTER, ...over };
}

describe('matchesFilter — age', () => {
	it('an empty filter matches everything', () => {
		expect(matchesFilter(story(), EMPTY_FILTER, [])).toBe(true);
	});

	it('matches a story whose band equals the chip', () => {
		expect(matchesFilter(story({ ageTag: '7-8' }), filter({ age: '7-8' }), [])).toBe(true);
	});

	it('rejects a story in a different band', () => {
		expect(matchesFilter(story({ ageTag: '2-4' }), filter({ age: '7-8' }), [])).toBe(false);
	});

	it('a legacy 5-8 story matches BOTH the 5-6 and 7-8 chips', () => {
		expect(matchesFilter(story({ ageTag: '5-8' }), filter({ age: '5-6' }), [])).toBe(true);
		expect(matchesFilter(story({ ageTag: '5-8' }), filter({ age: '7-8' }), [])).toBe(true);
	});

	it('a legacy 5-8 story never matches the 2-4 chip', () => {
		expect(matchesFilter(story({ ageTag: '5-8' }), filter({ age: '2-4' }), [])).toBe(false);
	});

	it('an unrecognised age tag matches no chip but survives an empty filter', () => {
		expect(matchesFilter(story({ ageTag: '9-10' }), filter({ age: '7-8' }), [])).toBe(false);
		expect(matchesFilter(story({ ageTag: '9-10' }), EMPTY_FILTER, [])).toBe(true);
	});
});

describe('matchesFilter — theme', () => {
	it('matches an exact theme id', () => {
		expect(matchesFilter(story({ themeId: 'sharing' }), filter({ theme: 'sharing' }), [])).toBe(true);
	});

	it('rejects a different theme', () => {
		expect(matchesFilter(story({ themeId: 'friendship' }), filter({ theme: 'sharing' }), [])).toBe(false);
	});

	// This is what an archived theme looks like from the grid's point of view.
	it('a story with no theme is visible unfiltered and hidden when a chip is lit', () => {
		expect(matchesFilter(story({ themeId: null }), EMPTY_FILTER, [])).toBe(true);
		expect(matchesFilter(story({ themeId: null }), filter({ theme: 'sharing' }), [])).toBe(false);
	});

	it('a story whose theme is not one of the chips behaves the same way', () => {
		expect(matchesFilter(story({ themeId: 'help_friend' }), filter({ theme: 'sharing' }), [])).toBe(false);
		expect(matchesFilter(story({ themeId: 'help_friend' }), EMPTY_FILTER, [])).toBe(true);
	});
});

describe('matchesFilter — not read yet', () => {
	it('excludes a completed story', () => {
		expect(matchesFilter(story({ id: 'done' }), filter({ unreadOnly: true }), ['done'])).toBe(false);
	});

	it('keeps a story absent from the completed list', () => {
		expect(matchesFilter(story({ id: 'fresh' }), filter({ unreadOnly: true }), ['done'])).toBe(true);
	});

	it('ignores the completed list when the toggle is off', () => {
		expect(matchesFilter(story({ id: 'done' }), EMPTY_FILTER, ['done'])).toBe(true);
	});
});

describe('matchesFilter — combined', () => {
	it('requires every active dimension to match', () => {
		const f = filter({ age: '7-8', theme: 'sharing', unreadOnly: true });
		expect(matchesFilter(story({ ageTag: '7-8', themeId: 'sharing', id: 'a' }), f, [])).toBe(true);
		// each single mismatch is enough to exclude
		expect(matchesFilter(story({ ageTag: '2-4', themeId: 'sharing', id: 'a' }), f, [])).toBe(false);
		expect(matchesFilter(story({ ageTag: '7-8', themeId: 'friendship', id: 'a' }), f, [])).toBe(false);
		expect(matchesFilter(story({ ageTag: '7-8', themeId: 'sharing', id: 'a' }), f, ['a'])).toBe(false);
	});
});

describe('adapters', () => {
	it('maps a generated summary', () => {
		const s: StorySummary = {
			id: 'g1',
			title: 'T',
			cover_url: 'https://x/y.jpg',
			age_tag: '5-6',
			language: 'en',
			created_at: '2026-10-01T00:00:00.000Z',
			theme_id: 'friendship'
		};
		expect(generatedToFilterable(s)).toEqual({ id: 'g1', ageTag: '5-6', themeId: 'friendship' });
	});

	it('maps a generated summary with a null theme', () => {
		const s: StorySummary = {
			id: 'g2',
			title: 'T',
			cover_url: '',
			age_tag: '5-8',
			language: 'en',
			created_at: '2026-10-01T00:00:00.000Z',
			theme_id: null
		};
		expect(generatedToFilterable(s).themeId).toBeNull();
	});

	it('maps a curated story, taking age from age_range and theme from theme', () => {
		const s = {
			id: 'c1',
			type: 'story',
			source: 'curated',
			language: 'en',
			age_range: '5-8',
			theme: 'be_brave',
			title: 'T',
			cover_image: '/images/x.png',
			audio: '/audio/x.mp3',
			pages: [],
			moral: 'm',
			reflection_question: 'q'
		} as Story;
		expect(curatedToFilterable(s)).toEqual({ id: 'c1', ageTag: '5-8', themeId: 'be_brave' });
	});

	it('maps a curated story with a free-text theme to that string, which matches no chip', () => {
		const s = { id: 'c2', age_range: '5-8', theme: 'friendship forever' } as Story;
		expect(curatedToFilterable(s).themeId).toBe('friendship forever');
	});

	it('maps a curated story with no theme to null', () => {
		const s = { id: 'c3', age_range: '5-8' } as unknown as Story;
		expect(curatedToFilterable(s).themeId).toBeNull();
	});
});

describe('isFilterActive', () => {
	it('is false only for the empty filter', () => {
		expect(isFilterActive(EMPTY_FILTER)).toBe(false);
		expect(isFilterActive(filter({ age: '7-8' }))).toBe(true);
		expect(isFilterActive(filter({ theme: 'sharing' }))).toBe(true);
		expect(isFilterActive(filter({ unreadOnly: true }))).toBe(true);
	});
});

describe('URL codec', () => {
	it('reads all three params', () => {
		const f = parseFilter(new URLSearchParams('age=7-8&theme=sharing&unread=1'));
		expect(f).toEqual({ age: '7-8', theme: 'sharing', unreadOnly: true });
	});

	it('drops an unknown age band', () => {
		expect(parseFilter(new URLSearchParams('age=9-10')).age).toBeNull();
	});

	it('treats any unread value other than 1 as off', () => {
		expect(parseFilter(new URLSearchParams('unread=yes')).unreadOnly).toBe(false);
		expect(parseFilter(new URLSearchParams('unread=0')).unreadOnly).toBe(false);
	});

	// Theme ids are operator-managed data, not an enum, so this module cannot
	// validate them — an unknown one simply matches nothing.
	it('keeps an arbitrary theme string', () => {
		expect(parseFilter(new URLSearchParams('theme=whatever')).theme).toBe('whatever');
	});

	it('an empty query string is the empty filter', () => {
		expect(parseFilter(new URLSearchParams(''))).toEqual(EMPTY_FILTER);
	});

	it('the empty filter serialises to an empty query string', () => {
		expect(filterToParams(EMPTY_FILTER).toString()).toBe('');
	});

	it('omits the dimensions that are not set', () => {
		expect(filterToParams(filter({ age: '7-8' })).toString()).toBe('age=7-8');
		expect(filterToParams(filter({ unreadOnly: true })).toString()).toBe('unread=1');
	});

	it('round-trips every filter', () => {
		const cases: StoryFilter[] = [
			EMPTY_FILTER,
			filter({ age: '2-4' }),
			filter({ theme: 'good_habits' }),
			filter({ unreadOnly: true }),
			filter({ age: '5-6', theme: 'sharing', unreadOnly: true })
		];
		for (const f of cases) {
			expect(parseFilter(filterToParams(f))).toEqual(f);
		}
	});
});
