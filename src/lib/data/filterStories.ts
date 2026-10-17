import type { AgeBand, Story, StorySummary, ThemeId } from '$lib/types';

/** The chips the child sees. These are the admin age bands, verbatim. */
export const AGE_BANDS: AgeBand[] = ['2-4', '5-6', '7-8'];

/**
 * The age_tag carried by every kid-generated story (the assembleStory default and
 * the DB column default) and by every curated story (whose age_range is locked to
 * '5-8'). It spans the two older bands, so it matches both of their chips.
 */
const LEGACY_SPAN = '5-8';

export type StoryFilter = {
	age: AgeBand | null;
	theme: ThemeId | null;
	unreadOnly: boolean;
};

export const EMPTY_FILTER: StoryFilter = { age: null, theme: null, unreadOnly: false };

/** The shape curated and generated stories normalise to, so one predicate serves both. */
export type FilterableStory = {
	id: string;
	/** '2-4' | '5-6' | '7-8' | '5-8' | anything else a row happens to hold. */
	ageTag: string;
	themeId: string | null;
};

export function generatedToFilterable(s: StorySummary): FilterableStory {
	return { id: s.id, ageTag: s.age_tag, themeId: s.theme_id ?? null };
}

export function curatedToFilterable(s: Story): FilterableStory {
	// age_range is locked to '5-8', so curated stories span the two older bands.
	// `theme` is a free string by schema; it only reaches a chip when the author set
	// it to an active theme id (a documented convention, not a constraint).
	return { id: s.id, ageTag: s.age_range, themeId: s.theme ?? null };
}

export function isFilterActive(f: StoryFilter): boolean {
	return f.age !== null || f.theme !== null || f.unreadOnly;
}

function matchesAge(ageTag: string, age: AgeBand | null): boolean {
	if (age === null) return true;
	if (ageTag === age) return true;
	return ageTag === LEGACY_SPAN && (age === '5-6' || age === '7-8');
}

/** The three dimensions combine with AND. */
export function matchesFilter(
	s: FilterableStory,
	f: StoryFilter,
	completedIds: string[]
): boolean {
	if (!matchesAge(s.ageTag, f.age)) return false;
	if (f.theme !== null && s.themeId !== f.theme) return false;
	if (f.unreadOnly && completedIds.includes(s.id)) return false;
	return true;
}

/**
 * URL -> filter. An unknown `age` or `unread` value is dropped, so a mistyped URL
 * degrades to "show everything" rather than an empty grid.
 *
 * `theme` is deliberately NOT validated here: theme ids are operator-managed data,
 * not a compile-time enum, and this module stays pure with no list to check against.
 * An unknown theme id matches no story, which the nothing-matched state handles.
 */
export function parseFilter(params: URLSearchParams): StoryFilter {
	const age = params.get('age');
	const theme = params.get('theme');
	return {
		age: AGE_BANDS.includes(age as AgeBand) ? (age as AgeBand) : null,
		theme: theme ? theme : null,
		unreadOnly: params.get('unread') === '1'
	};
}

/** filter -> URL. Omits nulls and false, so a cleared filter is an empty query string. */
export function filterToParams(f: StoryFilter): URLSearchParams {
	const params = new URLSearchParams();
	if (f.age) params.set('age', f.age);
	if (f.theme) params.set('theme', f.theme);
	if (f.unreadOnly) params.set('unread', '1');
	return params;
}
