# CurioKids — Admin Dashboard, Increment 2 (Create-from-Brief) — Design

_Owner: Raghu · Date: 2026-09-25 · Status: Approved for planning_

Parent PRD: `docs/specs/CurioKids-Admin-Dashboard-PRD.md` (Phase 1, §1.2).
Builds on Increment 1 (`docs/superpowers/specs/2026-09-19-admin-dashboard-inc1-design.md`),
which shipped admin auth + the `draft`/`published` status gate + management UI.

## Purpose

Give the admin a one-screen **brief form** that generates a full story (text + cover) from a
short brief and saves it as a **`draft`** for review. This is the content-production core of the
dashboard: AI drafts, human publishes. Nothing auto-publishes.

## Decisions locked (brainstorming 2026-09-25)

1. **Full steering brief** — story idea (required) + character + theme + age band + language +
   tone + setting + supporting character + moral focus + extra wishes.
2. **Main character = 6 locked animals OR free-text custom.** Locked animals use their
   `prompt_descriptor` for cover continuity. A free-text custom character has **no cross-story
   visual continuity** — an accepted tradeoff for flexibility.
3. **Age band 5-6 / 7-8** — steers vocabulary + sentence length and sets the `age_tag` column.
4. **Admin generation is uncapped** — gated only by the admin cookie (via `hooks.server.ts`).
   No family passcode, **no** `DAILY_GENERATION_CAP` check. Spend discipline is manual.
5. **Cover image only** (page images stay off for admin, regardless of `GENERATE_PAGE_IMAGES`) —
   cheap and predictable.

## Data model

No schema change — `status` and `age_tag` columns already exist.
- Admin stories insert with `status: 'draft'` and `age_tag` = the chosen band (`5-6` | `7-8`).
- `character_id` stores the locked animal id, or the sanitized custom-character text for a custom
  hero (the column is already a free string). `age_range` stays `'5-8'` (the umbrella bucket).

## Types (`src/lib/types.ts`)

Add:
```ts
export type AgeBand = '5-6' | '7-8';
export type Tone = 'gentle' | 'funny' | 'adventurous';
```
(`CharacterId`, `ThemeId`, `Language` already exist.)

## Server pipeline

Kept **separate** from the kid path so the kid flow is untouched. Reuses `openaiClient`,
`blob`, `db`, `characters`, `themes`.

### `validate.ts` — add `validateAdminBrief(body)` (pure, tested)

Returns a normalized `Ok` or `Err` (same `Err` shape as `validateGenerateRequest`). Rules:
- `story_idea` — **required**; sanitized (reuse the whitespace-collapse + delimiter-strip logic),
  capped at 500 chars. Empty → `invalid_input`.
- `character_id` — one of the 6 (resolves to a `Character`), **or** null when a custom character
  is used.
- `custom_character` — free-text hero; sanitized, capped 120 chars. **Exactly one** of
  `character_id` / `custom_character` must be present → else `invalid_input`.
- `theme_id` — one of the 4 (resolves to a `Theme`); else `invalid_input`.
- `age_band` — `'5-6' | '7-8'`; else `invalid_input`.
- `language` — `'en' | 'te'`; else `invalid_input`.
- `tone` — `'gentle' | 'funny' | 'adventurous'`; default `'gentle'` if missing/invalid.
- `supporting_character`, `setting`, `moral_focus` — optional; sanitized, capped 120 chars; empty → null.
- `extra` — reuse existing `sanitizeExtra` (200-char cap, untrusted content).

The existing `sanitizeExtra` is generalized to `sanitizeText(value, max)` (keep `sanitizeExtra`
as `sanitizeText(v, 200)` so `validateGenerateRequest` is unchanged). Normalized `Ok` exposes:
`storyIdea`, `character` (Character | null), `customCharacter` (string | null),
`supportingCharacter`, `theme` (Theme), `ageBand`, `language`, `tone`, `setting`, `moralFocus`,
`extra`.

### `storyPrompt.ts` — add `buildAdminStoryMessages(brief)` (pure, tested)

