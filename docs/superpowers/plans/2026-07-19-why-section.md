# Why? Section (Nature Facts) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bring the Why? section (nature facts) to full UX-spec parity — vertical card list, image-above-text sections, swipe navigation, a dedicated reflection/mission closing screen, Telugu rendering, and larger fonts/tap targets — audio deferred.

**Architecture:** Pure client-side SvelteKit. Facts are bundled JSON read via `loadContent.ts` (no DB, no API). New presentational components (`FactCard`, `SectionRenderer`) and a reusable `swipe` action; the facts list and viewer routes are rewired to use them. One optional field (`subtitle`) is added to the `Fact` type.

**Tech Stack:** Svelte 5 (runes), SvelteKit, Tailwind v4, lucide-svelte, vitest (for the one pure helper).

**Design spec:** `docs/superpowers/specs/2026-07-19-why-section-design.md`

**Setup note:** run all npm commands with the nvm Node 22 on PATH:
`export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` (homebrew node@22 is now v23 and fails engine-strict).

---

## Task 1: Add optional `subtitle` to the Fact type

**Files:**
- Modify: `src/lib/types.ts:9-21`
- Modify: `CLAUDE.md` (Fact JSON schema block)

- [ ] **Step 1: Add the optional field to the `Fact` type**

In `src/lib/types.ts`, add `subtitle?: string;` right after the `title` line:

```ts
export type Fact = {
	id: string;
	type: 'nature_fact';
	language: Language;
	topic: string;
	age_range: '5-8';
	title: string;
	subtitle?: string; // optional 1-line card description
	cover_image: string;
	audio: string;
	sections: FactSection[];
	reflection_question: string;
	real_world_mission: string;
};
```

- [ ] **Step 2: Reflect the schema addition in CLAUDE.md**

In `CLAUDE.md`, find the `### Fact JSON` `type Fact = { ... }` block and add the same line after `title: string;`:

```ts
  title: string;
  subtitle?: string;               // optional 1-line card description
  cover_image: string;             // path relative to /static
```

- [ ] **Step 3: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 4: Commit**

```bash
git add src/lib/types.ts CLAUDE.md
git commit -m "feat: add optional subtitle field to Fact type"
```

---

## Task 2: Reusable swipe action (TDD the pure helper)

**Files:**
- Create: `src/lib/actions/swipe.ts`
- Test: `src/lib/actions/swipe.test.ts`

The action wraps a pure decision helper `resolveSwipe(dx, dy, threshold)` so the swipe logic is unit-testable without a DOM. `left` = finger moved right→left (dx negative) = "next"; `right` = "previous".

- [ ] **Step 1: Write the failing test**

Create `src/lib/actions/swipe.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { resolveSwipe } from './swipe';

describe('resolveSwipe', () => {
	it('returns null when horizontal movement is below the threshold', () => {
		expect(resolveSwipe(30, 0, 50)).toBe(null);
	});

	it('returns "left" for a leftward swipe past the threshold', () => {
		expect(resolveSwipe(-80, 10, 50)).toBe('left');
	});

	it('returns "right" for a rightward swipe past the threshold', () => {
		expect(resolveSwipe(80, 10, 50)).toBe('right');
	});

	it('returns null when vertical movement dominates (a scroll, not a swipe)', () => {
		expect(resolveSwipe(-60, 90, 50)).toBe(null);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- swipe`
Expected: FAIL — cannot find module `./swipe` / `resolveSwipe is not a function`.

- [ ] **Step 3: Implement the action + helper**

Create `src/lib/actions/swipe.ts`:

