## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: tailwindcss, sveltekit-adapter

---

# CurioKids — Project Instructions for Claude Code

> Place this file at the **root of the curiokids/ project**. Claude Code reads it automatically every session.

## Mission

Build a calm, hybrid-offline curiosity app for children aged 5–8, starting with my daughter Geethadhya (age 7) as the first user. The app has three content modes:
1. **Nature facts** (Pillar 2) — hand-curated, bundled in app, fully offline
2. **Curated stories** (Pillar 1A) — hand-curated, bundled in app, fully offline
3. **Generated stories** (Pillar 1B) — child picks a character + theme, OpenAI generates a 5-page story with cover illustration. Requires network. Result cached locally for offline re-read.

Content is in **English and Telugu**. We are NOT building an engagement loop. We optimize for curiosity, replay, and follow-up questions — not screen time.

Full product strategy is in `docs/strategy.md`. **Always re-read it if you're unsure about scope.** The end-to-end generation pipeline — inputs, every OpenAI/Blob/Postgres call, and their order — is in `docs/architecture.md`. If a request conflicts with the strategy, flag it before implementing.

## Hard scope rules

### Always
- Keep facts and curated stories **fully offline**. JSON, images, audio bundled in the app.
- Generated stories require network — but **fail gracefully** when offline (show friendly "we need wifi for this" screen with the curated stories highlighted instead).
- Generated stories are stored server-side in **Postgres (Neon)** as a shared gallery, with cover (and optionally per-page) images uploaded to **Vercel Blob**. Every device reads the same shared gallery — there is no per-device story cache.
- Route all OpenAI calls through the **single serverless function** `/api/generate-story`. Never embed `OPENAI_API_KEY` in client code or commit it to git. Two additional read-only endpoints, `/api/stories` (list) and `/api/stories/[id]` (single story), serve the shared gallery from Postgres.
- Use **TypeScript** for all code (frontend and the serverless functions).
- Use **Tailwind** for styling. No custom CSS files unless absolutely needed.
- Use **localStorage** for only: language preference and the client-side daily generation count (UX-only; the real cap is enforced server-side against Postgres).
- Honor the **6-screen UX**: splash → language picker → home → content list → content viewer → story creator. No new screens without my approval.
- Use **large fonts** (min 22pt on content screens) and **large tap targets** (min 64×64 px).
- Use **Noto Sans Telugu** for Telugu text, bundled in `static/fonts/`.
- **Rate limit story generation**: client shows a soft cap of 3 per device per day (localStorage `generationsToday` + date, UX only). The real limit is a **global daily cap** (`DAILY_GENERATION_CAP`, default 20) enforced server-side by counting today's rows in Postgres — this is a shared gallery, so the cap protects total spend across all users, not just one device.
- Per-page illustrations are generated **only** when `GENERATE_PAGE_IMAGES=true`; by default only the cover image is generated (cheaper, faster).

### Never
- Never add auth, user accounts, or a login screen. (Postgres exists solely as anonymous shared storage for generated stories — see below; it is not a user database.) **Carve-out (approved 2026-07-19):** a single shared **family passcode** (`CREATE_PASSCODE`) may gate *story creation* to protect the OpenAI bill from strangers with the link. This is a door-code, not auth — one shared secret, no accounts, no usernames, no user identity, no per-user data. If it's unset, creation stays open.
- Never call OpenAI directly from the browser. Always proxy via `/api/generate-story`.
- Never embed `OPENAI_API_KEY`, `DATABASE_URL`, or `BLOB_READ_WRITE_TOKEN` in the bundle or commit them. Use `.env` + Vercel env vars only.
- Never add analytics, tracking, ads, notifications, or external SDKs.
- Never add a settings page with more than language reset.
- Never add infinite scroll, badges, streaks, points, leaderboards, or any gamification.
- Never assume the parent is present. The child operates the app alone.
- Never auto-translate curated content between English and Telugu. Each language has its own hand-crafted JSON. (Generated stories are an exception — the OpenAI prompt specifies the language directly.)

## Tech stack (locked)

