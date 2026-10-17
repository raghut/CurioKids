# Stories Listing Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add three filters to `/stories` — age band, theme, and not-read-yet — so the child can narrow a growing grid without a new screen, a spinner, or a stored preference.

**Architecture:** All filter rules live in one pure module (`src/lib/data/filterStories.ts`) that both curated and generated stories normalise into, so the rules are unit-testable with no DOM and no DB. Filter state lives in the URL query string, derived on render — one source of truth, session-scoped, nothing in localStorage. Filtering runs client-side over the already-loaded gallery so chip taps need no loading state.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Tailwind 4, vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-17-stories-filters-design.md`

**Depends on:** the admin-managed-themes phase (already on this branch's history). The theme chips read the resolved active list from `GET /api/themes`; they do **not** import `themes.ts` directly, except as the offline fallback.

**Node:** `source ~/.nvm/nvm.sh && nvm use 22.23.1`. Homebrew `node@22` is v23 and breaks the build.

**There is no `npm run lint`.** CLAUDE.md documents `lint` and `format`, but `package.json` has neither and eslint is not installed. `npm run check` is the only static gate. Do not add a dependency.

**Page-level `curl` checks do not work on kid routes.** `src/routes/+layout.svelte:9` starts `showSplash = $state(true)` and only clears it in `onMount`, so server-rendered HTML for `/stories` contains the splash and nothing else. Verify through `npm run check`, `npm test`, `npm run build` and `/api/*`. An empty `curl | grep` of `/stories` is not a failure.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | `StorySummary` gains `theme_id: string \| null` |
| `src/lib/server/db.ts` | `listStories` selects `story->>'theme_id'` |
| `src/lib/data/filterStories.ts` | **new, pure:** the filter rules, the two adapters, and the URL codec |
| `src/lib/data/filterStories.test.ts` | **new:** unit tests for all of the above |
| `src/lib/components/StoryFilters.svelte` | **new:** the chip UI; presentational, knows nothing of stories or the URL |
| `src/routes/stories/+page.svelte` | derives the filter from the URL, fetches themes, applies the filter, new empty state |
| `CLAUDE.md` | the phase-2 folder annotations become real; record the filters |

---

## Task 1: Surface `theme_id` in the gallery list

**Files:**
- Modify: `src/lib/types.ts` (the `StorySummary` type)
- Modify: `src/lib/server/db.ts` (`listStories`)

- [ ] **Step 1: Add the field to `StorySummary`**

In `src/lib/types.ts`, replace:

```ts
export type StorySummary = {
	id: string;
	title: string;
	cover_url: string;
	age_tag: string;
	language: string;
	created_at: string;
};
```

with:

```ts
export type StorySummary = {
	id: string;
	title: string;
	cover_url: string;
	age_tag: string;
	language: string;
	created_at: string;
	/**
	 * Extracted from the JSONB blob for the stories filter chips. Null on a row whose
	 * blob predates theme_id, and on a story whose theme has since been archived —
	 * both simply match no chip.
	 */
	theme_id: string | null;
};
```

- [ ] **Step 2: Select it in `listStories`**

In `src/lib/server/db.ts`, replace the whole `listStories` function:

```ts
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' AND language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' ORDER BY created_at DESC`;
	return rows as StorySummary[];
}
```

with:

```ts
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	// theme_id comes out of the jsonb blob rather than a promoted column — the same
	// extraction listStoriesAdmin uses, so no migration is needed for the filters.
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at, story->>'theme_id' AS theme_id FROM stories WHERE status = 'published' AND language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at, story->>'theme_id' AS theme_id FROM stories WHERE status = 'published' ORDER BY created_at DESC`;
	return rows as StorySummary[];
}
```

- [ ] **Step 3: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run check`
Expected: PASS, 0 errors.

Run: `npm test`
Expected: PASS, 152 tests across 10 files.

Then confirm the field actually arrives over the wire:

```bash
source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run dev > /tmp/ck-f1.log 2>&1 &
# wait for boot, then:
curl -s localhost:5173/api/stories | head -c 600
```
Expected: each story object now carries a `theme_id` key. Its value may be `null` on older rows — that is correct, not a bug. If the gallery is empty (`{"stories":[]}`), say so in your report; the type change is still verified by `npm run check`.