```ts
export type SwipeDirection = 'left' | 'right' | null;

/**
 * Pure decision: given the horizontal (dx) and vertical (dy) deltas of a drag,
 * return 'left', 'right', or null. A horizontal swipe must exceed `threshold`
 * pixels AND dominate the vertical movement (so vertical scrolls are ignored).
 */
export function resolveSwipe(dx: number, dy: number, threshold = 50): SwipeDirection {
	if (Math.abs(dx) < threshold) return null;
	if (Math.abs(dx) <= Math.abs(dy)) return null;
	return dx < 0 ? 'left' : 'right';
}

export type SwipeOptions = {
	onLeft?: () => void;
	onRight?: () => void;
	threshold?: number;
};

/** Svelte action: fires onLeft/onRight on a horizontal touch or pointer swipe. */
export function swipe(node: HTMLElement, options: SwipeOptions = {}) {
	let opts = options;
	let startX = 0;
	let startY = 0;
	let tracking = false;

	function down(e: PointerEvent) {
		tracking = true;
		startX = e.clientX;
		startY = e.clientY;
	}

	function up(e: PointerEvent) {
		if (!tracking) return;
		tracking = false;
		const dir = resolveSwipe(e.clientX - startX, e.clientY - startY, opts.threshold ?? 50);
		if (dir === 'left') opts.onLeft?.();
		else if (dir === 'right') opts.onRight?.();
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);

	return {
		update(newOptions: SwipeOptions) {
			opts = newOptions;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
		}
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- swipe`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/swipe.ts src/lib/actions/swipe.test.ts
git commit -m "feat: reusable swipe action with unit-tested decision helper"
```

---

## Task 3: Fix `loadFact` so facts actually load (bug fix)

**Files:**
- Modify: `src/lib/data/loadContent.ts:9-13`

**Why:** `loadFact('fact-001', 'en')` currently fetches `/content/facts/en/fact-001.json`, but the
file is `fact-001-ants.json` (CLAUDE.md's `fact-001-ants.json` naming convention). It 404s → the
viewer never loads → infinite "Loading…". `index.json` already holds the full fact objects, so
resolve by id from there and drop the filename coupling. (The curated story loader has the same
bug; stories are out of scope for this plan.)

- [ ] **Step 1: Rewrite `loadFact` to resolve from the index**

Replace the body of `loadFact` in `src/lib/data/loadContent.ts`:

```ts
export async function loadFact(id: string, language: Language): Promise<Fact | null> {
	const facts = await loadFacts(language);
	return facts.find((f) => f.id === id) ?? null;
}
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/loadContent.ts
git commit -m "fix: load facts by id from index.json (was 404-ing on suffixed filenames)"
```

---

## Task 4: `SectionRenderer` component

**Files:**
- Create: `src/lib/components/SectionRenderer.svelte`

Renders one `FactSection`: image-above-text for `question`/`discovery` (when the section has a
non-empty `image`), a bullet list for `fun_facts`, an italic line for `lesson`. ≥22px text
(`text-2xl`), Telugu-aware (`lang="te"` + 1.6 line height).

- [ ] **Step 1: Create the component**

Create `src/lib/components/SectionRenderer.svelte`:

```svelte
<script lang="ts">
	import type { FactSection, Language } from '$lib/types';

	let { section, language }: { section: FactSection; language: Language } = $props();

	const te = $derived(language === 'te');
	const lead = $derived(te ? 'leading-[1.6]' : 'leading-relaxed');
</script>

