# Admin-managed themes — design

**Date:** 2026-10-17
**Status:** approved
**Relationship:** Phase 1 of two. Phase 2 is
`2026-10-17-stories-filters-design.md`, which depends on this one for its theme
chip list.

## Goal

Make the story themes data instead of a compiled-in enum, so an operator can add,
rename and retire them from the admin dashboard without a deploy. Seed the set
with Sharing, Friendship, Brave and Good Habits, and retire the three current
themes that aren't in that list without breaking the stories already generated
under them.

## Rule amendment (approved 2026-10-17)

CLAUDE.md locks themes to four ids and lists "Custom theme entry" under
out-of-scope. That is hereby amended: **themes are operator-managed through the
admin dashboard.** The child still only *selects* a theme — they never create or
name one, so the kid-facing surface is unchanged in kind.

This follows the precedent set by editable prompts (2026-09-27): operator-owned
text with a code-level baseline, guarded by a locked floor.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Seed set | `sharing`, `friendship`, `be_brave`, `good_habits` | The four requested. `be_brave` reuses the existing id so stories already generated under it keep their label. |
| The other three | **archived, not deleted** | `help_friend`, `find_lost`, `learn_new` are stored in every story that used them. Archived means hidden from the pickers and filter chips, still resolving by id. |
| Where archived themes live | **in `themes.ts`, flagged `archived: true`** | An old story's label then resolves with no DB round-trip, offline, and with no migration. |
| Source of truth | code defaults + DB overrides | Matches `promptTemplates.ts`. Degrades honestly offline; later deploys can still improve the baseline; reset is a DELETE. |
| `ThemeId` | becomes `string`, validated at runtime | Unavoidable once themes are data. See "What this costs" below. |
| `id` mutability | immutable after creation | It is the key inside every story's JSONB `theme_id`. |
| Hard delete | only when zero stories reference the id | Otherwise archive. This is what makes the feature safe to operate. |
| `goal_hint` | operator-editable, sanitised, 120-char cap | It reaches the model. The existing `LOCKED_FLOOR` keeps guardrails intact. |

## Resolution model

`themes.ts` ships seven entries:

| id | label_en | label_te | goal_hint | archived |
|---|---|---|---|---|
| `sharing` | Sharing | పంచుకోవడం | sharing something precious with others | — |
| `friendship` | Friendship | స్నేహం | making or keeping a friend | — |
| `be_brave` | Brave | ధైర్యంగా ఉండు | facing something scary | — |
| `good_habits` | Good Habits | మంచి అలవాట్లు | learning a good everyday habit | — |
| `help_friend` | Help a Friend | స్నేహితుడికి సహాయం | helping someone in trouble | ✓ |
| `find_lost` | Find the Lost | పోయినది కనుగొను | searching for something missing | ✓ |
| `learn_new` | Learn Something New | కొత్తది నేర్చుకో | discovering something new about the world | ✓ |

The Telugu for the three new labels was written by Claude at the user's request
and should be corrected if it reads oddly. The four pre-existing Telugu labels are
unchanged from the current `themes.ts`.

`sort_order` on the code defaults follows the table order (10, 20, 30, 40, then
the archived three at 900+).

### Merge rules

```
resolveThemes():
  start from the seven code defaults, keyed by id
  for each row in the themes table:
    if id matches a default -> that row's fields override the default's
    if id is new            -> append it as an addition
  sort by sort_order, then label_en
```

- A theme with no row uses its code default. "Reset to default" is therefore a
  DELETE of the row, not a write of the default values.
- `activeThemes()` is `resolveThemes()` filtered to `archived === false`. This is
  what the pickers and filter chips show.
- `findTheme(id)` searches the **full** resolved list, archived included, so an old
  story's theme always resolves.

## Schema

```sql
CREATE TABLE IF NOT EXISTS themes (
  id          text PRIMARY KEY,
  label_en    text NOT NULL,
  label_te    text NOT NULL,
  goal_hint   text NOT NULL,
  sort_order  int  NOT NULL DEFAULT 100,
  archived    boolean NOT NULL DEFAULT false,
  updated_at  timestamptz NOT NULL DEFAULT now()
);
```

Added to `scripts/init-db.mjs`. **Requires a `npm run db:init` re-run after
pulling**, exactly as the prompts feature did. The table starts empty — the seed
set lives in code, not in rows.

## Types

```ts
/** No longer a union: themes are data, validated at runtime. */
export type ThemeId = string;

export type Theme = {
  id: ThemeId;
  label_en: string;
  label_te: string;
  goal_hint: string;
  sort_order: number;
  archived: boolean;
};

/** What /api/themes returns. goal_hint is withheld — it is prompt-internal. */
export type ThemeOption = Pick<Theme, 'id' | 'label_en' | 'label_te'>;
```

