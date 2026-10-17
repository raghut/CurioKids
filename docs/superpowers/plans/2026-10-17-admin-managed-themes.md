# Admin-Managed Themes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn story themes from a compiled-in enum into operator-managed data, editable at `/admin/themes`, seeded with `sharing`/`friendship`/`be_brave`/`good_habits` and archiving the three retired themes without breaking existing stories.

**Architecture:** Code defaults in `src/lib/data/themes.ts` merged with override rows from a new Postgres `themes` table — the same contract `promptTemplates.ts` already uses, so "reset" is a DELETE and offline falls back to the bundled list. All decision logic (merge, slug, sanitise, validate, delete-policy) lives in a pure `themeRules.ts` so it is testable without a database; `server/themes.ts` is the thin DB-touching layer. `validate.ts` stays pure by receiving the resolved theme list as an argument.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Tailwind 4, Neon Postgres (`@neondatabase/serverless`), vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-17-admin-managed-themes-design.md`

**Two deviations from the spec, deliberate:**
1. Admin CRUD uses **SvelteKit form actions** in `src/routes/admin/themes/+page.server.ts`, not a `/api/admin/themes` JSON endpoint. `/admin/prompts` — the closest analog — already does this, and form actions need no client fetch code. The public `GET /api/themes` is still a real endpoint because the kid `/create` screen fetches it from the browser.
2. `validateGenerateRequest` receives the **full** resolved list (archived included) and filters archived itself, so no caller can accidentally permit an archived theme.

**Node:** use nvm v22.23.1 (`source ~/.nvm/nvm.sh && nvm use 22.23.1`). Homebrew `node@22` is v23 and breaks the build.

**Page-level `curl` checks do not work on kid routes.** `src/routes/+layout.svelte:9` starts `showSplash = $state(true)` and only clears it in `onMount`, so server-rendered HTML for `/`, `/create`, `/stories` etc. contains the splash screen and nothing else. Verify client behaviour through `/api/*` endpoints, `npm run check`, `npm test` and `npm run build` — or in a real browser. Do not treat an empty `curl | grep` of a kid page as a failure.

**Admin routes need `ADMIN_PASSCODE`** and kid story creation needs `CREATE_PASSCODE` when set. Never submit, guess, or echo those values to verify something; leave passcode-gated visual checks to the user.

**There is no `npm run lint`.** CLAUDE.md documents `lint` and `format` scripts, but `package.json` has neither and eslint/prettier are not installed. `npm run check` (svelte-check + tsc) is the only static gate. Do not add eslint as part of this plan — adding a dependency needs the user's approval.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | `ThemeId` becomes `string`; `Theme` gains `sort_order` + `archived`; new `ThemeOption` |
| `src/lib/data/themes.ts` | the seven seed themes (4 active, 3 archived) — the offline/default baseline |
| `src/lib/server/themeRules.ts` | **new, pure:** merge, find, slugify, sanitise, validate, delete-policy |
| `src/lib/server/themeRules.test.ts` | **new:** unit tests for all of the above |
| `src/lib/server/themes.ts` | **new:** `resolveThemes` / `activeThemes` — defaults + DB rows, DB failure tolerated |
| `src/lib/server/db.ts` | four `themes`-table queries + a story count by theme |
| `src/lib/server/validate.ts` | takes the theme list as an argument; rejects archived |
| `src/routes/api/themes/+server.ts` | **new:** public GET, active themes, labels only |
| `src/routes/api/generate-story/+server.ts` | resolve themes, then validate |
| `src/routes/api/admin/generate-story/+server.ts` | resolve themes, then validate |
| `src/routes/admin/themes/+page.server.ts` | **new:** load + `save`/`reset`/`archive`/`create`/`delete` actions |
| `src/routes/admin/themes/+page.svelte` | **new:** the admin table + add form |
| `src/lib/components/ThemePicker.svelte` | theme list via props; palette cycles `i % 4` |
| `src/routes/create/+page.svelte` | fetch `/api/themes`, fall back to bundled active |
| `src/routes/admin/create/+page.svelte` | themes from the page load function |
| `src/routes/admin/prompts/+page.server.ts` | preview sample uses an **active** theme |
| `scripts/init-db.mjs` | create the `themes` table |

---

## Task 1: Types and the seven seed themes

**Files:**
- Modify: `src/lib/types.ts:96-103`
- Modify: `src/lib/data/themes.ts` (whole file)

- [ ] **Step 1: Replace the `ThemeId` union and `Theme` type**

In `src/lib/types.ts`, replace these lines:

```ts
export type ThemeId = 'be_brave' | 'help_friend' | 'find_lost' | 'learn_new';

export type Theme = {
	id: ThemeId;
	label_en: string;
	label_te: string;
	goal_hint: string;
};
```

with:

```ts
/**
 * Themes are operator-managed data (see /admin/themes), so this is a plain string
 * validated at runtime rather than a compile-time union. The runtime guard in
 * validate.ts is what replaces the old type safety.
 */
export type ThemeId = string;

