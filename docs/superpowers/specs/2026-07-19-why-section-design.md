# Why? Section (Nature Facts) — Design

_Date: 2026-07-19 · Pillar 2 (nature facts) · Status: approved, ready to plan_

## Goal

Bring the **Why?** section (nature facts, Pillar 2) up to full CLAUDE.md UX-spec parity.
A working scaffold already exists — a facts grid and a section-by-section viewer — but it is
thin: reflection/mission are never shown, section images are ignored, there is no swipe, fonts and
tap targets are undersized, and Telugu rendering is not wired. This design closes those gaps.

**Audio is explicitly deferred** (no audio files exist yet, and recorded-voice-vs-TTS is still an
open decision in CLAUDE.md). No `AudioPlayer`, no autoplay, no play button in this build.

**Content authoring stays out of scope** — Claude Code does not write facts or Telugu content.
This work is rendering/plumbing only; content is authored by Raghu outside the codebase.

## Baseline (what exists today)

- `src/routes/facts/+page.svelte` — 2-column grid of `ContentCard` tiles, per-language load, ✓ when completed.
- `src/routes/facts/[id]/+page.svelte` — section-by-section viewer rendering all four section
  types (`question`, `discovery`, `fun_facts`, `lesson`) inline, with prev/next buttons and Done!.
- `ContentCard.svelte` — shared tile component, also used by the stories grid.
- One fact: `static/content/facts/en/fact-001-ants.json` (+ `index.json`). All image/audio fields empty.
- Neither viewer (facts or stories) has swipe or audio yet — this build pioneers swipe for facts.

## Decisions (resolved during brainstorming)

1. **Goal** — full UX-spec parity, minus audio.
2. **List layout** — vertical single-column list of horizontal row cards (not the 2-col grid).
3. **Card subtitle** — add an **optional** 1-line subtitle; render when present, omit cleanly when absent.
4. **Swipe target** — swipes move between **sections within the fact** (not between different facts).
5. **Closing flow** — a **dedicated closing screen** after the last section: reflection + mission + Done!.
6. **Audio** — deferred entirely.

## 1. Fact list page (`/facts`)

Vertical single-column list of horizontal row cards.

```
┌──────────────────────────────────────┐
│ [🐜]  Why do ants walk in a line?   ✓ │
│       How tiny insects talk           │  ← optional subtitle
├──────────────────────────────────────┤
│ [🐝]  Why do bees make honey?         │
└──────────────────────────────────────┘
```

- New **`FactCard.svelte`** — row layout: ~72px square image/emoji on the left; title +
  optional subtitle on the right; ✓ badge when completed. The whole row is a single link and tap
  target, min 64px tall.
- Image-vs-emoji fallback logic reused from `ContentCard` (render `<img>` when the value starts
  with `/`, `data:`, or `http`; otherwise show the emoji / `topic` glyph).
- **`ContentCard.svelte` is left untouched** — the stories grid still uses it as a tile. Facts get
  their own row component rather than overloading the shared one.
- Empty state ("No facts yet!") preserved.

## 2. Fact viewer (`/facts/[id]`)

Section-by-section, one screen at a time, navigable by **swipe** (left = next, right = prev) **and**
the existing arrow buttons.

- **Step model:** `steps = sections.length + 1`. Indices `0 … sections.length-1` are section
  screens; the final index (`sections.length`) is the closing screen.