- **Framework**: SvelteKit (Svelte 5 + runes) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Svelte stores + localStorage for language preference and the client-side daily generation count only. Generated stories themselves live server-side (Postgres + Blob), not in localStorage.
- **Audio**: native HTML `<audio>` element
- **Build target Phase 1**: web (works on any browser, install as PWA)
- **Build target Phase 2**: Capacitor wrapper → Android APK first, iOS later
- **Hosting (web)**: Vercel
- **Backend**: four Vercel serverless functions:
  - `src/routes/api/generate-story/+server.ts` — accepts `{character_id, theme_id, child_name, extra, language}`, enforces the family-passcode gate (see below), calls OpenAI for story text, generates cover (and optionally per-page) images in parallel, uploads them to Vercel Blob, inserts the assembled story into Postgres, and returns it.
  - `src/routes/api/stories/+server.ts` — GET, lists the shared gallery (lightweight summaries) from Postgres, optionally filtered by `?language=`.
  - `src/routes/api/stories/[id]/+server.ts` — GET, returns one full generated story (the JSONB blob) by id.
  - `src/routes/api/verify-code/+server.ts` — POST `{code}`, returns `{ok}` (200) or 401. UX-only helper so the create screen can validate the family passcode at unlock time; the real enforcement is inside `generate-story`.
  - `src/routes/api/themes/+server.ts` — GET, the **active** theme list as `{id, label_en, label_te}` for the kid create screen and the stories filter chips. `goal_hint` is deliberately withheld — it is prompt-internal. Admin CRUD is form actions on `/admin/themes` (`?/save`, `?/create`, `?/remove`), like `/admin/prompts` — there is no `/api/admin/themes`.
- **Database**: Postgres via **Neon** (`@neondatabase/serverless`), a `stories` table storing the full `GeneratedStory` as a JSONB column plus a few promoted columns (`id`, `language`, `title`, `cover_url`, `age_tag`, `created_at`) for cheap listing/filtering/counting, plus a `prompt_templates` table and a `themes` table holding operator overrides. This is anonymous shared storage for the gallery — not a user database (no auth, no accounts).
- **Image storage**: **Vercel Blob** (`@vercel/blob`) holds cover images and, when enabled, per-page images as public JPEG URLs.
- **AI**: OpenAI `gpt-4o-mini` for story text (cheap, fast, good enough). OpenAI `gpt-image-1` for cover + optional per-page images. Use `gpt-4o` only if `mini` quality is visibly bad in testing.
- **Env vars**: `OPENAI_API_KEY`, `DATABASE_URL` (Neon connection string), `BLOB_READ_WRITE_TOKEN` (Vercel Blob), `GENERATE_PAGE_IMAGES` (`true`/`false`, default `false`), `DAILY_GENERATION_CAP` (integer, default `20`), `CREATE_PASSCODE` (shared family passcode gating story creation; blank = gate off), `ADMIN_PASSCODE` (shared admin door-code gating the whole admin dashboard; blank = admin OFF), `ADMIN_SESSION_SECRET` (HMAC secret for the admin session cookie; blank = falls back to `ADMIN_PASSCODE`) — see `.env.example`.

### Admin dashboard + story status gate (approved 2026-09-19)