export type Theme = {
	id: ThemeId;
	label_en: string;
	label_te: string;
	/** One-line goal fed to the story prompt. Operator-written, so sanitised + capped. */
	goal_hint: string;
	/** Display order in pickers and filter chips. Lower first. */
	sort_order: number;
	/** Hidden from pickers and chips, but still resolves by id so old stories keep their label. */
	archived: boolean;
};

/** What GET /api/themes returns. goal_hint is withheld — it is prompt-internal. */
export type ThemeOption = Pick<Theme, 'id' | 'label_en' | 'label_te'>;
```

- [ ] **Step 2: Rewrite the seed themes**

Replace the entire contents of `src/lib/data/themes.ts` with:

```ts
import type { Theme } from '$lib/types';

/**
 * The baseline theme set. Rows in the Postgres `themes` table override or extend
 * these (see src/lib/server/themes.ts), so "reset to default" is a DELETE and a
 * later deploy can still improve the baseline.
 *
 * The three archived entries are retired themes kept here on purpose: stories
 * generated under them store their id, so keeping the definition means an old
 * story's label still resolves offline with no DB round-trip and no migration.
 */
export const themes: Theme[] = [
	{
		id: 'sharing',
		label_en: 'Sharing',
		label_te: 'పంచుకోవడం',
		goal_hint: 'sharing something precious with others',
		sort_order: 10,
		archived: false
	},
	{
		id: 'friendship',
		label_en: 'Friendship',
		label_te: 'స్నేహం',
		goal_hint: 'making or keeping a friend',
		sort_order: 20,
		archived: false
	},
	{
		id: 'be_brave',
		label_en: 'Brave',
		label_te: 'ధైర్యంగా ఉండు',
		goal_hint: 'facing something scary',
		sort_order: 30,
		archived: false
	},
	{
		id: 'good_habits',
		label_en: 'Good Habits',
		label_te: 'మంచి అలవాట్లు',
		goal_hint: 'learning a good everyday habit',
		sort_order: 40,
		archived: false
	},
	// --- Retired 2026-10-17. Kept so existing stories still resolve a label. ---
	{
		id: 'help_friend',
		label_en: 'Help a Friend',
		label_te: 'స్నేహితుడికి సహాయం',
		goal_hint: 'helping someone in trouble',
		sort_order: 900,
		archived: true
	},
	{
		id: 'find_lost',
		label_en: 'Find the Lost',
		label_te: 'పోయినది కనుగొను',
		goal_hint: 'searching for something missing',
		sort_order: 910,
		archived: true
	},
	{
		id: 'learn_new',
		label_en: 'Learn Something New',
		label_te: 'కొత్తది నేర్చుకో',
		goal_hint: 'discovering something new about the world',
		sort_order: 920,
		archived: true
	}
];

/** The bundled active list — used as the offline/fetch-failure fallback on the client. */
export const seedActiveThemes: Theme[] = themes.filter((t) => !t.archived);
```

- [ ] **Step 3: Verify nothing broke that we have not planned for**

Run: `npm run check`
Expected: PASS. `validate.ts`, `ThemePicker.svelte`, `storyPrompt.test.ts` and `admin/prompts/+page.server.ts` all use `themes.find(...)`, which still compiles — later tasks change those deliberately. If `check` reports an error about `sort_order` or `archived` missing on a `Theme` literal, a test file is constructing a `Theme` by hand; add the two fields to it.

- [ ] **Step 4: Run the existing tests**

Run: `npm test`
Expected: PASS. `storyPrompt.test.ts` looks up `be_brave`, which is still active, and `validate.test.ts` uses `be_brave` too.

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/data/themes.ts
git commit -m "feat: themes as data — seed set, archived flag, sort order"
```

---

## Task 2: Pure theme rules

**Files:**
- Create: `src/lib/server/themeRules.ts`
- Test: `src/lib/server/themeRules.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/themeRules.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- themeRules`
Expected: FAIL — "Failed to resolve import ./themeRules".

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/themeRules.ts`:

```ts
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