<div class="flex flex-col items-center gap-5">
	{#if (section.type === 'question' || section.type === 'discovery') && section.image}
		<img src={section.image} alt="" class="w-full max-w-sm rounded-2xl object-cover" />
	{/if}

	{#if section.type === 'question'}
		<p class="text-2xl font-bold text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{:else if section.type === 'discovery'}
		<p class="text-2xl text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{:else if section.type === 'fun_facts'}
		<ul class="space-y-3 self-stretch">
			{#each section.items as item}
				<li class="text-2xl {lead}" lang={te ? 'te' : undefined}>• {item}</li>
			{/each}
		</ul>
	{:else if section.type === 'lesson'}
		<p class="text-2xl italic text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{/if}
</div>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/SectionRenderer.svelte
git commit -m "feat: SectionRenderer component for fact sections"
```

---

## Task 5: `FactCard` component

**Files:**
- Create: `src/lib/components/FactCard.svelte`

Horizontal row card for the facts list: ~72px image/emoji on the left, title + optional subtitle
on the right, ✓ when completed. Whole row is a link, min 64px tall.

- [ ] **Step 1: Create the component**

Create `src/lib/components/FactCard.svelte`:

```svelte
<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { Language } from '$lib/types';

	let {
		title,
		subtitle = '',
		coverImage,
		href,
		completed = false,
		language = 'en'
	}: {
		title: string;
		subtitle?: string;
		coverImage: string;
		href: string;
		completed?: boolean;
		language?: Language;
	} = $props();

	const te = $derived(language === 'te');
	const isImage = $derived(
		coverImage.startsWith('/') || coverImage.startsWith('data:') || coverImage.startsWith('http')
	);
</script>

<a
	{href}
	class="flex items-center gap-4 min-h-[64px] p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow"
>
	<div
		class="w-[72px] h-[72px] shrink-0 rounded-xl bg-butter/30 flex items-center justify-center text-3xl overflow-hidden"
	>
		{#if isImage}
			<img src={coverImage} alt="" class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		<p class="text-2xl font-bold leading-tight {te ? 'leading-[1.6]' : ''}" lang={te ? 'te' : undefined}>
			{title}
		</p>
		{#if subtitle}
			<p class="text-base text-gray-500 truncate" lang={te ? 'te' : undefined}>{subtitle}</p>
		{/if}
	</div>

	{#if completed}
		<div class="shrink-0 bg-mint rounded-full p-1">
			<Check size={20} strokeWidth={2.5} class="text-green-700" />
		</div>
	{/if}
</a>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/FactCard.svelte
git commit -m "feat: FactCard row component for the facts list"
```

---

## Task 6: Rewire the facts list page to a vertical FactCard list

**Files:**
- Modify: `src/routes/facts/+page.svelte`

- [ ] **Step 1: Replace the grid with a vertical FactCard list**

Overwrite `src/routes/facts/+page.svelte`:

```svelte
<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFacts } from '$lib/data/loadContent';
	import FactCard from '$lib/components/FactCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let facts = $state<Fact[]>([]);

	$effect(() => {
		if ($language) {
			loadFacts($language).then((f) => (facts = f));
		}
	});

	const te = $derived($language === 'te');
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a
			href="/"
			class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Back"
		>
			<ArrowLeft size={28} strokeWidth={1.5} />
		</a>
		<h1 class="text-3xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'ఎందుకు?' : 'Why?'}
		</h1>
	</header>

	{#if facts.length === 0}
		<p class="text-center text-gray-400 mt-12 text-xl">No facts yet!</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each facts as fact}
				<FactCard
					title={fact.title}
					subtitle={fact.subtitle ?? ''}
					coverImage={fact.cover_image || '🌿'}
					href="/facts/{fact.id}"
					completed={$progress.includes(fact.id)}
					language={$language ?? 'en'}
				/>
			{/each}
		</div>
	{/if}
</div>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/routes/facts/+page.svelte
git commit -m "feat: facts list as a vertical FactCard list"
```

---

## Task 7: Rewire the fact viewer (sections + closing screen + swipe + not-found)

**Files:**
- Modify: `src/routes/facts/[id]/+page.svelte`

Step model: `stepCount = sections.length + 1`. Steps `0 … n-1` are section screens (via
`SectionRenderer`); the final step is the dedicated closing screen (reflection + mission + Done!).
Swipe left = next, right = prev. Not-found shows a friendly screen instead of infinite "Loading…".
Chrome labels ("Think about it", "Try this!", "Done!") stay English in this build — see the Telugu
note at the end of the plan.

- [ ] **Step 1: Overwrite the viewer**

Overwrite `src/routes/facts/[id]/+page.svelte`:

```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFact } from '$lib/data/loadContent';
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import { swipe } from '$lib/actions/swipe';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let fact = $state<Fact | null>(null);
	let notFound = $state(false);
	let stepIndex = $state(0);

	$effect(() => {
		const id = $page.params.id;
		if ($language && id) {
			fact = null;
			notFound = false;
			stepIndex = 0;
			loadFact(id, $language).then((f) => {
				fact = f;
				notFound = f === null;
			});
		}
	});

	// One step per section, plus a final closing screen.
	const stepCount = $derived(fact ? fact.sections.length + 1 : 0);
	const onClosing = $derived(fact ? stepIndex === fact.sections.length : false);
	const section = $derived(fact && !onClosing ? fact.sections[stepIndex] : null);

	const te = $derived($language === 'te');
	const lead = $derived(te ? 'leading-[1.6]' : 'leading-relaxed');

	function next() {
		if (fact && stepIndex < stepCount - 1) stepIndex++;
	}
	function prev() {
		if (stepIndex > 0) stepIndex--;
	}
	function done() {
		if (fact) progress.markComplete(fact.id);
		goto('/facts');
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex justify-end mb-4">
		<a
			href="/facts"
			class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Close"
		>
			<X size={28} strokeWidth={1.5} />
		</a>
	</header>

	{#if fact}
		<h2 class="text-3xl font-bold mb-4" lang={te ? 'te' : undefined}>{fact.title}</h2>

		<div class="flex-1 flex flex-col justify-center" use:swipe={{ onLeft: next, onRight: prev }}>
			{#if onClosing}
				<div class="flex flex-col gap-4">
					<div class="bg-sky-blue/20 rounded-2xl p-6 text-center">
						<p class="text-xl font-bold mb-2">Think about it 💭</p>
						<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{fact.reflection_question}</p>
					</div>
					<div class="bg-mint/20 rounded-2xl p-6 text-center">
						<p class="text-xl font-bold mb-2">Try this! 🌿</p>
						<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{fact.real_world_mission}</p>
					</div>
				</div>
			{:else if section}
				<div class="bg-butter/20 rounded-2xl p-6 min-h-[220px] flex flex-col justify-center">
					<SectionRenderer {section} language={$language ?? 'en'} />
				</div>
			{/if}
		</div>

		<div class="flex items-center justify-between mt-6">
			<button
				onclick={prev}
				disabled={stepIndex === 0}
				class="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Previous"
			>
				<ChevronLeft size={32} />
			</button>

			{#if onClosing}
				<button onclick={done} class="px-8 py-4 rounded-full bg-mint font-bold text-xl min-h-[64px]">
					Done!
				</button>
			{:else}
				<span class="text-lg text-gray-400">{stepIndex + 1} / {fact.sections.length}</span>
			{/if}

			<button
				onclick={next}
				disabled={onClosing}
				class="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Next"
			>
				<ChevronRight size={32} />
			</button>
		</div>
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-2xl font-bold mb-6">Hmm, we can't find that fact.</p>
			<a
				href="/facts"
				class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold min-h-[64px] flex items-center"
			>
				Back to Why?
			</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12 text-xl">Loading...</p>
	{/if}
</div>
```

- [ ] **Step 2: Type-check**

Run: `npm run check`
Expected: 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/routes/facts/[id]/+page.svelte
git commit -m "feat: fact viewer with swipe, closing screen, and not-found state"
```

---

## Task 8: Full verification (quality gates + browser drive)

**Files:** none (verification only).

- [ ] **Step 1: Run the full check + test suite**

Run: `npm run check && npm test`
Expected: check → 0 errors / 0 warnings; test → all suites pass (existing 21 + the 4 new swipe tests = 25).

- [ ] **Step 2: Drive the flow in a browser**

Start dev (`npm run dev`) and, using the verify/claude-in-chrome skill:
1. Home → tap "Why?" → confirm the vertical FactCard list renders (ant fact card visible).
2. Tap the ant card → confirm the first section renders as **image-above-text** (or text-only, since `fact-001` has empty images) at ≥22px — no infinite "Loading…" (this is the bug fixed in Task 3).
3. Swipe left through all sections; confirm the counter advances `1/4 … 4/4` and swipe right goes back.
4. Swipe past the last section → confirm the closing screen shows **Think about it** (reflection) + **Try this!** (mission) + **Done!**.
5. Tap **Done!** → confirm return to the list and a ✓ badge on the ant card.
6. Manually visit `/facts/does-not-exist` → confirm the friendly "can't find that fact" screen (not infinite Loading).

- [ ] **Step 3: Confirm nothing else regressed**

Verify the stories grid still renders (it uses the untouched `ContentCard`): Home → Stories → grid loads.

---

## Self-review notes

- **Spec coverage:** vertical list (T5–6), optional subtitle (T1, T5–6), section images + SectionRenderer (T4, T7), swipe within sections (T2, T7), dedicated closing screen (T7), Telugu rendering attrs + 1.6 line height (T4–7), ≥22px fonts + ≥64px tap targets (T4–7), not-found state (T7), `ContentCard`/stories untouched (verified in T8). Plus the required `loadFact` fix (T3) that makes any of it testable.
- **Telugu UI-label follow-up (out of this build):** the three new chrome strings — "Think about it", "Try this!", "Done!" — render in English for now, matching the existing viewer's English "Done!". Fact content (title, sections, reflection, mission) renders in the JSON's language with correct `lang`/line-height. Localizing those three labels is a trivial follow-up once Raghu supplies the preferred Telugu wording (avoids guessing translations).
- **Content untouched:** no fact JSON or Telugu content is authored or edited. `fact-001-ants.json` is left in place (now unused, since `loadFact` reads `index.json`); slimming/renaming content files is Raghu's call.