- The `stories` table has a promoted `status` column (`draft` | `published`, DB default `draft`). The kid-facing endpoints `/api/stories` and `/api/stories/[id]` return **`published` only**; drafts are invisible to children.
- **Kid-generated** stories (from the kid `/create` → `/api/generate-story` flow) insert as **`published`** — the child's own creation is never gated. **Admin-produced** stories are **`draft` by default** and only reach kids when an operator publishes them.
- The admin dashboard lives under `/admin/*` (pages) and `/api/admin/*` (endpoints), gated server-side by `src/hooks.server.ts` using a stateless HMAC-signed session cookie (`ADMIN_PASSCODE` + `ADMIN_SESSION_SECRET`). This is a shared door-code, **not** user auth — no accounts, no identity. Admin is OFF unless `ADMIN_PASSCODE` is set (never silently open).
- Admin can review, publish/unpublish, and **delete** gallery stories (row + Vercel Blob images). This admin-side moderation is in scope; kid-facing social features remain out of scope.
- Increment 1 (auth + status gate + manage) is built. Generation-from-brief, editing, and cost visibility are later increments — see `docs/superpowers/specs/2026-09-19-admin-dashboard-inc1-design.md`.
- **Admin age bands (approved 2026-09-25):** admin create-from-brief offers three bands — `2-4`, `5-6`, `7-8` — stored in the promoted `age_tag` column. They steer vocabulary and sentence length, and `2-4` is a **board book**: 5 pages of 15–25 words, **an illustration on every page** (6 pages → cover + 6 page images, ~₹28 per story), and a cover that pictures the whole story rather than the opening scene. `5-6` and `7-8` stay cover-only with 30–50-word pages. The band itself switches page images on — this does **not** read `GENERATE_PAGE_IMAGES`, which remains the kid flow's flag. `GeneratedStory.age_range` stays the locked `'5-8'`; `age_tag` carries the real band. The kid `/create` screen has no age picker — the bands are admin-only. See `docs/superpowers/specs/2026-09-25-admin-create-from-brief-design.md`.
- **Editable prompts (approved 2026-09-27):** the prompts driving admin story generation are **not hardcoded**. `/admin/prompts` edits four templates — `story_system`, `story_user`, `image_cover`, `image_page` — **per age band** (12 in all), stored as overrides in a `prompt_templates` table (`age_band` + `kind` primary key). Defaults live in `src/lib/server/promptTemplates.ts`; a band/kind with no row uses the default, so "reset" is a DELETE and later deploys still improve the baseline. Every rendered prompt is the operator's body **plus a non-editable `LOCKED_FLOOR`** carrying the child-safety rules and the JSON output contract — an edit can't strip the guardrails or make output unparseable. `validateTemplate` rejects unknown `{{placeholders}}` and refuses to drop `{{hero_descriptor}}` from an image template. The kid `/create` prompt stays hardcoded (it auto-publishes, with no draft review). **Re-run `npm run db:init`** after pulling this.
- **Admin-managed themes (approved 2026-10-17):** themes are **no longer a locked enum** — they are operator-managed through `/admin/themes` (add, rename, edit `goal_hint`, reorder, archive). Seeded with `sharing`, `friendship`, `be_brave`, `good_habits`; the three retired ones (`help_friend`, `find_lost`, `learn_new`) are **archived, not deleted** — hidden from the pickers and the filter chips but still resolving by id so existing stories keep their label. Defaults live in `src/lib/data/themes.ts` and DB rows in a `themes` table override or extend them, so "reset" is a DELETE and offline falls back to the bundled list — the same contract as the editable prompts. A theme's **`id` is immutable** once created (it is the key inside every story's JSONB `theme_id`), and hard delete is refused while any story references it. `goal_hint` reaches the model, so it is sanitized and capped at 120 chars, and the existing `LOCKED_FLOOR` still carries the safety rules. `ThemeId` is now a plain `string` validated at runtime. The child only ever *selects* a theme. **Re-run `npm run db:init`** after pulling this.
- **Stories filters (approved 2026-10-17, revised same day):** `/stories` has three filters — age band (`2-4`/`5-6`/`7-8`), theme (the active list), and not-read-yet — single-select, tap again to clear, combined with AND. They live **behind a filter icon in the header**, not as an always-visible chip row: the first cut cost 30–40% of the screen before a child saw a single cover. Tapping the icon opens a **full-screen overlay** with the three sections, a **Clear** button and a **Show stories** button; choices are held as a draft and nothing changes behind the sheet until Show stories is pressed, and dismissing with X discards them. A **coral dot on the icon** is the only signal that the grid is narrowed — without it a short grid reads as missing stories. Filter state lives in **URL query params** (`/stories?age=7-8&theme=sharing&unread=1`), session-only: nothing in localStorage, so it survives reading a story and coming back but resets on a fresh entry from home. Filtering is **client-side** over the already-loaded list so chip taps need no spinner. A story whose `theme_id` matches no active theme (i.e. an archived one) stays in the grid but is unreachable by a chip — that is what archiving means. Legacy `age_tag: '5-8'` rows match **both** the `5-6` and `7-8` chips. Saved filter preferences and multi-user profiles are a later phase.
- **2-4 prompt (approved 2026-09-29):** the `2-4` story template is built around character consistency — a character bible, one moment per illustration, and a rule that every `image_prompt` names every character taking part and fully re-describes all of them **except the hero**. The hero is deliberately not re-described there because the image template already supplies its fixed `{{hero_descriptor}}`, and two descriptions in one call contradict each other.
- **Preview as a child (approved 2026-09-28):** `/admin/stories/[id]/preview` renders the story through `StoryReader` — the *same* component the child's `/stories/[id]` route uses — with a **Mobile / Desktop** toggle (phone-width frame vs full width). It loads via `getStoryAdmin`, so drafts preview too, and Done rewinds instead of marking progress. Sharing one component is the point: a second copy of the viewer would drift and the preview would stop telling the truth. This is an admin tool and does **not** count against the 6-screen kid UX rule.
- **Re-tagging a story (approved 2026-10-17):** `/admin/stories/[id]` has a **Tags** section that changes an existing story's `theme_id` and `age_tag` — the two fields the `/stories` filter chips read. Validated server-side by `retag.ts` against the **active** themes and the three real age bands, so a story can be moved *off* a retired theme but never onto one, and the legacy `'5-8'` value cannot be re-applied. `retagStory` writes the promoted `age_tag` column and both JSONB fields together, the way `setStoryStatus` does. A story whose current theme is archived shows it as an unselectable placeholder so the operator must pick a replacement. This rewrites **no text and no pictures** — the age band drove the prompt at generation time, so a re-tagged story still reads the way it was written. No model call, no cost.
- **Per-page editing (approved 2026-09-27):** `/admin/stories/[id]` lets an operator fix a generated story after the fact — edit any page's **text** (a plain save, no model call, no cost) and edit any page's or the cover's **image prompt** and regenerate just that picture (~₹4 each; the replaced image is deleted from Blob). This is why `GeneratedStory` now carries `cover_prompt` and per-page `image_prompt` — the **rendered body** of the prompt, without the locked floor, which is re-applied once on each regeneration. Both fields are optional, so pre-existing stories still load (with empty prompt boxes). Title, moral and reflection question are not editable yet.
- **Supporting-character consistency:** the story model also returns a `supporting_descriptor` and marks which pages that character appears on (`has_supporting`). Its description is added to those page prompts only — consistent where it belongs, absent from scenes the text never puts it in. The image templates take an optional `{{supporting_descriptor}}`; `renderTemplate` drops a whole line whose placeholder is empty, so a story without a side character loses the sentence cleanly.
- **Character continuity:** the story model returns a `hero_descriptor` — its own visual description of the hero it wrote — and that feeds every image call for **custom** characters. Locked animals keep their locked `prompt_descriptor`. `gpt-image-1` has no memory between calls, so repeating this descriptor is the only thing keeping the hero from changing species between pages.
- **No** Supabase, no Firebase, no other backend services beyond Neon Postgres + Vercel Blob. There is still no user auth and no user accounts. **An admin dashboard is now in scope (approved 2026-09-19)** — a content-production tool gated by a single shared `ADMIN_PASSCODE` (a door-code, not accounts) — see the admin dashboard note below.

