/**
 * Why & How? list filters. Same contract as filterStories.ts: kept in the URL
 * (session-only, nothing in localStorage) and applied client-side over the loaded list.
 * A new filter is a field here, a param in the codec, and a section in FactFilterSheet.
 */
export type FactFilter = { unreadOnly: boolean };

export const EMPTY_FACT_FILTER: FactFilter = { unreadOnly: false };

export function parseFactFilter(params: URLSearchParams): FactFilter {
	return { unreadOnly: params.get('unread') === '1' };
}

export function factFilterToParams(f: FactFilter): URLSearchParams {
	const p = new URLSearchParams();
	if (f.unreadOnly) p.set('unread', '1');
	return p;
}

export function isFactFilterActive(f: FactFilter): boolean {
	return f.unreadOnly;
}

export function matchesFactFilter(id: string, f: FactFilter, completed: readonly string[]): boolean {
	if (f.unreadOnly && completed.includes(id)) return false;
	return true;
}
