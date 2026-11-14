import { describe, it, expect } from 'vitest';
import {
	EMPTY_FACT_FILTER,
	factFilterToParams,
	isFactFilterActive,
	matchesFactFilter,
	parseFactFilter
} from './filterFacts';

describe('fact filters', () => {
	it('round-trips through the URL and stays empty by default', () => {
		expect(parseFactFilter(new URLSearchParams(''))).toEqual(EMPTY_FACT_FILTER);
		expect(factFilterToParams(EMPTY_FACT_FILTER).toString()).toBe('');
		const on = parseFactFilter(new URLSearchParams('unread=1'));
		expect(on.unreadOnly).toBe(true);
		expect(factFilterToParams(on).toString()).toBe('unread=1');
		expect(parseFactFilter(new URLSearchParams('unread=yes')).unreadOnly).toBe(false);
	});

	it('hides finished facts only when Not read yet is on', () => {
		const done = ['fact-ants'];
		expect(matchesFactFilter('fact-ants', EMPTY_FACT_FILTER, done)).toBe(true);
		expect(matchesFactFilter('fact-ants', { unreadOnly: true }, done)).toBe(false);
		expect(matchesFactFilter('fact-bees', { unreadOnly: true }, done)).toBe(true);
		expect(isFactFilterActive({ unreadOnly: true })).toBe(true);
		expect(isFactFilterActive(EMPTY_FACT_FILTER)).toBe(false);
	});
});