Kill the dev server afterwards (`pkill -f "vite dev"`) and confirm it stopped.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts src/lib/server/db.ts
git commit -m "feat: surface theme_id in the gallery list"
```

---

## Task 2: The pure filter module

**Files:**
- Create: `src/lib/data/filterStories.ts`
- Test: `src/lib/data/filterStories.test.ts`

This is the first test file under `src/lib/data/`; vitest picks up any `*.test.ts` under `src/`, so no config change is needed. Follow the style of `src/lib/server/themeRules.test.ts`.

- [ ] **Step 1: Write the failing tests**

Create `src/lib/data/filterStories.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm test -- filterStories`
Expected: FAIL — cannot resolve the import `./filterStories`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/data/filterStories.ts`:

```ts
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- filterStories`
Expected: PASS, 28 tests.

Run: `npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/data/filterStories.ts src/lib/data/filterStories.test.ts
git commit -m "feat: pure story-filter rules and URL codec"
```

---

## Task 3: The chip component

**Files:**
- Create: `src/lib/components/StoryFilters.svelte`

- [ ] **Step 1: Write the component**

Presentational only: it renders chips and reports the next filter up. It knows nothing about stories, fetching, or the URL. Create `src/lib/components/StoryFilters.svelte`:

```svelte
<script lang="ts">
	import { AGE_BANDS, EMPTY_FILTER, isFilterActive, type StoryFilter } from '$lib/data/filterStories';
	import type { AgeBand, Language, ThemeId, ThemeOption } from '$lib/types';

	let { filter, themes, lang = 'en', onchange }: {
		filter: StoryFilter;
		/** The resolved ACTIVE theme list, passed in — never imported. */
		themes: ThemeOption[];
		lang?: Language;
		onchange: (next: StoryFilter) => void;
	} = $props();

	const te = $derived(lang === 'te');

	// Themes are operator-managed, so cycle the four pastel fills rather than
	// indexing a fixed-length array. Same approach as ThemePicker.
	const themeColors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];

	// Tapping the lit chip clears that dimension — always one obvious way out.
	function pickAge(band: AgeBand) {
		onchange({ ...filter, age: filter.age === band ? null : band });
	}
	function pickTheme(id: ThemeId) {
		onchange({ ...filter, theme: filter.theme === id ? null : id });
	}
	function toggleUnread() {
		onchange({ ...filter, unreadOnly: !filter.unreadOnly });
	}
</script>

<div class="mb-6 space-y-3">
	<div class="flex gap-3">
		{#each AGE_BANDS as band (band)}
			<button
				type="button"
				class="flex-1 rounded-2xl border-2 px-4 text-xl font-bold transition-colors min-h-[64px]
					bg-sky-blue/30
					{filter.age === band ? 'border-coral' : 'border-transparent'}"
				aria-pressed={filter.age === band}
				onclick={() => pickAge(band)}
			>
				{band}
			</button>
		{/each}
	</div>

	{#if themes.length}
		<div class="grid grid-cols-2 gap-3">
			{#each themes as theme, i (theme.id)}
				<button
					type="button"
					class="rounded-2xl border-2 p-4 text-left text-xl font-bold transition-colors min-h-[64px]
						{themeColors[i % themeColors.length]}
						{filter.theme === theme.id ? 'border-coral' : 'border-transparent'}"
					aria-pressed={filter.theme === theme.id}
					onclick={() => pickTheme(theme.id)}
				>
					<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
						{te ? theme.label_te : theme.label_en}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex gap-3">
		<button
			type="button"
			class="flex-1 rounded-2xl border-2 px-4 text-xl font-bold transition-colors min-h-[64px]
				bg-mint/30
				{filter.unreadOnly ? 'border-coral' : 'border-transparent'}"
			aria-pressed={filter.unreadOnly}
			onclick={toggleUnread}
		>
			<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
				{te ? 'ఇంకా చదవలేదు' : 'Not read yet'}
			</span>
		</button>

		{#if isFilterActive(filter)}
			<button
				type="button"
				class="rounded-2xl border-2 border-transparent bg-butter/30 px-5 text-xl font-bold transition-colors min-h-[64px]"
				onclick={() => onchange(EMPTY_FILTER)}
			>
				<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
					{te ? 'అన్నీ' : 'All'}
				</span>
			</button>
		{/if}
	</div>
</div>
```