### What this costs

Dropping the union means the compiler no longer catches a typo'd theme id at the
twelve sites that reference one. The runtime guard in `validate.ts` is what
replaces it, which is why this spec expands the validation tests rather than
leaving them as they are. This is a real loss of safety, accepted deliberately as
the price of themes being editable.

## New module: `src/lib/server/themes.ts`

```ts
import type { Theme, ThemeOption } from '$lib/types';

/** Code defaults merged with DB overrides, sorted. Archived included. */
export async function resolveThemes(): Promise<Theme[]>;

/** resolveThemes() minus archived. What pickers and filter chips show. */
export async function activeThemes(): Promise<Theme[]>;

/** Admin writes. upsert validates and sanitises before touching the DB. */
export async function upsertTheme(t: Theme): Promise<void>;
export async function deleteThemeRow(id: string): Promise<void>;   // = reset to default
export async function countStoriesUsingTheme(id: string): Promise<number>;
```

The pure parts — merging, sorting, slugging, validation, sanitising — are split
into `src/lib/server/themeRules.ts` so they are testable without a database,
matching how every other pure module in `src/lib/server/` is tested.

```ts
export function mergeThemes(defaults: Theme[], rows: Theme[]): Theme[];
/** Lookup across the full resolved list, archived included, so old stories resolve. */
export function findTheme(id: string, all: Theme[]): Theme | undefined;
export function slugifyThemeId(labelEn: string): string;
export function sanitizeGoalHint(raw: unknown): string;      // collapse ws, strip ` and " , cap 120
export function validateThemeInput(input: unknown, existingIds: string[]): Ok | Err;

/** The three DELETE outcomes, as a pure decision the endpoint just executes. */
export function decideDelete(
  hasCodeDefault: boolean,
  storyCount: number
): 'reset' | 'hard_delete' | 'refuse';
```

## Keeping `validate.ts` pure

`validate.ts` has no DB access today and must not gain any. So **the resolved
theme list is passed in**:

```ts
// before
export function validateGenerateRequest(body: unknown): Ok | Err
// after
export function validateGenerateRequest(body: unknown, themes: Theme[]): Ok | Err
```

Both call sites — `/api/generate-story` and `/api/admin/generate-story` — resolve
themes first, then validate. `validateGenerateRequest` validates against
**active** themes only, so neither a child nor an operator can generate a new
story under an archived theme. `storyPrompt.ts` is unchanged: it already receives
a whole `Theme` object and reads `goal_hint` off it.

## `goal_hint` safety

`goal_hint` is injected into the story prompt at `storyPrompt.ts:49` and into the
admin template render at `storyPrompt.ts:177`. Two guards, neither new
infrastructure:

1. **`LOCKED_FLOOR`** is appended to every rendered prompt and carries the
   child-safety rules and the JSON output contract. An operator's `goal_hint`
   cannot strip a guardrail or make the output unparseable — this is exactly the
   case that floor was built for.
2. **`sanitizeGoalHint`** gives it the same treatment `sanitizeExtra` gives the
   child's free-text wishes: whitespace collapsed, quote and backtick delimiters
   stripped, capped at 120 characters.

## Admin page `/admin/themes`

Mirrors `/admin/prompts`: same shell, same `hooks.server.ts` gate, no new auth, no
new env var. An admin page, so the 6-screen kid rule is untouched (precedent: the
preview route, approved 2026-09-28).

**Per existing theme:** edit `label_en`, `label_te`, `goal_hint`, `sort_order`;
toggle archived; **Reset to default** on any theme that has a code default (a
DELETE of its row — the button is absent for admin-added themes, which have no
default to fall back to).

**Add a theme:** `label_en`, `label_te`, `goal_hint`, `sort_order`, plus the id.

- The id is **auto-slugged from `label_en`** — lowercased, non-alphanumeric runs
  collapsed to `_`, trimmed of leading and trailing `_`. Shown and editable at
  create time, **read-only afterwards** with a note saying why.
- Collisions rejected against code defaults *and* table rows, **archived
  included** — reusing a retired id would silently adopt that theme's old stories.
- **Delete** is offered only when `countStoriesUsingTheme(id) === 0`. Otherwise the
  control is Archive, with the story count shown as the reason.
- A **soft warning above six active themes**: the kid `/create` screen is
  one-screen-no-wizard and each pair of themes is a row of its 2-column grid. A
  warning, not a cap.

## Endpoints

| Endpoint | Method | Returns |
|---|---|---|
| `/api/themes` | GET | `{ themes: ThemeOption[] }` — active only, no `goal_hint` |
| `/api/admin/themes` | GET | `{ themes: Theme[] }` — all, archived included, with `goal_hint` and a `stories_count` per theme |
| `/api/admin/themes` | POST | upsert one theme; `{ok: true}` or a 4xx with a message |
| `/api/admin/themes` | DELETE | `{id}` — see the three cases below |

`DELETE` has exactly three outcomes, decided server-side so the UI cannot get it
wrong:

1. **The id has a code default** → the row is deleted and the theme reverts to its
   bundled values. Allowed regardless of how many stories use it, because the
   theme still exists and still resolves.
2. **Admin-added id, zero stories** → the row is hard-deleted and the theme is
   gone for good.
3. **Admin-added id, one or more stories** → **rejected** with a 409 and the story
   count. Archiving is the only way to retire it, because deleting the row would
   leave those stories pointing at an id nothing resolves.

`/api/themes` is public and read-only, like `/api/stories`. Withholding
`goal_hint` keeps prompt-shaping text off the wire; the client only ever needs the
labels.

## Client changes

**`ThemePicker.svelte`** takes the theme list as a prop instead of importing
`themes.ts`:

```ts
let { themes, selected = $bindable<ThemeId | null>(null), lang = 'en' }: {
  themes: ThemeOption[];
  selected?: ThemeId | null;
  lang?: Language;
} = $props();
```

Palette fills cycle `colors[i % 4]`, so any number of themes renders. Selected
state stays `border-coral`; everything else about the component's look is
unchanged.

**Kid `/create`** fetches `/api/themes` on mount and passes the list down. It
already requires network to generate, so this adds no new offline failure mode —
but if the fetch fails it falls back to the **bundled active defaults** from
`themes.ts` rather than rendering an empty picker.

**Admin `/create`** does the same, via its existing server load function.

**`/create/generating`** reads `theme` from the query string as a plain string and
sends it on; the server validates it. No client-side enum check to keep in sync.

## Testing

`src/lib/server/themeRules.test.ts` (vitest, the established pattern):

- `mergeThemes`: a row overrides a default's fields; a new id is appended; no row
  leaves the default intact; result is sorted by `sort_order` then `label_en`
- an override can flip a code default's `archived` in both directions
- `activeThemes` excludes archived; `findTheme` finds archived
- `slugifyThemeId`: "Good Habits" → `good_habits`; punctuation, repeated spaces,
  leading/trailing separators, and a label that slugs to empty
- `sanitizeGoalHint`: collapses whitespace, strips `` ` `` `'` `"`, caps at 120
- `validateThemeInput`: rejects a blank label, a missing Telugu label, a blank
  goal hint, a colliding id (including a collision with an archived id), and a
  non-integer `sort_order`
