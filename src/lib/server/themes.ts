import { themes as defaults } from '$lib/data/themes';
import { listThemeRows } from '$lib/server/db';
import { mergeThemes } from '$lib/server/themeRules';
import type { Theme, ThemeOption } from '$lib/types';

/**
 * The code defaults with any DB overrides layered on, sorted, archived included.
 *
 * A DB failure is tolerated and logged rather than thrown: the themes table may not
 * exist yet (pre-db:init), and falling back to the bundled set keeps story creation
 * and the gallery working instead of 500-ing. Same stance getPromptOverrides takes.
 */
export async function resolveThemes(): Promise<Theme[]> {
	let rows: Theme[] = [];
	try {
		rows = await listThemeRows();
	} catch (err) {
		console.error('theme rows unavailable, using defaults:', err instanceof Error ? err.message : 'unknown');
	}
	return mergeThemes(defaults, rows);
}

/** What the pickers and the stories filter chips show. */
export async function activeThemes(): Promise<Theme[]> {
	return (await resolveThemes()).filter((t) => !t.archived);
}

/** Strip goal_hint — it is prompt-internal and the client never needs it. */
export function toThemeOptions(list: Theme[]): ThemeOption[] {
	return list.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }));
}
