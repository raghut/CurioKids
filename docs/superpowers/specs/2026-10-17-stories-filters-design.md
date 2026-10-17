# Stories listing filters — design

**Date:** 2026-10-17
**Status:** approved
**Screen touched:** `/stories` (existing kid screen — no new screen)
**Depends on:** `2026-10-17-admin-managed-themes-design.md` — build that first.
Themes became operator-managed data on 2026-10-17, so the theme chips read the
resolved active list rather than a compiled-in enum. See "Theme chips" below.

## Goal

The stories grid is a flat list that only grows. Give the child three ways to narrow
it — by age band, by theme, and to "not read yet" — without adding a screen, a
spinner, a stored preference, or anything a parent would have to undo.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Filter dimensions | age band, theme, not-read-yet | Agreed scope. Character filter and curated-vs-generated are out. |
| Age brackets | the existing three (`2-4`, `5-6`, `7-8`) — no new brackets | The bands already drive real content differences (all 12 prompt templates are keyed to them; `2-4` is a 6-page board book). A fourth bracket means 4 more templates, and any kid-facing bracket that isn't one of the three needs a mapping layer that will drift from the content. |
| Legacy `5-8` rows | match **both** the `5-6` and `7-8` chips | Every kid-generated story gets `age_tag: '5-8'` (the `assembleStory.ts` default and the DB default), as does every curated story (`age_range` is locked to `'5-8'`). A compatibility rule keeps them visible with no SQL backfill and nothing destructive. |
| Selection model | single-select per dimension, tap again to clear | A child alone must always have one obvious way out of a filter state. Multi-select produces half-lit rows that are hard to reason about at 7. |
| Persistence | URL query params, session only | Survives reading a story and returning; resets on fresh entry from home. Avoids widening the localStorage rule, and avoids a child being stuck in a sticky filter nobody set. Preferences and profiles are a later phase. |
| Where filtering runs | client-side, over the already-loaded list | Chip taps are instant with no loading state (CLAUDE.md forbids spinners for loaded content; a server round-trip per tap would add one). Curated and generated stories go through one code path instead of SQL for one and JS for the other. The 20/day cap keeps the list small enough for this to hold. |
| Theme data | extracted from JSONB in the list query | No schema change, no `db:init` re-run, no backfill. Same pattern `listStoriesAdmin` already uses. |

## Scope rules this respects

- No new screen — the filters live inside the existing content-list screen.
- Nothing new in localStorage.
- No gamification: no counts, badges, streaks, or "X of Y read" readouts on the chips.
- No sort, no search box, no infinite scroll.
- No change to the kid `/create` flow (an age picker there is a later revisit).

## Backend change

One line in `src/lib/server/db.ts`:

```ts
export async function listStories(language?: string): Promise<StorySummary[]> {
  const q = sql();
  const rows = language
    ? await q`SELECT id, title, cover_url, age_tag, language, created_at,
                     story->>'theme_id' AS theme_id
              FROM stories WHERE status = 'published' AND language = ${language}
              ORDER BY created_at DESC`
    : await q`SELECT id, title, cover_url, age_tag, language, created_at,
                     story->>'theme_id' AS theme_id
              FROM stories WHERE status = 'published'
              ORDER BY created_at DESC`;
  return rows as StorySummary[];
}
```

And `StorySummary` in `src/lib/types.ts` gains:

```ts
theme_id: string | null;   // from the JSONB blob; null on rows that predate it
```

`age_tag` is already a promoted, indexed column. `/api/stories` and
`/api/stories/[id]` are otherwise untouched — the endpoint takes no filter
params, because filtering is client-side.

## New module: `src/lib/data/filterStories.ts`

Pure. No Svelte, no fetch, no DOM. This is where every filter rule lives, so the
rules are testable without rendering anything.