/** "Good Habits" -> "good_habits". Returns "" when nothing usable survives. */
export function slugifyThemeId(labelEn: string): string {
	return String(labelEn ?? '')
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

	const sort_order = Number(b.sort_order);
	if (!Number.isInteger(sort_order)) return err('Sort order must be a whole number.');

	return {
		ok: true,
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- themeRules`
Expected: PASS, 26 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/themeRules.ts src/lib/server/themeRules.test.ts
git commit -m "feat: pure theme rules — merge, slug, sanitise, validate, delete policy"
```

---

## Task 3: The `themes` table and its queries

**Files:**
- Modify: `scripts/init-db.mjs:27-37`
- Modify: `src/lib/server/db.ts` (append a section; update the import on line 3)

- [ ] **Step 1: Add the table to the init script**

In `scripts/init-db.mjs`, after the `prompt_templates` block and before the `console.log`, insert:

```js
await sql`
	CREATE TABLE IF NOT EXISTS themes (
		id          text PRIMARY KEY,
		label_en    text NOT NULL,
		label_te    text NOT NULL,
		goal_hint   text NOT NULL,
		sort_order  int  NOT NULL DEFAULT 100,
		archived    boolean NOT NULL DEFAULT false,
		updated_at  timestamptz NOT NULL DEFAULT now()
	)
`;
```

and change the final line to:

```js
console.log('✅ stories + prompt_templates + themes tables ready');
```

The table starts empty on purpose — the seed set lives in `src/lib/data/themes.ts`, not in rows.

- [ ] **Step 2: Add `Theme` to the db.ts type import**

In `src/lib/server/db.ts` line 3, add `Theme` to the import list:

```ts
import type { GeneratedStory, StorySummary, AdminStorySummary, AgeBand, PromptKind, PromptOverride, Theme } from '$lib/types';
```

- [ ] **Step 3: Append the theme queries**

At the end of `src/lib/server/db.ts`, append:

```ts
// --- Themes ----------------------------------------------------------------------
// Only OVERRIDES and ADDITIONS are stored. A theme with no row uses the code default
// in src/lib/data/themes.ts, which is why resetting a theme is a plain DELETE.

/** Every saved theme row. Callers layer these over the defaults via resolveThemes. */
export async function listThemeRows(): Promise<Theme[]> {
	const q = sql();
	const rows = await q`
		SELECT id, label_en, label_te, goal_hint, sort_order, archived
		FROM themes
	`;
	return rows as Theme[];
}

/** Save (or replace) one theme row. */
export async function upsertThemeRow(t: Theme): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO themes (id, label_en, label_te, goal_hint, sort_order, archived, updated_at)
		VALUES (${t.id}, ${t.label_en}, ${t.label_te}, ${t.goal_hint}, ${t.sort_order}, ${t.archived}, now())
		ON CONFLICT (id) DO UPDATE SET
			label_en = ${t.label_en},
			label_te = ${t.label_te},
			goal_hint = ${t.goal_hint},
			sort_order = ${t.sort_order},
			archived = ${t.archived},
			updated_at = now()
	`;
}

/** Remove one theme row: resets a code default, or deletes an admin-added theme. */
export async function deleteThemeRow(id: string): Promise<void> {
	const q = sql();
	await q`DELETE FROM themes WHERE id = ${id}`;
}

/** How many stories reference this theme — the guard before any hard delete. */
export async function countStoriesUsingTheme(id: string): Promise<number> {
	const q = sql();
	const rows = await q`SELECT count(*)::int AS n FROM stories WHERE story->>'theme_id' = ${id}`;
	return (rows[0]?.n as number) ?? 0;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 5: Create the table**

Run: `nvm use 22.23.1 && npm run db:init`
Expected: `✅ stories + prompt_templates + themes tables ready`

If `DATABASE_URL` is not set the script exits with a message — that is fine locally, but the table must exist before the admin page can save anything.

- [ ] **Step 6: Commit**

```bash
git add scripts/init-db.mjs src/lib/server/db.ts
git commit -m "feat: themes table and queries"
```

---

## Task 4: Resolving themes (defaults + overrides)

**Files:**
- Create: `src/lib/server/themes.ts`

- [ ] **Step 1: Write the implementation**

There is no unit test for this file: it is a thin async wrapper whose only logic (`mergeThemes`) is already covered in Task 2. Create `src/lib/server/themes.ts`:

```ts
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
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/themes.ts
git commit -m "feat: resolve themes from code defaults plus db overrides"
```

---

## Task 5: `validate.ts` takes the theme list

**Files:**
- Modify: `src/lib/server/validate.ts:1-3, 50-60, 104-117`
- Test: `src/lib/server/validate.test.ts`
- Modify: `src/routes/api/generate-story/+server.ts:4, 32`
- Modify: `src/routes/api/admin/generate-story/+server.ts:3, 37`

- [ ] **Step 1: Write the failing tests**

In `src/lib/server/validate.test.ts`, add this import at the top of the file:

```ts
import { themes } from '$lib/data/themes';
```

Then add this block at the end of the file:

```ts
describe('theme validation against the resolved list', () => {
	it('accepts an active theme', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'sharing', language: 'en' },
			themes
		);
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.theme.id).toBe('sharing');
	});

	it('rejects an unknown theme', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'nope', language: 'en' },
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('rejects an ARCHIVED theme — retired themes cannot start new stories', () => {
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'help_friend', language: 'en' },
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('rejects an archived theme on the admin brief path too', () => {
		const r = validateAdminBrief(
			{
				story_idea: 'A rabbit shares a carrot.',
				character_id: 'rabbit',
				theme_id: 'help_friend',
				age_band: '5-6',
				language: 'en'
			},
			themes
		);
		expect(r.ok).toBe(false);
	});

	it('accepts an admin-added theme that is not a code default', () => {
		const extended = [
			...themes,
			{
				id: 'kindness',
				label_en: 'Kindness',
				label_te: 'దయ',
				goal_hint: 'being kind to someone small',
				sort_order: 50,
				archived: false
			}
		];
		const r = validateGenerateRequest(
			{ character_id: 'rabbit', theme_id: 'kindness', language: 'en' },
			extended
		);
		expect(r.ok).toBe(true);
	});
});
```

Now update every **existing** call in `src/lib/server/validate.test.ts` to pass `themes` as the second argument. There are exactly 19, at these lines:

| Lines | Call |
|---|---|
| 6, 16, 21, 25, 29, 34, 39, 49, 59, 60 | `validateGenerateRequest` |
| 78, 93, 102, 108, 113, 118, 123, 129, 130, 131, 135 | `validateAdminBrief` |

The edit is mechanical — `themes` becomes the last argument of each call. Single-line calls:

```ts
// line 6, before
const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '  Geeta  ' });
// after
const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '  Geeta  ' }, themes);
```

```ts
// line 129-131, before
expect(validateAdminBrief({ ...base, theme_id: 'nope' }).ok).toBe(false);
expect(validateAdminBrief({ ...base, age_band: '9-10' }).ok).toBe(false);
expect(validateAdminBrief({ ...base, language: 'fr' }).ok).toBe(false);
// after
expect(validateAdminBrief({ ...base, theme_id: 'nope' }, themes).ok).toBe(false);
expect(validateAdminBrief({ ...base, age_band: '9-10' }, themes).ok).toBe(false);
expect(validateAdminBrief({ ...base, language: 'fr' }, themes).ok).toBe(false);
```

Multi-line calls (lines 39 and 49) close with `});` — that becomes `}, themes);`.

Leave the existing `theme_id: 'be_brave'` values alone: `be_brave` is still an active seed theme, so those tests keep passing and the diff stays about the signature change only. The `base` object at line 72 also uses `theme_id: 'be_brave'` and needs no edit.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- validate`
Expected: FAIL — "Expected 1 arguments, but got 2" at compile, or the archived-theme tests failing because `help_friend` is currently accepted.

- [ ] **Step 3: Change the signatures**

In `src/lib/server/validate.ts`:

Remove the module-level themes import on line 2:

```ts
// DELETE this line — the theme list is now passed in, keeping this module pure.
import { themes } from '$lib/data/themes';
```

Add a shared helper just below the `sanitizeExtra` function (after line 43):

```ts
/**
 * Resolve a submitted theme id against the list the caller passed in.
 *
 * Takes the FULL resolved list (archived included) and filters archived here, so no
 * caller can accidentally permit a retired theme just by forgetting to filter.
 * Archived themes must still resolve elsewhere (findTheme) so old stories keep
 * their label — they simply cannot start new ones.
 */
function pickActiveTheme(themeId: unknown, themes: Theme[]): Theme | undefined {
	return themes.find((t) => t.id === themeId && !t.archived);
}
```

Change `validateGenerateRequest` (line 50) to take the list and use the helper:

```ts
export function validateGenerateRequest(body: unknown, themes: Theme[]): Ok | Err {
	const { character_id, theme_id, child_name, language, extra } = (body ?? {}) as Record<
		string,
		unknown
	>;

	const character = characters.find((c) => c.id === character_id);
	if (!character) return { ok: false, code: 'invalid_input', message: 'Please pick a character first.' };

	const theme = pickActiveTheme(theme_id, themes);
	if (!theme) return { ok: false, code: 'invalid_input', message: 'Please pick a story kind first.' };
```

and leave the rest of that function unchanged.

Change `validateAdminBrief` (line 104) the same way:

```ts
export function validateAdminBrief(body: unknown, themes: Theme[]): AdminBriefOk | Err {
```

and replace its theme lookup on line 116:

```ts
	const theme = pickActiveTheme(b.theme_id, themes);
	if (!theme) return err('Please pick a story kind first.');
```

Finally update the doc comment on `validateGenerateRequest` — it currently claims it validates "against the locked enums", which is no longer true:

```ts
/**
 * Validate the generate-story request body. Pure — no I/O; the caller resolves the
 * theme list and passes it in. child_name is trimmed and capped; empty becomes null.
 * extra is a sanitized, length-capped content hint (never an instruction).
 */
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- validate`
Expected: PASS.

- [ ] **Step 5: Update the kid generate-story endpoint**

In `src/routes/api/generate-story/+server.ts`, add the import after line 4:

```ts
import { resolveThemes } from '$lib/server/themes';
```

and replace line 32:

```ts
	const v = validateGenerateRequest(body, await resolveThemes());
```

- [ ] **Step 6: Update the admin generate-story endpoint**

In `src/routes/api/admin/generate-story/+server.ts`, add the import after line 3:

```ts
import { resolveThemes } from '$lib/server/themes';
```

and replace the `validateAdminBrief` call:

```ts
	const v = validateAdminBrief(body, await resolveThemes());
```

- [ ] **Step 7: Run everything**

Run: `npm test && npm run check`
Expected: PASS both.

- [ ] **Step 8: Commit**

```bash
git add src/lib/server/validate.ts src/lib/server/validate.test.ts src/routes/api/generate-story/+server.ts src/routes/api/admin/generate-story/+server.ts
git commit -m "feat: validate themes at runtime against the resolved list"
```

---

## Task 6: Public `GET /api/themes`

**Files:**
- Create: `src/routes/api/themes/+server.ts`

- [ ] **Step 1: Write the endpoint**

Create `src/routes/api/themes/+server.ts`, mirroring the shape of `src/routes/api/stories/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeThemes, toThemeOptions } from '$lib/server/themes';

/**
 * The active theme list for the kid create screen and the stories filter chips.
 * Public and read-only, like /api/stories. goal_hint is withheld — it is
 * prompt-internal and the client has no use for it.
 */
export const GET: RequestHandler = async () => {
	try {
		return json({ themes: toThemeOptions(await activeThemes()) });
	} catch (err) {
		console.error('list themes failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load themes.' }, { status: 500 });
	}
};
```

- [ ] **Step 2: Verify it compiles and responds**

Run: `npm run check`
Expected: PASS.

Run: `npm run dev` in one terminal, then `curl -s localhost:5173/api/themes`
Expected: JSON with four themes — `sharing`, `friendship`, `be_brave`, `good_habits` — each with `id`, `label_en`, `label_te` and **no** `goal_hint`. The three archived themes must be absent.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/themes/+server.ts
git commit -m "feat: public active-themes endpoint"
```

---

## Task 7: Theme list through the UI

**Files:**
- Modify: `src/lib/components/ThemePicker.svelte` (whole file)
- Modify: `src/routes/create/+page.svelte:1-31`
- Modify: `src/routes/admin/create/+page.svelte`
- Modify: `src/routes/create/generating/+page.svelte:37`

- [ ] **Step 1: Make `ThemePicker` take its list as a prop**

Replace the whole of `src/lib/components/ThemePicker.svelte` with:

```svelte
<script lang="ts">
	import type { ThemeId, Language, ThemeOption } from '$lib/types';

	let { themes, selected = $bindable<ThemeId | null>(null), lang = 'en' }: {
		themes: ThemeOption[];
		selected?: ThemeId | null;
		lang?: Language;
	} = $props();

	// Themes are operator-managed, so there can be any number of them. Cycle the
	// four pastel fills rather than indexing a fixed-length array.
	const colors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];
</script>

<div class="grid grid-cols-2 gap-3">
	{#each themes as theme, i (theme.id)}
		<button
			type="button"
			class="rounded-2xl p-4 text-left border-2 transition-colors min-h-[64px]
				{colors[i % colors.length]}
				{selected === theme.id ? 'border-coral' : 'border-transparent'}"
			onclick={() => (selected = theme.id)}
		>
			<span class="text-base font-bold" lang={lang === 'te' ? 'te' : undefined}>
				{lang === 'te' ? theme.label_te : theme.label_en}
			</span>
		</button>
	{/each}
</div>
```

- [ ] **Step 2: Fetch the list on the kid create screen**

In `src/routes/create/+page.svelte`, add to the imports:

```ts
	import { seedActiveThemes } from '$lib/data/themes';
	import type { CharacterId, ThemeId, ThemeOption } from '$lib/types';
```

(replacing the existing `import type { CharacterId, ThemeId } from '$lib/types';`)

Add this state alongside the others near line 13:

```ts
	// Operator-managed, so fetched. Falls back to the bundled active set rather than
	// rendering an empty picker — this screen already needs network to generate.
	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);
```

Inside the existing `init()` function, before the passcode probe, add:

```ts
		try {
			const res = await fetch('/api/themes');
			if (res.ok) {
				const data = (await res.json()) as { themes: ThemeOption[] };
				if (data.themes?.length) themeOptions = data.themes;
			}
		} catch {
			// Keep the bundled fallback already in themeOptions.
		}
```

Then pass the list to the picker in the markup:

```svelte
<ThemePicker themes={themeOptions} bind:selected={selectedTheme} lang={$language} />
```

- [ ] **Step 3: Pass the list on the admin create screen**

`src/routes/admin/create/+page.svelte` currently imports `ThemePicker` and renders it. It has no `+page.server.ts`, so fetch the list the same way the kid screen does. Add to its script block:

```ts
	import { seedActiveThemes } from '$lib/data/themes';
	import type { ThemeOption } from '$lib/types';

	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);

	$effect(() => {
		void (async () => {
			try {
				const res = await fetch('/api/themes');
				if (res.ok) {
					const data = (await res.json()) as { themes: ThemeOption[] };
					if (data.themes?.length) themeOptions = data.themes;
				}
			} catch {
				// Bundled fallback stands.
			}
		})();
	});
```

Then replace line 170:

```svelte
				<ThemePicker bind:selected={selectedTheme} lang={language} />
```

with:

```svelte
				<ThemePicker themes={themeOptions} bind:selected={selectedTheme} lang={language} />
```

- [ ] **Step 4: Drop the client-side cast on the generating screen**

In `src/routes/create/generating/+page.svelte` line 37, the theme id is cast to the old union. Replace:

```ts
		const theme_id = $page.url.searchParams.get('theme') as ThemeId | null;
```

with:

```ts
		// A plain string now — the server validates it against the resolved theme list.
		const theme_id = $page.url.searchParams.get('theme');
```

If `ThemeId` becomes an unused import in that file, remove it from the import list — `npm run check` reports unused imports as warnings.

- [ ] **Step 5: Verify**

Run: `npm run check`
Expected: PASS.

Run: `npm run dev`, open `/create`
Expected: four theme cards — Sharing, Friendship, Brave, Good Habits — with the pastel fills, and a coral border on the one you tap. Picking a character + theme and pressing "Make my story" still generates.

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ThemePicker.svelte src/routes/create/+page.svelte src/routes/admin/create/+page.svelte src/routes/create/generating/+page.svelte
git commit -m "feat: theme pickers take the active list as data"
```

---

## Task 8: The `/admin/themes` page

**Files:**
- Create: `src/routes/admin/themes/+page.server.ts`
- Create: `src/routes/admin/themes/+page.svelte`
- Modify: `src/routes/admin/+layout.svelte` (add the nav link)

Auth needs nothing new: `src/hooks.server.ts` already gates every `/admin/*` route.

- [ ] **Step 1: Write the load function and actions**

Create `src/routes/admin/themes/+page.server.ts`:

```ts
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { themes as defaults } from '$lib/data/themes';
import { resolveThemes } from '$lib/server/themes';
import {
	validateThemeInput,
	decideDelete,
	SOFT_ACTIVE_LIMIT,
	GOAL_HINT_MAX
} from '$lib/server/themeRules';
import {
	listThemeRows,
	upsertThemeRow,
	deleteThemeRow,
	countStoriesUsingTheme
} from '$lib/server/db';

const defaultIds = new Set(defaults.map((d) => d.id));

export const load: PageServerLoad = async () => {
	const all = await resolveThemes();

	// Which themes have a saved row — i.e. which can be "reset".
	let rowIds = new Set<string>();
	let loadError = false;
	try {
		rowIds = new Set((await listThemeRows()).map((r) => r.id));
	} catch (err) {
		console.error('theme rows load failed:', err instanceof Error ? err.message : 'unknown');
		loadError = true;
	}

	const rows = await Promise.all(
		all.map(async (t) => ({
			...t,
			hasDefault: defaultIds.has(t.id),
			isEdited: rowIds.has(t.id),
			storyCount: await countStoriesUsingTheme(t.id).catch(() => 0)
		}))
	);

	return {
		rows,
		loadError,
		activeCount: all.filter((t) => !t.archived).length,
		softLimit: SOFT_ACTIVE_LIMIT,
		goalHintMax: GOAL_HINT_MAX
	};
};

/** Every known id, for collision checks — defaults, rows and archived alike. */
async function knownIds(): Promise<string[]> {
	return (await resolveThemes()).map((t) => t.id);
}

export const actions: Actions = {
	// Edit an existing theme. Its own id is excluded from the collision set.
	save: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const colliding = (await knownIds()).filter((k) => k !== id);

		const check = validateThemeInput(
			{
				id,
				label_en: form.get('label_en'),
				label_te: form.get('label_te'),
				goal_hint: form.get('goal_hint'),
				sort_order: form.get('sort_order'),
				archived: form.get('archived') === 'on'
			},
			colliding
		);
		if (!check.ok) return fail(400, { error: check.message, id });

		// The id is immutable: keep whatever was submitted as the row key, never the
		// re-slugged label, or renaming a theme would orphan its stories.
		if (check.theme.id !== id) return fail(400, { error: 'A theme id cannot change.', id });

		try {
			await upsertThemeRow(check.theme);
		} catch (err) {
			console.error('theme save failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save. Has npm run db:init been run?', id });
		}
		return { saved: id };
	},

	// Add a brand-new theme. Collides against every known id, archived included.
	create: async ({ request }) => {
		const form = await request.formData();
		const labelEn = String(form.get('label_en') ?? '');
		// Blank id field -> slug it from the English label.
		const rawId = String(form.get('id') ?? '').trim() || labelEn;

		const check = validateThemeInput(
			{
				id: rawId,
				label_en: labelEn,
				label_te: form.get('label_te'),
				goal_hint: form.get('goal_hint'),
				sort_order: form.get('sort_order') || '100',
				archived: false
			},
			await knownIds()
		);
		if (!check.ok) return fail(400, { error: check.message, creating: true });

		try {
			await upsertThemeRow(check.theme);
		} catch (err) {
			console.error('theme create failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save. Has npm run db:init been run?', creating: true });
		}
		return { created: check.theme.id };
	},

	// Archive / unarchive. Writes a row even for a code default — that row IS the
	// archive flag, and "reset" removes it again.
	archive: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const archived = form.get('archived') === 'true';

		const current = (await resolveThemes()).find((t) => t.id === id);
		if (!current) return fail(400, { error: 'Unknown theme.', id });

		try {
			await upsertThemeRow({ ...current, archived });
		} catch (err) {
			console.error('theme archive failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save.', id });
		}
		return { saved: id };
	},

	// Reset a code default, or hard-delete an admin-added theme nothing references.
	remove: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		let count = 0;
		try {
			count = await countStoriesUsingTheme(id);
		} catch (err) {
			console.error('theme story count failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not check which stories use this theme.', id });
		}

		const decision = decideDelete(defaultIds.has(id), count);
		if (decision === 'refuse') {
			return fail(409, {
				error: `${count} ${count === 1 ? 'story uses' : 'stories use'} this theme, so it cannot be deleted. Archive it instead.`,
				id
			});
		}

		try {
			await deleteThemeRow(id);
		} catch (err) {
			console.error('theme delete failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not delete.', id });
		}
		return decision === 'reset' ? { reset: id } : { deleted: id };
	}
};
```

- [ ] **Step 2: Write the page**

Create `src/routes/admin/themes/+page.svelte`. This is an admin tool, so it follows the slate/utility styling of the other admin pages rather than the kid palette:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="max-w-5xl mx-auto p-6">
	<h1 class="text-2xl font-bold mb-2">Themes</h1>
	<p class="text-sm text-slate-600 mb-6">
		Defaults live in code; anything you change here is saved as an override. Reset removes the
		override. A theme's id can never change — it is stored inside every story that used it.
	</p>

	{#if data.loadError}
		<p class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
			Could not read saved themes. Has <code>npm run db:init</code> been run?
		</p>
	{/if}

	{#if form?.error}
		<p class="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
			{form.error}
		</p>
	{/if}

	{#if data.activeCount > data.softLimit}
		<p class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
			{data.activeCount} active themes. Above {data.softLimit}, the "Make my story" button on the
			child's create screen falls below the fold.
		</p>
	{/if}

	<div class="space-y-4">
		{#each data.rows as t (t.id)}
			<form
				method="POST"
				action="?/save"
				use:enhance
				class="rounded-xl border border-slate-200 p-4 {t.archived ? 'bg-slate-50' : 'bg-white'}"
			>
				<input type="hidden" name="id" value={t.id} />

				<div class="flex items-baseline justify-between mb-3">
					<code class="text-xs text-slate-500">{t.id}</code>
					<span class="text-xs text-slate-500">
						{t.isEdited ? 'edited' : 'default'} ·
						{t.storyCount} {t.storyCount === 1 ? 'story' : 'stories'}
						{#if t.archived}· archived{/if}
					</span>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block">
						<span class="text-xs font-medium text-slate-600">English label</span>
						<input
							name="label_en"
							value={t.label_en}
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-600">Telugu label</span>
						<input
							name="label_te"
							value={t.label_te}
							lang="te"
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>
				</div>

				<label class="mt-3 block">
					<span class="text-xs font-medium text-slate-600">
						Goal hint — goes into the story prompt (max {data.goalHintMax} chars)
					</span>
					<input
						name="goal_hint"
						value={t.goal_hint}
						maxlength={data.goalHintMax}
						class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>

				<div class="mt-3 flex flex-wrap items-end gap-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-600">Sort</span>
						<input
							name="sort_order"
							type="number"
							value={t.sort_order}
							class="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>

					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name="archived" checked={t.archived} />
						Archived
					</label>

					<button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
						Save
					</button>

					{#if t.hasDefault}
						{#if t.isEdited}
							<button
								formaction="?/remove"
								class="rounded-lg border border-slate-300 px-4 py-2 text-sm"
							>
								Reset to default
							</button>
						{/if}
					{:else if t.storyCount === 0}
						<button
							formaction="?/remove"
							class="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
						>
							Delete
						</button>
					{:else}
						<span class="text-xs text-slate-500">
							Used by {t.storyCount} {t.storyCount === 1 ? 'story' : 'stories'} — archive instead of
							deleting.
						</span>
					{/if}
				</div>
			</form>
		{/each}
	</div>

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="mt-8 rounded-xl border-2 border-dashed border-slate-300 p-4"
	>
		<h2 class="mb-3 font-bold">Add a theme</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block">
				<span class="text-xs font-medium text-slate-600">English label</span>
				<input name="label_en" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
			</label>
			<label class="block">
				<span class="text-xs font-medium text-slate-600">Telugu label</span>
				<input
					name="label_te"
					lang="te"
					class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
				/>
			</label>
		</div>
		<label class="mt-3 block">
			<span class="text-xs font-medium text-slate-600">
				Goal hint (max {data.goalHintMax} chars)
			</span>
			<input
				name="goal_hint"
				maxlength={data.goalHintMax}
				class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
			/>
		</label>
		<div class="mt-3 flex flex-wrap items-end gap-3">
			<label class="block">
				<span class="text-xs font-medium text-slate-600">id (blank = from the English label)</span>
				<input name="id" placeholder="good_habits" class="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
			</label>
			<label class="block">
				<span class="text-xs font-medium text-slate-600">Sort</span>
				<input
					name="sort_order"
					type="number"
					value="100"
					class="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
				/>
			</label>
			<button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
				Add theme
			</button>
		</div>
	</form>
</div>
```