- **Section screens** render via a new **`SectionRenderer.svelte`** (extracted from the current
  inline markup, matching CLAUDE.md's folder structure):
  - `question` / `discovery` → section `image` **above** the text when non-empty; text-only otherwise.
  - `fun_facts` → bulleted list. `lesson` → italic line. (Neither has an image field.)
- **Closing screen** (dedicated, reached by swiping past the last section):
  - "Think about it 💭" — `reflection_question`.
  - "Try this! 🌿" — `real_world_mission` (the off-screen, anti-screen-time payoff, given prominence).
  - Big **Done!** button — marks the fact complete (`progress.markComplete`) and returns to `/facts`.
- **Progress counter** shows `1/4 … 4/4` on section screens; the closing screen shows no counter.
- **Not-found state:** add a friendly "can't find that fact" screen (the viewer currently only
  ever shows "Loading…", the same gap the story viewer already fixed). Small robustness win.

### Swipe

- Implemented as a small reusable Svelte action: **`src/lib/actions/swipe.ts`** (new `actions/`
  folder). Touch/pointer based, ~50px horizontal threshold, calls `onLeft` / `onRight` callbacks.
- **No new dependency** (honors CLAUDE.md). Stories can reuse the action later.

## 3. Schema, Telugu, sizing

- **Schema change (the one change to the locked content schema):** add optional
  `subtitle?: string` to the `Fact` type in `src/lib/types.ts`. Optional so `fact-001` and every
  existing file keep working untouched; a subtitle is authored only when a title needs a helper
  line. Update the `Fact` schema block in CLAUDE.md's "Content schema" section to match.
- **Telugu:** `lang="te"` on all text containers (list + viewer) and line-height 1.6 (Tailwind
  `leading-*`), per CLAUDE.md's Telugu rules. Rendering support only — no `te/` content authored here.
- **Sizing / a11y:** content text ≥22px (Tailwind `text-2xl`); nav and Done buttons ≥64×64px tap
  targets. Palette stays butter/mint/peach/sky-blue; lucide icons at stroke width 1.5.

## Components & files

| File | Change |
|---|---|
| `src/lib/components/FactCard.svelte` | **new** — horizontal row card for the facts list |
| `src/lib/components/SectionRenderer.svelte` | **new** — renders one `FactSection` (image-above-text) |
| `src/lib/actions/swipe.ts` | **new** — reusable left/right swipe action |
| `src/routes/facts/+page.svelte` | vertical `FactCard` list; Telugu attrs |
| `src/routes/facts/[id]/+page.svelte` | swipe + closing screen + not-found state + sizing; use `SectionRenderer` |
| `src/lib/data/loadContent.ts` | fix `loadFact` to resolve by id from `index.json` (bug fix — see below) |
| `src/lib/types.ts` | add optional `Fact.subtitle` |
| `CLAUDE.md` | reflect the `subtitle?` schema addition |

**Load bug (discovered while planning):** `loadFact('fact-001', …)` fetches
`/content/facts/en/fact-001.json`, but the file is `fact-001-ants.json` (per CLAUDE.md's naming
convention), so it 404s and the viewer shows "Loading…" forever — tapping any fact is currently
dead. Fix: `index.json` already holds the full fact objects, so `loadFact` resolves by id from
there and drops the filename coupling. (The curated story loader has the identical bug; stories
stay out of scope here.)

**Untouched (out of scope):** `ContentCard.svelte`, the stories viewer, any audio component, all
fact/Telugu content files.

## Data flow

`/facts` → `loadFacts(language)` → `Fact[]` → one `FactCard` per fact.
Tap a card → `/facts/[id]` → `loadFact(id, language)` → `Fact` → step index walks
sections (via `SectionRenderer`) then the closing screen → Done marks complete and returns.
`progress` (localStorage) supplies the ✓ state, exactly as today.

## Edge cases

- Fact with empty section `image` → text-only section (verified against current `fact-001`).
- Fact with a populated section `image` → image renders above text.
- Fact without `subtitle` → card shows title only, no empty gap.
- Unknown/missing fact id → friendly not-found screen (not an infinite "Loading…").
- Swipe past the last section → closing screen; swipe back returns to the last section.
- Telugu content → correct `lang` attribute and 1.6 line height.

## Verification

No server-side logic changes, so no new vitest cases. Gate on:

1. **`npm run check`** — svelte-check + tsc, 0 errors / 0 warnings.
2. **Browser drive** (verify skill): list → tap card → swipe through sections (image + text) →
   closing screen (reflection + mission) → Done → confirm ✓ appears on the list. Exercise both a
   fact *with* a section image and the image-less `fact-001` to confirm graceful degradation.

## Out of scope

- Audio / `AudioPlayer` / autoplay (deferred until files exist and recorded-vs-TTS is decided).
- Authoring any fact or Telugu content.
- Changes to the stories viewer or `ContentCard`.
- Between-fact swiping (swipe stays within a single fact's sections).