```ts
import type { AgeBand, Language, Story, StorySummary, ThemeId } from '$lib/types';

export const AGE_BANDS: AgeBand[] = ['2-4', '5-6', '7-8'];

/** The age_tag written by the kid flow and carried by curated stories. Spans 5-6 and 7-8. */
const LEGACY_SPAN = '5-8';

export type StoryFilter = {
  age: AgeBand | null;
  theme: ThemeId | null;
  unreadOnly: boolean;
};

export const EMPTY_FILTER: StoryFilter = { age: null, theme: null, unreadOnly: false };

/** The shape curated and generated stories normalise to so one predicate serves both. */
export type FilterableStory = {
  id: string;
  ageTag: string;          // '2-4' | '5-6' | '7-8' | '5-8' | anything else
  themeId: string | null;
};

export function generatedToFilterable(s: StorySummary): FilterableStory;
export function curatedToFilterable(s: Story): FilterableStory;

export function isFilterActive(f: StoryFilter): boolean;
export function matchesFilter(s: FilterableStory, f: StoryFilter, completedIds: string[]): boolean;

/**
 * URL -> filter. An unknown `age` or `unread` value is dropped, so a mistyped URL
 * shows everything. `theme` is NOT validated here — theme ids are operator-managed
 * data, not a compile-time enum, and this module stays pure with no theme list to
 * check against. An unknown theme id simply matches no story, which the
 * nothing-matched state already handles gracefully.
 */
export function parseFilter(params: URLSearchParams): StoryFilter;

/** filter -> URL. Omits nulls and false, so a cleared filter yields an empty query string. */
export function filterToParams(f: StoryFilter): URLSearchParams;
```

### Match rules

**Age** — `null` matches everything. Otherwise the story matches when its `ageTag`
equals the chip, **or** when its `ageTag` is `'5-8'` and the chip is `5-6` or
`7-8`. A `'5-8'` story never matches the `2-4` chip.

**Theme** — `null` matches everything. Otherwise `themeId` must equal the chip
exactly. A story whose theme is null, or is an id no active theme has, matches no
theme chip: it is visible unfiltered and absent while a theme chip is lit. Never
an error. **This is what an archived theme looks like** — its stories stay in the
grid and stay readable, they just aren't reachable by a chip, which is exactly the
intent of archiving.

**Not read yet** — `false` matches everything. Otherwise the story's `id` must be
absent from the `progress` store's completed-id list.

The three combine with AND.

### Normalisation

| | `ageTag` from | `themeId` from |
|---|---|---|
| generated (`StorySummary`) | `age_tag` | `theme_id` |
| curated (`Story`) | `age_range` (locked `'5-8'`) | `theme` |

**Curated-content convention to document in CLAUDE.md:** author curated story JSON
with `theme` set to an **active theme id** (as listed on `/admin/themes`) for it to
be reachable by a theme chip. `theme` stays a free `string` in the `Story` type —
this is a convention, not a schema change.

### URL contract

| Param | Values | Omitted when |
|---|---|---|
| `age` | `2-4` \| `5-6` \| `7-8` | no age selected |
| `theme` | any theme id | no theme selected |
| `unread` | `1` | toggle off |

Example: `/stories?age=7-8&theme=be_brave&unread=1`. A cleared filter is plain
`/stories`.

## New component: `src/lib/components/StoryFilters.svelte`

Presentational. Renders chips, reports the new filter up. Knows nothing about
stories, fetching, or the URL.

```ts
let { filter, themes, lang, onchange }: {
  filter: StoryFilter;
  themes: ThemeOption[];        // the resolved ACTIVE list, passed in
  lang: Language;
  onchange: (next: StoryFilter) => void;
} = $props();
```

The theme list is a prop, not an import — same shape as `ThemePicker.svelte` after
the themes phase. The component renders however many it is given.

### Layout

```
  ┌─────────────────────────────────────┐
  │  ←   Stories                        │
  │                                     │
  │  ( 2-4 )  ( 5-6 )  ( 7-8 )          │   age — one row
  │                                     │
  │  ( Sharing   ) ( Friendship     )   │   theme — 2 cols,
  │  ( Brave     ) ( Good Habits    )   │   as many rows as needed
  │                                     │
  │  ( ○ Not read yet )     [ Show all ]│   toggle + clear
  │                                     │
  │  ┌────────┐  ┌────────┐             │
  │  │ cover  │  │ cover  │             │
  └─────────────────────────────────────┘
```

- **Age:** three chips, one row. Numerals — identical in both languages.
- **Theme:** a 2-column grid reusing `ThemePicker.svelte`'s existing look — the
  pastel fills cycling `colors[i % 4]` (`bg-peach/30`, `bg-sky-blue/30`,
  `bg-mint/30`, `bg-butter/30`) with `border-coral` when selected,
  `border-transparent` otherwise. Two columns rather than four because long labels
  in either language do not fit four-across on a phone; the row count follows the
  number of active themes. Labels come from the passed list (`label_en` /
  `label_te`).
- **Not read yet:** one wide chip, same selected affordance.
- **Show all:** rendered only when `isFilterActive(filter)`. Clears everything.
- Every chip `min-h-16` (64px tap-target rule). Labels `text-xl` (20px) —
  **approved exception** to the 22pt content-screen minimum, because chips are
  chrome, not content, and at 22pt the Telugu theme labels overflow a 2-column grid.