## Folder structure

```
curiokids/
  src/
    routes/
      +layout.svelte
      +page.svelte                  # home (3 cards: Stories, Why?, Create)
      language/+page.svelte         # language picker
      facts/+page.svelte             # fact grid
      facts/[id]/+page.svelte        # fact viewer
      stories/+page.svelte           # curated + generated stories grid
      stories/[id]/+page.svelte      # story viewer
      create/+page.svelte            # story creator: character + theme + name
      create/generating/+page.svelte # loading screen while OpenAI responds
      api/
        generate-story/+server.ts    # generates + persists a story to Postgres/Blob
        stories/+server.ts           # GET — shared gallery list
        stories/[id]/+server.ts      # GET — single generated story
        themes/+server.ts            # GET — active theme list (labels only)
    lib/
      components/
        ContentCard.svelte
        AudioPlayer.svelte
        SectionRenderer.svelte
        CharacterPicker.svelte
        ThemePicker.svelte
        StoryFilterSheet.svelte      # full-screen filter overlay for /stories
      stores/
        language.ts                  # language preference
        progress.ts                  # completed content IDs
        generatedStories.ts          # thin API client + daily generation count (UX only)
      data/
        loadContent.ts               # reads JSON files
        characters.ts                # the 6 animal hero definitions
        themes.ts                    # seed theme defaults (DB rows override)
        filterStories.ts             # pure story-filter rules + URL codec
      server/
        db.ts                        # Neon client + story queries (insert/list/get/count-today)
        blob.ts                      # Vercel Blob upload helper
        validate.ts                  # pure request validation
        assembleStory.ts             # pure GeneratedStory builder
        openaiClient.ts              # server-only OpenAI wrapper
        storyPrompt.ts               # prompt builder (incl. per-page image prompts)
        themes.ts                    # resolve code defaults + DB overrides; theme queries
        themeRules.ts                # pure merge/slug/sanitise/validate for themes
      types.ts                       # Fact, Story, GeneratedStory, StorySummary, Character, Theme
  scripts/
    init-db.mjs                      # Postgres schema creation (stories + prompt_templates + themes)
  static/
    content/
      facts/
        en/fact-001-ants.json
        te/fact-001-ants.json
      stories/
        en/story-001-bunny.json
        te/story-001-bunny.json
    images/
      facts/fact-001.png
      stories/story-001-cover.png
      characters/
        rabbit.png                   # character avatars, used as fallback in generated stories
        peacock.png
        elephant.png
        monkey.png
        tortoise.png
        parrot.png
    audio/
      facts/fact-001-en.mp3
      facts/fact-001-te.mp3
    fonts/
      NotoSansTelugu-Regular.ttf
      NotoSansTelugu-Bold.ttf
  docs/
    strategy.md                      # the full product strategy
    architecture.md                  # story generation: inputs and every API call
  .env                               # OPENAI_API_KEY, DATABASE_URL, BLOB_READ_WRITE_TOKEN, GENERATE_PAGE_IMAGES, DAILY_GENERATION_CAP — gitignored
  .env.example                       # template, committed
  CLAUDE.md                          # this file
```