- [ ] **Step 2: Verify it compiles**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run check`
Expected: PASS, 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/StoryFilters.svelte
git commit -m "feat: story filter chips"
```

---

## Task 4: Wire the stories page

**Files:**
- Modify: `src/routes/stories/+page.svelte` (whole file)

- [ ] **Step 1: Rewrite the page**

Replace the whole of `src/routes/stories/+page.svelte` with:

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStories } from '$lib/data/loadContent';
	import { seedActiveThemes } from '$lib/data/themes';
	import {
		curatedToFilterable,
		filterToParams,
		generatedToFilterable,
		matchesFilter,
		parseFilter,
		type StoryFilter
	} from '$lib/data/filterStories';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import StoryFilters from '$lib/components/StoryFilters.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Story, StorySummary, ThemeOption } from '$lib/types';

	let curated = $state<Story[]>([]);
	let generated = $state<StorySummary[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	// Operator-managed, so fetched. Seeded from the bundled active set so the chips
	// still work offline, where only the gallery's absence is visible anyway.
	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);
	let themesLoaded = false;

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadStories($language).then((s) => (curated = s));
		generatedStories
			.loadGallery($language)
			.then((g) => (generated = g))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	// Independent of the gallery: a failed theme fetch must not hide the stories,
	// and a failed gallery must not hide the chips.
	$effect(() => {
		if (themesLoaded) return;
		themesLoaded = true;
		void (async () => {
			try {
				const res = await fetch('/api/themes');
				if (res.ok) {
					const data = (await res.json()) as { themes: ThemeOption[] };
					themeOptions = data.themes ?? [];
				}
			} catch {
				// Bundled fallback stands.
			}
		})();
	});

	// The URL is the single source of truth for filter state — session-scoped, and
	// it survives reading a story and coming back.
	const filter = $derived(parseFilter($page.url.searchParams));

	function applyFilter(next: StoryFilter) {
		const qs = filterToParams(next).toString();
		// replaceState keeps chip taps out of the back history, so Back from the grid
		// goes home rather than walking back through filter states.
		void goto(qs ? `/stories?${qs}` : '/stories', {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	const visibleCurated = $derived(
		curated.filter((s) => matchesFilter(curatedToFilterable(s), filter, $progress))
	);
	const visibleGenerated = $derived(
		generated.filter((s) => matchesFilter(generatedToFilterable(s), filter, $progress))
	);

	const te = $derived($language === 'te');
	const nothingLoaded = $derived(curated.length === 0 && generated.length === 0);
	const nothingMatched = $derived(visibleCurated.length === 0 && visibleGenerated.length === 0);
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>{te ? 'కథలు' : 'Stories'}</h1>
	</header>

	<StoryFilters {filter} themes={themeOptions} lang={$language ?? 'en'} onchange={applyFilter} />

	<div class="grid grid-cols-2 gap-4">
		{#each visibleCurated as story (story.id)}
			<ContentCard
				title={story.title}
				coverImage={story.cover_image || '📖'}
				href="/stories/{story.id}"
				completed={$progress.includes(story.id)}
			/>
		{/each}

		{#each visibleGenerated as gen (gen.id)}
			<ContentCard
				title={gen.title}
				coverImage={gen.cover_url || '✨'}
				href="/stories/{gen.id}"
				completed={$progress.includes(gen.id)}
				badge="✨"
			/>
		{/each}
	</div>

	<!-- First match wins, so the child never sees "nothing like that" while stories
	     are still arriving. -->
	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథలు వస్తున్నాయి...' : 'Loading stories...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథల కోసం వైఫై కావాలి.' : 'We need wifi to load new stories.'}
		</p>
	{:else if nothingLoaded}
		<p class="text-center text-gray-400 mt-12 text-lg">No stories yet!</p>
	{:else if nothingMatched}
		<div class="mt-12 text-center">
			<p class="text-gray-400 text-lg mb-6" lang={te ? 'te' : undefined}>
				{te ? 'అలాంటి కథలు ఇంకా లేవు' : 'No stories like that yet'}
			</p>
			<button
				type="button"
				class="rounded-2xl bg-butter/50 px-6 text-xl font-bold min-h-[64px]"
				onclick={() => applyFilter({ age: null, theme: null, unreadOnly: false })}
			>
				<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
					{te ? 'అన్ని కథలు చూపించు' : 'Show all stories'}
				</span>
			</button>
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run check`
Expected: PASS, 0 errors, 0 warnings.

Run: `npm test`
Expected: PASS, 180 tests across 11 files (152 + the 28 new).

Run: `npm run build`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/stories/+page.svelte
git commit -m "feat: filters on the stories grid"
```

---

## Task 5: Documentation and final verification

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Turn the phase-2 annotations into fact**

In `CLAUDE.md`, the folder structure carries two placeholder lines from the themes phase. Replace:

```
        StoryFilters.svelte          # phase 2 — not built yet
```
with:
```
        StoryFilters.svelte          # age/theme/unread filter chips for /stories
```

and replace:

```
        filterStories.ts             # phase 2 — not built yet
```
with:
```
        filterStories.ts             # pure story-filter rules + URL codec
```

Then find the two softened references to phase 2 and make them present-tense:

Replace `for the kid create screen (and, in phase 2, the stories filter chips)` with
`for the kid create screen and the stories filter chips`.

Replace `hidden from the pickers (and phase-2 filter chips) but still resolving by id` with
`hidden from the pickers and the filter chips but still resolving by id`.

- [ ] **Step 2: Record the `StorySummary` change**

In the `GeneratedStory` section of `CLAUDE.md`, find the paragraph describing `StorySummary`:

> A lighter `StorySummary` type (id, title, cover_url, age_tag, language, created_at) is used for the gallery list endpoint so the client doesn't have to fetch every full story just to render tiles.

Replace it with:

> A lighter `StorySummary` type (id, title, cover_url, age_tag, language, created_at, theme_id) is used for the gallery list endpoint so the client doesn't have to fetch every full story just to render tiles. `theme_id` is extracted from the JSONB blob (`story->>'theme_id'`) for the filter chips, so it needs no migration; it is `null` on a row that predates it.

- [ ] **Step 3: Full verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm test && npm run check && npm run build`
Expected: all three PASS — 180 tests, 0 errors, successful build.

Then the endpoint checks:

```bash
source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run dev > /tmp/ck-f5.log 2>&1 &
# wait for boot, then:
curl -s localhost:5173/api/stories | head -c 400
curl -s localhost:5173/api/themes
```
Expected: gallery rows each carry a `theme_id` key; `/api/themes` returns the active themes. If the gallery is empty, report that rather than claiming the filter was proven against data.

Kill the dev server (`pkill -f "vite dev"`) and confirm it stopped.

**Do not** attempt a page-level `curl` of `/stories` — the root layout gates it behind a client-only splash, so it proves nothing.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: record the stories filters"
```

---

## Notes for the implementer

- **Nothing goes in localStorage.** Filter state is URL-only, by explicit product decision; preferences and profiles are a later phase. The `progress` store is read for the unread filter but never written by this feature.
- **No gamification.** Do not add counts, "X of Y", badges, streaks, or a results tally to the chips. The project rules forbid it.
- **No new screen.** The filters live inside the existing content-list screen.
- **Chip labels are 20px (`text-xl`), not the 22pt content minimum** — an approved exception, because chips are chrome and Telugu theme labels overflow a 2-column grid at 22pt. Tap targets stay at 64px (`min-h-[64px]`).
- **An archived theme's stories stay in the grid** but are unreachable by a chip. That is the intended meaning of archiving, not a bug to fix.
- **Do not add a sort control, a search box, multi-select, or a character filter.** All explicitly out of scope.
- **Do not add filters to `/facts`.**