- Telugu chips carry `lang="te"` and `leading-relaxed` for the 1.6 line-height rule.
- Transitions are colour-only (`transition-colors`), matching the existing pickers.
  No bounce, no pop.

### Telugu strings

| English | Telugu |
|---|---|
| Not read yet | ఇంకా చదవలేదు |
| No stories like that yet | అలాంటి కథలు ఇంకా లేవు |
| Show all stories | అన్ని కథలు చూపించు |

Theme and age labels need no new strings.

## Page wiring: `src/routes/stories/+page.svelte`

The page's fetching is unchanged. It additionally:

1. Derives the filter from the URL — one source of truth, no duplicated state:
   ```ts
   import { page } from '$app/stores';     // repo convention; not $app/state
   const filter = $derived(parseFilter($page.url.searchParams));
   ```
2. On a chip change, writes the URL:
   ```ts
   goto(`/stories?${filterToParams(next)}`, {
     replaceState: true, noScroll: true, keepFocus: true
   });
   ```
   `replaceState` keeps chip taps out of the back-button history, so Back from the
   grid returns home rather than walking back through filter states.
3. Filters both arrays through `matchesFilter` before rendering, leaving the
   curated-then-generated order and the `✨` badge exactly as they are.

### Theme chips

The page fetches `/api/themes` alongside the gallery and passes the active list to
`StoryFilters`. Three consequences worth stating:

- **The two fetches are independent.** A failed theme fetch does not hide the
  stories, and a failed gallery fetch does not hide the chips.
- **Offline, the theme row falls back to the bundled active defaults** from
  `themes.ts`, matching what kid `/create` does. The chips stay usable; only
  admin-added themes are missing, and a story under one of those wouldn't have
  loaded anyway.
- **Zero active themes renders no theme row at all** — not an empty grid. Age and
  not-read-yet still work.

## Nothing-matched state

When a filter is active and both filtered lists are empty: the line "No stories
like that yet" / "అలాంటి కథలు ఇంకా లేవు" plus a large **Show all stories** button
that clears the filter. A child who filters into an empty grid must be able to get
out alone — this button is the reason single-select beat multi-select.

This is distinct from the three states the page already has, which are unchanged:
loading, gallery-fetch-failed ("We need wifi to load new stories"), and genuinely
no stories at all.

**State precedence** (first match wins), so the child never sees "no stories like
that" while stories are still arriving:

1. `loading` → the existing loading line
2. gallery fetch failed → the existing wifi line
3. nothing loaded at all → the existing "No stories yet!"
4. something loaded but the filter matches none of it → the new empty state

## Offline behaviour

Unchanged. Filters render over whatever did load. If the gallery fetch fails, the
existing wifi message still shows and any curated stories remain filterable.

## Testing

`src/lib/data/filterStories.test.ts` (vitest — the pattern every pure module in
`src/lib/server/` already follows):

- each dimension alone, and all three combined (AND)
- the `5-8` dual-match rule: matches `5-6` and `7-8`, does **not** match `2-4`
- a real band matches only its own chip
- `themeId: null` and an unknown theme string: visible unfiltered, hidden when a
  theme chip is lit
- unread excludes completed ids and keeps unknown ids
- `parseFilter` drops an unknown `age` and an unknown `unread`, and **keeps** an
  arbitrary `theme` string (theme ids are data, not an enum — see `parseFilter`)
- `parseFilter(filterToParams(f))` round-trips every filter, including `EMPTY_FILTER`
- `filterToParams(EMPTY_FILTER)` is empty
- `isFilterActive` false only for `EMPTY_FILTER`
- both adapters map their source shape correctly

Plus `npm run check` and `npm run lint`.

## Files touched

| File | Change |
|---|---|
| `src/lib/server/db.ts` | `listStories` selects `story->>'theme_id'` |
| `src/lib/types.ts` | `StorySummary.theme_id: string \| null` |
| `src/lib/data/filterStories.ts` | new — all filter rules + URL codec |
| `src/lib/data/filterStories.test.ts` | new — unit tests |
| `src/lib/components/StoryFilters.svelte` | new — chip UI |
| `src/routes/stories/+page.svelte` | reads URL filter, fetches themes, applies it, empty state |
| `CLAUDE.md` | curated `theme` convention; note the filters on `/stories` |

No migration. No new dependency. No env var. `/api/themes` and the active-theme
fallback both come from the themes phase, which lands first.

## Out of scope

Filters on `/facts`; sort; search; multi-select; character filter; saved filter
preferences; an age picker on kid `/create`; migrating the `5-8` rows to real
bands. All later phases.
