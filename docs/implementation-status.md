# CurioKids — Implementation Status

_Last updated: 2026-07-19_

This doc tracks **what we planned** and **what is actually built**. The big milestone since the
last update: generated stories moved off browser `localStorage` onto a **backend-driven shared
gallery** (Postgres + Vercel Blob), with **per-page illustrations**. That work is built and
verified end-to-end.

> Source of truth for scope is `CLAUDE.md` + `docs/strategy.md`. This file is a working status
> snapshot — if it disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

---

## 1. The plan (three content modes)

| Pillar | Mode | Source | Network | Status |
|---|---|---|---|---|
| 2 | Nature facts | Hand-curated, bundled | Offline | Scaffold done, content missing |
| 1A | Curated stories | Hand-curated, bundled | Offline | Scaffold done, content missing |
| 1B | Generated stories | OpenAI (character + theme) | Online, shared backend gallery | **Built & verified end-to-end** |

Current constraints: **Postgres (Neon) + Vercel Blob** back the generated gallery (anonymous
shared storage — still no auth, no accounts, no user database). Facts + curated stories stay
fully offline/bundled. `localStorage` now holds only language preference + daily generation
count. English + Telugu. 6-screen UX. Calm, no gamification.

---

## 2. What is implemented today

### ✅ App shell / navigation
- 6-screen flow: splash → language picker → home → facts grid/viewer → stories grid/viewer → create → generating
- Svelte 5 (runes) + SvelteKit + Tailwind v4, Vercel adapter (`nodejs22.x`)
- Stores: `language`, `progress` (completed IDs) in `localStorage`; `generatedStories` is now a
  thin **backend API client** (+ a client-side daily-count for UX)
- Character set (6 animals) + theme set (4) + pickers

### ✅ Backend-driven shared story gallery (Pillar 1B) — verified end-to-end
The headline feature. Pick a character + theme → OpenAI writes a 5-page story → cover + (optional)
5 page illustrations generate **in parallel** → uploaded to **Vercel Blob** → assembled story
saved to **Neon Postgres** → served to every device via the shared gallery.

- **`src/routes/api/generate-story/+server.ts`** — validates input against locked enums, enforces
  a server-side **global daily cap** (`DAILY_GENERATION_CAP`, default 20), generates text +
  images in parallel, uploads to Blob, inserts the story into Postgres, returns it.
- **`src/routes/api/stories/+server.ts`** — GET shared gallery list (lightweight summaries).
- **`src/routes/api/stories/[id]/+server.ts`** — GET one full story by id.
- **`src/lib/server/db.ts`** — Neon client + queries (insert / list / get / count-today); one
  `stories` table with a flexible **JSONB** blob + promoted columns (`id, language, title,
  cover_url, age_tag, created_at`). `scripts/init-db.mjs` creates the schema.
- **`src/lib/server/blob.ts`** — Vercel Blob upload (public JPEG URLs).
- **`src/lib/server/storyPrompt.ts`** — prompt builder with length/style rules + **per-page
  `image_prompt`** and `buildImagePrompts` (cover + per-page, each carrying the locked character
  descriptor for visual consistency).
- **`src/lib/server/openaiClient.ts`** — REST (no SDK): `gpt-4o-mini` text, `gpt-image-1` image
  returning JPEG bytes.
- **`src/lib/server/validate.ts`** + **`assembleStory.ts`** — pure, unit-tested helpers.
- **Frontend** — grid fetches the shared gallery; viewer renders **image-above-text per page**
  (text-only when a page has no image); generating screen wired to the backend.

**Config flag** — `GENERATE_PAGE_IMAGES` (default `false` = cover only, ~$0.20/story; `true` =
cover + 5 page images, ~$1/story, ~35s). **Rate limits**: server-side global cap of 20/day (hard
cost ceiling) + client-side per-device soft cap (default 20, override via
`PUBLIC_MAX_STORIES_PER_DAY`).

**Live verification (2026-07-19):** real generation returned HTTP 200; all 6 images uploaded and
reachable (HTTP 200) on Blob; story row confirmed in Postgres with cover + 5 page image URLs;
gallery list + single-story endpoints return correctly; graceful handling confirmed for a failed
image (page renders text-only) and a private-Blob-store misconfig.

**Quality gates:** `npm run check` → 0 errors / 0 warnings; `npm test` → 9 unit tests passing.

### ✅ Earlier bug fixes (branch `fix/generated-story-viewer`, folded in)
- `ContentCard`: render `data:`/`http` image URIs as `<img>`.
- Story viewer: friendly "can't find that story" instead of infinite "Loading…".
- (The old localStorage quota-eviction logic was removed — no longer needed with the backend.)

### Deviations from original `CLAUDE.md` (now reconciled in `CLAUDE.md`)
1. **`gpt-image-1`** instead of `dall-e-3` (dall-e-3 unavailable on the account).
2. Runtime is **`nodejs22.x`**, not Edge.
3. Generated stories persist **server-side** (Postgres + Blob), not in `localStorage`.
4. **Per-page images** are now in scope (behind `GENERATE_PAGE_IMAGES`).

### Local dev note
Homebrew's `node@22` now resolves to **v23** and fails `engine-strict`. Use the nvm Node 22:
`export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` before any `npm` command.
One-time DB setup: `npm run db:init`.

---

## 3. What is planned but NOT done

- **Content** — only 1 English fact + 1 English story exist. **No Telugu content files yet.**
  (Content authoring is owned by Raghu, not Claude Code.)
- **Audio** — `AudioPlayer` + `SectionRenderer` components and autoplay for curated content.
- **PWA install** (Phase 1 target) and **Capacitor → Android APK** (Phase 2).
- **Deploy to Vercel** — connect GitHub + set the 5 env vars in the dashboard so it's reachable
  from a real URL/phone. Not yet done.
- **Telugu length tuning** — Telugu is denser, so stories run under the 150-word floor.
- **`lint` / `format`** scripts referenced in `CLAUDE.md` but not in `package.json`.

---

## 4. Deferred / next-phase ideas (explicitly out of the current MVP)

These were fenced off during the backend-gallery design (see
`docs/superpowers/specs/2026-07-19-backend-shared-gallery-design.md`):

- **Identity / per-user scoping / auth** — today the gallery is a single shared global collection.
- **Admin dashboard** to upload/manage stories for all users.
- **Age-based experience** — the `age_tag` column exists; the filter + image/text-ratio logic
  (e.g. 2–4 → more images/less text) is a later phase.
- **Moderation / delete** of gallery stories.
- **Offline caching** of generated stories (currently online-only, on-demand).

---

## 5. Branch / commit state

- `main` — original scaffold + first AI generation feature.
- `fix/generated-story-viewer` — the viewer/cover bug fixes + brainstorming spec & plan docs.
- **`feat/backend-shared-gallery`** (current) — the full backend shared gallery: 14 planned tasks
  + rate-limit/flag fixes, all committed. Verified end-to-end. **Not yet pushed / not yet merged.**
- Spec: `docs/superpowers/specs/2026-07-19-backend-shared-gallery-design.md`
- Plan: `docs/superpowers/plans/2026-07-19-backend-shared-gallery.md`
- `.env` holds `OPENAI_API_KEY`, `DATABASE_URL`, `BLOB_READ_WRITE_TOKEN`,
  `GENERATE_PAGE_IMAGES`, `DAILY_GENERATION_CAP` — gitignored, never committed.