## Content schema (do not change without my approval)

### Fact JSON

```ts
type Fact = {
  id: string;                      // "fact-001"
  type: "nature_fact";
  language: "en" | "te";
  topic: string;
  age_range: "5-8";
  title: string;
  subtitle?: string;               // optional 1-line card description
  cover_image: string;             // path relative to /static
  audio: string;
  sections: Array<
    | { type: "question"; text: string; image: string }
    | { type: "discovery"; text: string; image: string }
    | { type: "fun_facts"; items: string[] }
    | { type: "lesson"; text: string }
  >;
  reflection_question: string;
  real_world_mission: string;
};
```

### Story JSON (curated)

```ts
type Story = {
  id: string;
  type: "story";
  source: "curated";
  language: "en" | "te";
  age_range: "5-8";
  theme: string;                   // set this to an ACTIVE theme id (see /admin/themes)
                                   // so the story is reachable by a theme filter chip
  title: string;
  cover_image: string;
  audio: string;
  pages: Array<{ text: string; image: string }>;
  moral: string;
  reflection_question: string;
};
```

### GeneratedStory JSON (stored server-side in Postgres as a shared gallery; NOT in localStorage)

```ts
type GeneratedStory = {
  id: string;                       // uuid generated server-side
  type: "story";
  source: "generated";
  language: "en" | "te";
  age_range: "5-8";
  age_tag: string;                  // promoted DB column; defaults "5-8"
  character_id: string;             // "rabbit" | "peacock" | etc.
  theme_id: string;                 // an operator-managed theme id, e.g. "sharing"
  child_name: string | null;
  title: string;
  cover_image_url: string;          // Vercel Blob URL ("" if the cover image failed)
  cover_prompt?: string;            // the rendered prompt behind the cover, so admin can edit + regenerate it
  pages: Array<{ text: string; image_url: string; image_prompt?: string }>; // image_url is "" unless GENERATE_PAGE_IMAGES=true (or that page's image failed); image_prompt is the rendered prompt behind it
  moral: string;
  reflection_question: string;
  created_at: string;               // ISO timestamp
};
```