- [ ] **Step 3: Add the nav link**

In `src/routes/admin/+layout.svelte`, add `Tags` to the lucide import on line 3:

```ts
	import { LayoutGrid, LogOut, Menu, X, Plus, SlidersHorizontal, Tags } from 'lucide-svelte';
```

Then insert a link in the `nav` snippet, immediately after the `/admin/prompts` link that ends on line 86 and before the sign-out `<form>`:

```svelte
		<a
			href="/admin/themes"
			class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
			onclick={() => (drawerOpen = false)}
		>
			<Tags size={18} strokeWidth={1.5} /> Themes
		</a>
```

`strokeWidth={1.5}` matches the project's locked icon style.

- [ ] **Step 4: Verify**

Run: `npm run check`
Expected: PASS.

Run: `npm run dev`, log in at `/admin/login`, open `/admin/themes`
Expected:
- Seven cards: four active, three marked archived.
- Each shows `default` and a story count.
- Editing "Sharing" to "Sharing Nicely" and saving shows it as `edited`; a **Reset to default** button appears; pressing it restores "Sharing".
- Adding a theme with English label "Kindness", Telugu "దయ", goal hint "being kind to someone small" creates id `kindness` and it appears at `/create` and in `curl -s localhost:5173/api/themes`.
- Deleting `kindness` while it has no stories removes it.
- Ticking Archived on a theme hides it from `/create`.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/themes src/routes/admin/+layout.svelte
git commit -m "feat: /admin/themes page — edit, add, archive, reset, delete"
```

---

## Task 9: Stop the prompt preview showcasing a retired theme

**Files:**
- Modify: `src/routes/admin/prompts/+page.server.ts:38`

The prompt preview builds its sample brief with `themes.find((t) => t.id === 'help_friend')!`. That theme is now archived. It still resolves — it stays in `themes.ts` — but the preview would hold up a retired theme as the example.

- [ ] **Step 1: Point the sample at an active theme**

In `src/routes/admin/prompts/+page.server.ts`, replace line 38:

```ts
		theme: themes.find((t) => t.id === 'help_friend')!,