- `decideDelete`: all three outcomes, including the code-default-with-stories case
  resetting rather than refusing

`validate.test.ts` gains: a known active theme passes; an unknown id is rejected;
**an archived id is rejected** for both the kid and admin paths.

Plus `npm run check` and `npm run lint`.

## Files touched

| File | Change |
|---|---|
| `src/lib/data/themes.ts` | 7 seed entries, `archived` + `sort_order` |
| `src/lib/types.ts` | `ThemeId = string`, `Theme` gains 2 fields, new `ThemeOption` |
| `src/lib/server/themeRules.ts` | new — pure merge/slug/sanitise/validate |
| `src/lib/server/themeRules.test.ts` | new |
| `src/lib/server/themes.ts` | new — resolve + DB queries |
| `src/lib/server/validate.ts` | takes the theme list as an argument |
| `src/lib/server/validate.test.ts` | active/unknown/archived cases |
| `src/routes/api/generate-story/+server.ts` | resolve themes, then validate |
| `src/routes/api/admin/generate-story/+server.ts` | same |
| `src/routes/api/themes/+server.ts` | new — public, active, label-only |
| `src/routes/api/admin/themes/+server.ts` | new — GET/POST/DELETE |
| `src/routes/admin/themes/+page.svelte` + `+page.server.ts` | new admin page |
| `src/lib/components/ThemePicker.svelte` | list via props, palette cycles |
| `src/routes/create/+page.svelte` | fetch themes, fall back to bundled |
| `src/routes/admin/create/+page.svelte` | themes from the load function |
| `src/routes/create/generating/+page.svelte` | theme as plain string |
| `scripts/init-db.mjs` | `themes` table |
| `CLAUDE.md` | the rule amendment, the new table, endpoints, `db:init` note |

No new dependency. No new env var.

## Out of scope

Per-theme icon or custom colour (the palette cycles). Per-theme prompt templates —
those stay keyed to age band. Drag-to-reorder (`sort_order` is a number field).
Theme creation or naming by the child. Per-language theme sets. Migrating existing
stories from an archived theme to an active one.
