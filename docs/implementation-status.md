# CurioKids — Implementation Status & Next Direction

_Last updated: 2026-07-13_

This doc tracks **what we planned**, **what is actually built**, and teeing up the **next ideation**:
moving generated-story persistence from browser `localStorage` to a **backend-driven** model.

> Source of truth for scope is `CLAUDE.md` + `docs/strategy.md`. This file is a working status
> snapshot — if it disagrees with `CLAUDE.md`, `CLAUDE.md` wins.

---

## 1. The plan (three content modes)

| Pillar | Mode | Source | Network | Status |
|---|---|---|---|---|
| 2 | Nature facts | Hand-curated, bundled | Offline | Scaffold done, content missing |
| 1A | Curated stories | Hand-curated, bundled | Offline | Scaffold done, content missing |
| 1B | Generated stories | OpenAI (character + theme) | Online, cached for re-read | **Built & working** |

Locked constraints (current): no DB, no auth, no accounts. Only persistence is `localStorage`.
English + Telugu. 6-screen UX. Calm, no gamification.

---

## 2. What is implemented today

### ✅ App shell / navigation
- 6-screen flow: splash → language picker → home → facts grid/viewer → stories grid/viewer → create → generating
- Svelte 5 (runes) + SvelteKit + Tailwind v4, Vercel adapter (`nodejs22.x`)
- Stores (all `localStorage`): `language`, `progress` (completed IDs), `generatedStories`
- Character set (6 animals) + theme set (4) + pickers

### ✅ AI story generation (Pillar 1B) — the headline feature, working end-to-end
- **`src/routes/api/generate-story/+server.ts`** — validates `character_id`/`theme_id`/`language`
  against locked enums, builds prompt server-side, returns a full `GeneratedStory`.
- **`src/lib/server/storyPrompt.ts`** — prompt builder enforcing length/style rules
  (5 pages, 30–50 words/page, title ≤8 words, moral ≤15, sentences ≤12, active voice),
  plus species-consistency and per-language instructions.
- **`src/lib/server/openaiClient.ts`** — REST calls (no SDK dependency):
  `gpt-4o-mini` for text, `gpt-image-1` for cover → compressed **JPEG base64 data URI**.
- **`src/routes/create/generating/+page.svelte`** — client-side rate-limit guard (max 3/day),
  fetch → cache → open story, plus graceful offline/error screen.
- Verified with real API calls: English (in-spec length), Telugu (correct script + name
  transliteration), input validation, and failure path.

### ✅ Bug fixes (branch `fix/generated-story-viewer`)
- `ContentCard`: render `data:` image URIs as `<img>` (were shown as raw base64 text).
- Story viewer: friendly "can't find that story" state instead of an infinite "Loading…".
- `generatedStories`: **evict oldest stories when `localStorage` quota is hit**, so a new
  story always persists and opens.

### Deviations from `CLAUDE.md` (need doc update)
1. **`gpt-image-1`** instead of `dall-e-3` — dall-e-3 isn't available on the account.
2. Runtime is **`nodejs22.x`**, not Edge (matches actual `svelte.config.js`).
3. `cover_image_url` is `''` — gpt-image-1 returns base64 directly, no hosted URL.

### Local dev note
Default `node` on this machine is v20.9.0 (too old for Vite 8). Use Node 22:
`export PATH="/opt/homebrew/opt/node@22/bin:$PATH"` before `npm run dev`.

---

## 3. What is planned but NOT done

- **Content** — only 1 English fact + 1 English story exist. **No Telugu content files yet.**
  (Content authoring is owned by Raghu, not Claude Code.)
- **Audio** — `AudioPlayer` + `SectionRenderer` components and autoplay for curated content.
- **PWA install** (Phase 1 target) and **Capacitor → Android APK** (Phase 2).
- **Telugu length tuning** — Telugu is denser, so stories run under the 150-word floor.
- **Server-side rate limiting** (Vercel KV) — currently client-side only (open decision).
- **`lint` / `format`** scripts are referenced in `CLAUDE.md` but not in `package.json`.

---

## 4. Next ideation: backend-driven storage (instead of localStorage)

### Why revisit this now
We hit the real limits of `localStorage` during testing:
- **~5 MB cap** → only ~25 generated stories fit (each cover is ~170 KB base64). We had to add
  oldest-story eviction just to keep working.
- **Per-browser, per-device** → a story made on the laptop never appears on the phone.
- **Fragile** → clearing browser data wipes every generated story; no backup, no re-download.
- Images are stored as base64 inside a JSON blob — the least efficient possible format.

### ⚠️ Scope flag (read before ideating)
Current `CLAUDE.md` **explicitly forbids** a database, auth, accounts, and "any other backend
services… the serverless function is the entire backend." A backend-driven store is a **real
departure from locked scope.** This is fine to _pursue_ — but it should be a deliberate decision
that updates `CLAUDE.md`, not an accidental drift. The whole point of this section is to ideate
that decision.

### Design questions to work through (with Claude Code)

**A. Identity — the hard part (no accounts is a current rule)**
- How do we associate stories with a child/family **without** login screens?
- Options: anonymous device ID (localStorage-persisted UUID) · short "family code" typed once ·
  magic-link/email on the parent's side · silent OAuth. Each trades privacy/UX/complexity.
- Constraint reminder: "Never assume the parent is present. The child operates the app alone."

**B. Where stories live**
- Metadata + text: Vercel KV (Redis) · Vercel Postgres · Supabase · SQLite on the edge.
- Cover images: **object/blob storage** (Vercel Blob, S3, Supabase Storage) returning a URL —
  _not_ base64 in a row. This alone fixes the size problem.

**C. Online/offline model**
- Backend as source of truth, with `localStorage` (or IndexedDB) kept as an **offline cache**
  so re-reads still work with no network — consistent with the "cache for offline re-read" rule.
- Sync strategy: read-through cache, last-write-wins, or backend-authoritative list + lazy image
  fetch.

**D. Migration & cost**
- One-time import of existing `localStorage` stories into the backend on first run.
- Where server-side rate limiting lands (KV) once there's a backend anyway.
- Cost ceiling still applies: keep within the ~₹500/month target across users.

**E. Blast radius**
- Which files change: new `+server.ts` endpoints (list/get/save/delete), `generatedStories`
  store becomes a thin client over the API, `stories` grid + viewer read from it, plus an
  offline-cache layer. `GeneratedStory` type likely swaps `cover_image_data_uri` for a URL.

### Suggested next step
Run a **brainstorming session** scoped to questions A–C first (identity + storage + offline),
since those decide everything downstream. Land those, then write a proper plan and update
`CLAUDE.md`'s persistence rules to match.

---

## 5. Branch / commit state

- `main` (`d53f9a4 "first commit"`) — AI generation feature + scaffold.
- `fix/generated-story-viewer` (`e74296e`) — the 3 bug fixes above. Committed locally;
  push was blocked by the local permission setting (run `git push -u origin
  fix/generated-story-viewer` manually).
- `.env` holds `OPENAI_API_KEY` and is gitignored — never commit it.