```

with:

```ts
		theme: themes.find((t) => t.id === 'sharing')!,
```

The sample story idea on line 34 is already about sharing a banana, so this also makes the preview internally consistent.

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: PASS.

Run: `npm run dev`, open `/admin/prompts`, press Preview on any `story_user` template
Expected: the rendered prompt contains "sharing something precious with others" and no longer mentions helping someone in trouble.

- [ ] **Step 3: Commit**

```bash
git add src/routes/admin/prompts/+page.server.ts
git commit -m "fix: prompt preview sample uses an active theme"
```

---

## Task 10: Full verification

**Files:** none — verification only.

- [ ] **Step 1: Run the whole suite**

Run: `npm test`
Expected: PASS, including the new `themeRules` tests and the updated `validate` tests.

- [ ] **Step 2: Typecheck**

Run: `npm run check`
Expected: PASS, zero errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: PASS. This catches any route that still imports the removed `ThemeId` union members.

- [ ] **Step 4: Endpoint-level checks (no secrets needed)**

With the dev server running:

```bash
curl -s localhost:5173/api/themes
```
Expected: exactly the four active themes, each with `id`, `label_en`, `label_te`.

```bash
curl -s localhost:5173/api/themes | grep -c goal_hint
```
Expected: `0` — `goal_hint` must never be on the wire.

```bash
curl -s localhost:5173/api/themes | grep -cE 'help_friend|find_lost|learn_new'
```
Expected: `0` — archived themes must not be offered.

```bash
curl -s -o /dev/null -w '%{http_code}\n' localhost:5173/admin/themes
```
Expected: a redirect or 401/403, proving `hooks.server.ts` gates the new admin route. **Do not** attempt to authenticate.

- [ ] **Step 5: Visual check — hand this to the user**

The remaining checks need the family and admin passcodes, so they are the user's to run, not an agent's:

1. `/create` → four theme cards (Sharing, Friendship, Brave, Good Habits); pick one and generate.
2. `/admin/themes` → seven rows, four active and three marked archived; rename one, save, confirm it shows as `edited`, then Reset to default.
3. Add a theme; confirm it appears at `/create` and in `/api/themes`.
4. Archive a theme; confirm it vanishes from `/create` but a story already made under it still opens.

- [ ] **Step 6: Confirm the archived path really is rejected server-side**

Run:

```bash
curl -s -X POST localhost:5173/api/generate-story \
  -H 'content-type: application/json' \
  -d '{"character_id":"rabbit","theme_id":"help_friend","language":"en"}'
```

Expected: a 400 with `{"error":"invalid_input","message":"Please pick a story kind first."}`. This is the guard that replaced the compile-time union — if it passes instead, Task 5 is wrong.

- [ ] **Step 7: Commit anything outstanding**

```bash
git status --short
```

Expected: clean. If not, review and commit.

---

## Notes for the implementer

- **`npm run db:init` must be re-run** before the admin page can save. Until then the page shows the amber "Has db:init been run?" banner and everything else still works off the code defaults — that degradation is deliberate, not a bug to fix.
- **Do not reintroduce a `ThemeId` union.** If the compiler complains about a theme id, the fix is a runtime check, not a narrower type.
- **Never let a theme's `id` change on save.** The `save` action guards this explicitly. A renamed id orphans every story that used it.
- **Telugu labels** for the seed themes were written by Claude at the user's request; they are flagged in the spec for correction. Do not translate any further Telugu yourself — the project rule is that content and translations come from the user.
- **`findTheme` has no caller yet.** It is specified and tested because it is the mechanism that justifies keeping archived themes in `themes.ts` — looking up a retired theme's label by id. Nothing displays a story's theme label today (the admin pages show the raw `theme_id`), so it sits unused. Leave it; do not wire it into anything speculatively.