The whole object is stored as a JSONB column (`story`) in the Postgres `stories` table, alongside promoted columns (`id`, `language`, `title`, `cover_url`, `age_tag`, `created_at`) used for cheap listing/filtering. A lighter `StorySummary` type (id, title, cover_url, age_tag, language, created_at, theme_id) is used for the gallery list endpoint so the client doesn't have to fetch every full story just to render tiles. `theme_id` is extracted from the JSONB blob (`story->>'theme_id'`) for the filter chips, so it needs no migration; it is `null` on a row that predates it.

### Character + Theme definitions (static, in `src/lib/data/`)

```ts
type Character = {
  id: "rabbit" | "peacock" | "elephant" | "monkey" | "tortoise" | "parrot";
  name_en: string;
  name_te: string;
  avatar: string;                   // path to character avatar image
  prompt_descriptor: string;        // detailed visual description for DALL-E consistency
  personality_hint: string;         // one-line trait for the AI text prompt
};

type Theme = {
  id: string;                       // operator-managed; immutable once created
  label_en: string;
  label_te: string;
  goal_hint: string;                // one-line goal for the AI text prompt
  sort_order: number;               // display order in pickers + filter chips
  archived: boolean;                // hidden from pickers/chips, still resolves by id
};
```

## Visual style (locked)

- **Palette**: peach `#FFB89A`, sky blue `#A8D8EA`, mint `#B8E6C1`, butter yellow `#FFE4A3`, coral `#FF8B7B`. White background.
- **Typography**: Nunito for body, Fraunces for display. Noto Sans Telugu for Telugu. Bundled in `static/fonts`.
- **Tone**: calm, warm, soft. No bright reds, no flashing animations, no harsh shadows.
- **Animation**: only soft fades and page swipes. No bouncing, no popups, no confetti.
- **Icons**: lucide-svelte. Stroke width 1.5. Color matches palette.

## UX rules

- **Language picker shows once** on first launch, then never again unless user resets from settings.
- **Home screen** has exactly 3 cards: Stories, Why? (Facts), Create. Nothing else.
- **Content list** is a vertical scrolling grid (2 columns on mobile, 3 on tablet). Each tile shows cover + title + ✓ if completed.
- **Stories grid** shows curated + generated stories together. Generated ones have a tiny "✨" badge.
- **Story creator** is one screen: 6 character cards on top, the active theme cards in middle (fetched from `/api/themes`), optional name input at bottom, big "Make my story" button. No multi-step wizard. Keep active themes to ~6 or the button falls below the fold.
- **Generating screen**: shows the chosen character avatar with a soft pulse animation + a Telugu/English line like "నీ కథ సిద్ధం అవుతోంది..." / "Your story is coming...". No spinner — use the character.
- **Generation failure**: if offline or API error, show the chosen character with a sad-but-cute look and "Let's try after wifi comes back!" with a button back to home.
- **Content viewer** auto-plays audio when the screen opens (curated only — generated stories have no audio in MVP). Big play/pause button at bottom center.
- **Swipe gestures**: right = next section/page, left = previous, X top-right = back to list.
- **"Done!" button** at end of content marks the ID as completed (localStorage) and returns to grid.
- **No loading spinners for cached content**. The only loading state is during story generation (which has the character animation).

## Character set (MVP — locked)

These 6 hero animals are the entire character surface area. Don't add more without my approval. **Themes are no longer locked** — they are operator-managed (see below).

**Characters:**
1. `rabbit` — Mishti (curious, gentle)
2. `peacock` — Neelu (proud, loves to dance)
3. `elephant` — Ganga (kind, strong, never forgets)
4. `monkey` — Bandhu (clever, mischievous)
5. `tortoise` — Dheera (patient, wise, slow)
6. `parrot` — Mitthu (talkative, observant)