Same JSON output shape and the CLAUDE.md HARD RULES as `buildStoryMessages` (5 pages, 30–50
words/page, 150–250 total, title ≤8 words, moral/reflection ≤15 words, per-page `image_prompt`,
happy ending, `scene` field). Extends the prompt with:
- **Story idea** — the operator's core premise (trusted): "Base the story on this idea: …".
- **Hero** — locked animal (`name`, keep it that animal every page, per-language noun) **or** the
  custom-character text.
- **Supporting character**, **setting**, **moral focus** — folded in when present.
- **Tone** — "Overall tone: gentle/funny/adventurous (still calm, never scary)."
- **Age band** — band-specific rule: `5-6` → sentences **max 8 words**, simplest vocabulary a
  5-year-old knows; `7-8` → sentences **max 12 words**, slightly richer vocabulary. (Page word
  counts stay 30–50 for both — the locked schema rule wins.)
- **Extra wishes** — reuse the existing fenced UNTRUSTED-content treatment verbatim.

### `storyPrompt.ts` — add `buildAdminCoverPrompt(heroDescriptor, scene)` (pure)

Same soft-watercolor cover template as `buildCoverImagePrompt`, but takes a `heroDescriptor`
string directly: for a locked animal pass `character.prompt_descriptor`; for a custom character
pass the sanitized custom text. (`buildCoverImagePrompt` stays for the kid path.)

### `assembleStory.ts` — add optional `age_tag`

Add `age_tag?: string` to the input; use `input.age_tag ?? '5-8'`. Kid endpoint is unchanged
(omits it → `'5-8'`). Admin passes the band.

### New endpoint `src/routes/api/admin/generate-story/+server.ts`

