import type { Theme } from '$lib/types';

/** goal_hint reaches the model, so it is capped like every other operator free-text field. */
export const GOAL_HINT_MAX = 120;
export const LABEL_MAX = 40;

/**
 * Above this many ACTIVE themes the kid /create screen's "Make my story" button
 * falls below the fold. A warning in the admin UI, not a hard cap.
 */
export const SOFT_ACTIVE_LIMIT = 6;

/**
 * Layer DB override rows over the code defaults. A row with a matching id replaces
 * that theme wholesale; a row with a new id is an addition; a default with no row
 * stands as-is. Sorted by sort_order, then label_en.
 *
 * If `rows` somehow contains duplicate ids the later one wins. The themes table's
 * primary key makes that impossible in practice, but this module is deliberately
 * decoupled from the DB, so the contract is stated rather than assumed.
 */
export function mergeThemes(defaults: Theme[], rows: Theme[]): Theme[] {
	const byId = new Map<string, Theme>();
	for (const d of defaults) byId.set(d.id, d);
	for (const r of rows) byId.set(r.id, r);
	return [...byId.values()].sort(
		(a, b) => a.sort_order - b.sort_order || a.label_en.localeCompare(b.label_en)
	);
}

/**
 * Look up across the FULL resolved list, archived included. Archived themes must
 * still resolve or an old story loses its label.
 */
export function findTheme(id: string, all: Theme[]): Theme | undefined {
	return all.find((t) => t.id === id);
}

/**
 * "Good Habits" -> "good_habits". Returns "" when nothing usable survives.
 *
 * Takes any raw text, not just a label: the admin form's id field may be left blank
 * (and filled from the English label) or typed by hand, so validateThemeInput slugs
 * whatever arrives. Idempotent on an already-slugged id.
 */
export function slugifyThemeId(raw: string): string {
	return String(raw ?? '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_+|_+$/g, '');
}

/**
 * Same treatment sanitizeExtra gives the child's free text: strip quote/backtick
 * delimiters, collapse whitespace, trim, cap. This text reaches the model, and the
 * LOCKED_FLOOR in promptTemplates.ts is what keeps the guardrails intact regardless.
 */
export function sanitizeGoalHint(raw: unknown): string {
	if (typeof raw !== 'string') return '';
	return raw
		.replace(/["`]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, GOAL_HINT_MAX);
}

export type ThemeCheck = { ok: true; theme: Theme } | { ok: false; message: string };

/**
 * Validate an operator-submitted theme.
 *
 * `collidingIds` is the set of ids that would be a conflict — on create that is
 * every known id (defaults, rows, and archived ones); on edit it is every known id
 * EXCEPT the one being edited. The caller decides, because only the caller knows
 * which it is doing.
 */
export function validateThemeInput(input: unknown, collidingIds: string[]): ThemeCheck {
	const b = (input ?? {}) as Record<string, unknown>;
	const err = (message: string): ThemeCheck => ({ ok: false, message });

	const id = slugifyThemeId(String(b.id ?? ''));
	if (!id) return err('That name has no letters or numbers to make an id from.');
	if (collidingIds.includes(id)) return err(`A theme with the id "${id}" already exists.`);

	const label_en = String(b.label_en ?? '').trim().slice(0, LABEL_MAX);
	if (!label_en) return err('An English label is required.');

	const label_te = String(b.label_te ?? '').trim().slice(0, LABEL_MAX);
	if (!label_te) return err('A Telugu label is required.');

	const goal_hint = sanitizeGoalHint(b.goal_hint);
	if (!goal_hint) return err('A goal hint is required — it tells the model what the story is about.');

	// Number() turns '', '   ', null and false into 0 and true into 1, all of which
	// Number.isInteger happily accepts — so a cleared form field would silently become
	// sort_order 0 and jump the theme to the front of the picker. Reject those first.
	const rawSort = b.sort_order;
	if (
		rawSort === null ||
		rawSort === undefined ||
		typeof rawSort === 'boolean' ||
		(typeof rawSort === 'string' && rawSort.trim() === '')
	) {
		return err('Sort order must be a whole number.');
	}
	const sort_order = Number(rawSort);
	if (!Number.isInteger(sort_order)) return err('Sort order must be a whole number.');

	return {
		ok: true,
		// Strictly === true: an absent checkbox must mean false, and a stray string
		// like "false" must not read as truthy.
		theme: { id, label_en, label_te, goal_hint, sort_order, archived: b.archived === true }
	};
}

/**
 * The three DELETE outcomes, as a decision the endpoint just executes.
 *
 * - A theme with a code default always survives a row delete: removing the row
 *   reverts it to its bundled values, so its stories keep resolving.
 * - An admin-added theme can only be removed when nothing points at it; otherwise
 *   deleting the row would leave stories referencing an id nothing resolves.
 */
export function decideDelete(
	hasCodeDefault: boolean,
	storyCount: number
): 'reset' | 'hard_delete' | 'refuse' {
	if (hasCodeDefault) return 'reset';
	return storyCount === 0 ? 'hard_delete' : 'refuse';
}