**Themes (seeded, operator-managed — approved 2026-10-17):**
1. `sharing` — sharing something precious with others
2. `friendship` — making or keeping a friend
3. `be_brave` — facing something scary
4. `good_habits` — learning a good everyday habit

Archived (hidden from pickers and filter chips, still resolving by id so existing stories keep their label): `help_friend`, `find_lost`, `learn_new`.

Each character has a locked `prompt_descriptor` that DALL-E uses for visual consistency across generations. **Never modify these descriptors without regenerating reference images** — character continuity matters.

## Backend: `/api/generate-story` contract

**Request:**
```ts
POST /api/generate-story
{
  character_id: "rabbit" | "peacock" | "elephant" | "monkey" | "tortoise" | "parrot";
  theme_id: string;                 // an ACTIVE theme id — see GET /api/themes
  child_name: string | null;        // optional; if provided, substituted into story
  extra: string | null;             // optional free-text "wishes" (e.g. extra animals); sanitized + length-capped server-side, treated as story CONTENT only, never as prompt instructions
  language: "en" | "te";
}
// Header: x-create-code — the family passcode (see CREATE_PASSCODE). Required only when the gate is enabled.
```

**Response (200):**
```ts
{
  story: GeneratedStory             // see schema above
}
```

**Response (4xx/5xx):**
```ts
{
  error: "rate_limit" | "invalid_input" | "unauthorized" | "openai_failed" | "server_error";
  message: string;                  // kid-friendly message frontend can display
}
```

**Server-side rules:**
- Enforce the **family passcode gate** first: `checkPasscode(request.headers['x-create-code'])` via `passcode.ts`. Reject with `unauthorized` (401) before any validation, DB, or OpenAI work when the gate is enabled and the code is missing/wrong. No-op when `CREATE_PASSCODE` is unset (open). This is a shared door-code, not auth.
- Validate `character_id` against the locked animal enum, and `theme_id` against the resolved theme list (`resolveThemes()`), which rejects unknown **and archived** ids — see `validate.ts`.
- Build the prompt server-side using `storyPrompt.ts`. Never accept arbitrary prompt *instructions* from the client. **The one exception is the optional `extra` field**: it is sanitized in `validate.ts` (whitespace collapsed, quote/backtick delimiters stripped, capped at 200 chars) and injected in `storyPrompt.ts` as fenced, untrusted **content** — story "ingredients" the model may gently include — with an explicit instruction to ignore any commands inside it and never break the safety/length rules. It is never treated as a prompt override and is not persisted to the DB.
- Call OpenAI with `response_format: { type: "json_object" }` to guarantee parseable output.
- After text generation, call `gpt-image-1` for the cover image (always) and, when `GENERATE_PAGE_IMAGES=true`, one image per page too — all generated in parallel using the character's `prompt_descriptor` + that page's `image_prompt` for continuity.
- Upload each generated image to **Vercel Blob** and store the resulting public URL (not a data URI). A failed individual image becomes `""` for that slot rather than failing the whole request.
- Assemble the final story with `assembleStory.ts` and insert it into Postgres via `db.ts` (`insertStory`) — this is what makes it visible in the shared gallery for every device.
- Enforce a **global daily cap** (`DAILY_GENERATION_CAP`, default 20) by counting today's rows in Postgres before generating (`countStoriesToday`) — return `rate_limit` (429) if reached.
- Total budget per call: ~₹5–7 (more if per-page images are enabled). If costs exceed ₹500/month across all users, lower `DAILY_GENERATION_CAP`.
- No logging of personal info. `child_name` is used to build the prompt and discarded — never written to logs.