`POST` — admin-cookie gated by `hooks.server.ts` (no passcode/cap checks in the handler):
1. Parse JSON → `validateAdminBrief`; on `Err` return `invalid_input` (400).
2. `buildAdminStoryMessages` → `generateStoryText`.
3. `buildAdminCoverPrompt(heroDescriptor, text.scene)` → `generateImage` → `uploadImage` (cover
   only). A failed cover becomes `''` (don't fail the whole request).
4. `assembleStory({ …, character_id, theme_id, age_tag: band, status: 'draft', pageUrls: [] })`.
5. `insertStory` → return `{ story }`.
- Errors mirror the kid endpoint: `invalid_input` (400), `openai_failed` (502), `server_error`
  (500). No `rate_limit`, no `unauthorized` (auth handled upstream).
- `character_id` = `character?.id ?? customCharacter`.

## UI

### `src/routes/admin/create/+page.svelte` (new)

One-screen brief form in the admin shell, calm production-tool styling, responsive, reuses
`CharacterPicker` + `ThemePicker` (the 6 animals / 4 themes) with an added **"Custom character"**
option (radio/toggle → free-text input; selecting it clears the animal pick and vice-versa):
- Story idea (required textarea), character (6 picker + custom), supporting character (text),
  theme (picker), age band (5-6 / 7-8 toggle), language (EN/TE toggle), tone (select), setting
  (select of presets: village/forest/home/pond/festival/market + custom text), moral focus (text),
  extra wishes (text). Big **Generate** button, disabled until story idea is non-empty AND (an
  animal is chosen OR custom character is filled) AND a theme is chosen.
- **Submit** → POST the brief JSON to `/api/admin/generate-story`, show a **Generating…** state
  (disabled form + calm line; no spinner needed).
- **Success** → show the returned **draft** in a preview (kid-viewer look) with two actions:
  - **Publish** → `POST /api/admin/stories/[id]` `{action:'publish'}` → go to `/admin`.
  - **Keep as draft** → go to `/admin` (it's already saved as draft).
- **Failure** → friendly inline error; the brief stays filled so the operator can retry.

### Nav / entry points

- `src/routes/admin/+layout.svelte` — add a **"Create story"** nav item (with a `Plus`/`Sparkles`
  lucide icon) above Sign out.
- `src/routes/admin/+page.svelte` — add a **"+ New story"** button in the list header linking to
  `/admin/create`.

## Files

**New**
- `src/routes/api/admin/generate-story/+server.ts`
- `src/routes/admin/create/+page.svelte`

**Edited**
- `src/lib/types.ts` (`AgeBand`, `Tone`)
- `src/lib/server/validate.ts` (`validateAdminBrief`, generalize sanitize) + `validate.test.ts`
- `src/lib/server/storyPrompt.ts` (`buildAdminStoryMessages`, `buildAdminCoverPrompt`) + `storyPrompt.test.ts`
- `src/lib/server/assembleStory.ts` (optional `age_tag`) + `assembleStory.test.ts`
- `src/routes/admin/+layout.svelte` (Create nav)
- `src/routes/admin/+page.svelte` (+ New story button)

## Testing

- `validate.test.ts`: `validateAdminBrief` — accepts a full valid brief (locked animal); accepts a
  custom-character brief; rejects empty story idea; rejects when both/neither character given;
  rejects bad theme/age_band/language; sanitizes + caps the free-text fields; tone defaults to gentle.
- `storyPrompt.test.ts`: `buildAdminStoryMessages` — includes the story idea, hero (locked and
  custom), theme, tone, setting, moral focus; applies the age-band sentence rule (8 vs 12 words);
  keeps the 5-page / 30–50-word HARD RULES; fences the extra wishes. `buildAdminCoverPrompt` —
  includes the hero descriptor + scene + no-text watercolor style.
- `assembleStory.test.ts`: honors a passed `age_tag`; defaults to `'5-8'` when omitted.
- Manual E2E (dev server + admin cookie): generate a draft with a **locked animal** and with a
  **custom character**; both land as `draft`, visible in `/admin`, hidden from `/api/stories`;
  preview renders; Publish flips it into the kid gallery. `npm run check` clean, `npm test` green.

## Non-goals (this increment)

- Editing (manual or AI-prompt), cover regenerate/upload — Increment 3.
- Cost visibility, OpenAI moderation — Increment 4.
- Per-page images for admin (cover only here).
- Batch generation, templates, series, roles — PRD Phase 2.
- Telugu-specific length tuning beyond the existing prompt rules.

---

## Amendment 2026-09-25 — the 2-4 age band (approved)

A third age band, **`2-4`**, joins `5-6` and `7-8` in the admin brief. It is a *board book*, not a
shorter picture book, so it differs from the other two bands in three ways — and only for `2-4`;
`5-6` and `7-8` output is byte-for-byte unchanged.

1. **Shorter pages.** Still exactly 5 pages, but **15–25 words** each (total body 75–125) with
   sentences of **max 6 words** and only words a 2-year-old knows, one idea per page. The three
   bands' text rules now live in one `AGE_RULES` lookup in `storyPrompt.ts` instead of ternaries.
2. **A picture on every page.** `2-4` always generates the cover **plus one image per page** — 6
   images, generated in parallel exactly as the kid endpoint does, each failure degrading to `""`
   for that slot. The band itself is the switch: this deliberately does *not* read
   `GENERATE_PAGE_IMAGES`, which stays the kid flow's flag. `5-6` / `7-8` remain cover-only, so
   the "per-page images for admin" non-goal above now holds for those two bands only.
   `buildAdminPageImagePrompt(heroDescriptor, pageScene)` is the page twin of
   `buildAdminCoverPrompt` — a descriptor string, so custom characters work as well.
3. **An outline cover.** For `2-4` the model's `scene` field describes the **whole story in one
   picture** (hero + main idea) rather than the opening moment, and each page's `image_prompt`
   must show one clear subject on an uncluttered background. The other bands keep opening-scene
   covers.

Supporting changes: `AgeBand` widens to `'2-4' | '5-6' | '7-8'`; `AGE_BANDS` in `validate.ts`
accepts it; the admin form gains a `2–4` option, a note that the band illustrates every page, a
~60–90s wait hint, and a draft preview that renders each page's image; the admin generate route
declares `maxDuration: 120` because 6 images exceed the platform's default function timeout.

**Cost:** ~₹20–25 per `2-4` story vs ~₹4 cover-only. Admin generation is uncapped by design, so
nothing throttles this — it is the operator's call per story, and the form says so.

**Unchanged:** `GeneratedStory.age_range` stays the locked literal `'5-8'`; `age_tag` (the DB
column) carries the real band. The kid `/create` screen gets no age picker — `2-4` is admin-only.