**Story length constraints (enforce in prompt):**
- **Page count is per age band** (`PAGES_PER_BAND` in `promptTemplates.ts`): the kid flow and the admin `5-6`/`7-8` bands are **5 pages**; the admin **`2-4` band is 6 pages** (approved 2026-09-29). `parseStoryJson` enforces the exact count.
- Each page: **30–50 words**. Total story body: **150–250 words**.
- Title: max 8 words.
- Moral: 1 sentence, max 15 words.
- Reflection question: 1 open-ended question, max 15 words.
- Language: simple, read-aloud-friendly. Sentences max 12 words. Active voice. No subordinate clauses.
- The prompt should instruct OpenAI to reject its own output if it exceeds these limits and rewrite shorter.

## Telugu-specific rules

- Telugu content is stored in separate JSON files under `static/content/*/te/`. Never auto-translate from English.
- Use `lang="te"` attribute on all Telugu text containers for proper line-breaking and rendering.
- Test Telugu rendering on Android (older versions render Indic fonts poorly) — never assume system fonts work. Always use bundled Noto Sans Telugu.
- Telugu line height should be **1.6** (Devanagari/Telugu glyphs are taller than Latin).

## Naming conventions

- Components: `PascalCase.svelte`
- Stores, utils, types: `camelCase.ts`
- Content files: `fact-001-ants.json`, `story-001-bunny.json` (kebab-case, prefixed with type and ID)
- Image files match content ID: `fact-001.png`, `fact-001-detail.png`
- Audio files match content ID with language suffix: `fact-001-en.mp3`, `fact-001-te.mp3`

## Working with Claude Code

- **Always re-read** `docs/strategy.md` and this file at the start of a new session if working on anything non-trivial.
- **Use plan mode** for any change that touches more than one file. Show me the plan before writing code.
- **Commit after every working feature.** Commit message format: `feat: <short>`, `fix: <short>`, `chore: <short>`.
- **One feature per session.** Don't bundle unrelated changes.
- **Ask before** adding any dependency. Justify why it can't be done with built-in Svelte/Tailwind.
- **Don't write content** (no facts, no stories, no Telugu translations). Content is generated by me outside this codebase.
- **When stuck**, ask a clarifying question rather than guessing. I'd rather answer one question than revert your work.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run preview      # preview production build
npm run check        # svelte-check + tsc
npm run lint         # eslint
npm run format       # prettier
npm test             # vitest run — unit tests for server/*.ts
npm run test:watch   # vitest, watch mode
npm run db:init      # one-time Postgres schema creation (scripts/init-db.mjs)
```

## Out of scope (do not propose, do not build)

- User accounts, profiles, auth, login, multi-user identity (Postgres is anonymous shared storage for the gallery only, not a user database)
- Quiz / mission tracker UI
- Parent dashboard / discussion prompts UI
- Social features on top of the shared gallery: no likes, comments, following, or per-user "my stories" view. (Admin-side moderation — publish/unpublish/delete via the `/admin` dashboard — IS in scope as of 2026-09-19; what stays out is *kid-facing* social/moderation UI.)
- Push notifications, email, marketing
- Subscriptions, payments, ads
- Voice recording by the child
- Speech-to-text
- Analytics of any kind
- Audio narration for generated stories (text only — curated stories have audio)
- Custom character creation by the child (locked to the 6 animals)
- Theme creation or naming **by the child** (they only select; operators manage the set via `/admin/themes` — approved 2026-10-17)
- Migrating old localStorage-cached generated stories into the new backend gallery

If a feature request touches any of the above, **stop and ask me** before implementing.

## Open decisions

These are not decided yet — flag if relevant to your work and I'll choose:

- App display name (CurioKids / తెలుసుకో / ఎందుకు?)
- Bundle identifier for Capacitor (will affect package ID — get this right before first Android build)
- Whether Telugu narration is recorded human voice or TTS
- Whether to support Hindi as a third language in Phase 1 or wait
- Whether generated stories should be saveable to a "My Stories" tab separately from curated ones, or mixed in the same grid (current default: mixed with ✨ badge; note all generated stories are now shared globally, not per-device, which makes a per-device "My Stories" concept moot unless we later add lightweight device tagging)
- Whether to enable `GENERATE_PAGE_IMAGES=true` by default once cost data from cover-only usage is in (currently `false`)

---

_Last updated: 2026-10-17. Update this file whenever a scope decision changes._