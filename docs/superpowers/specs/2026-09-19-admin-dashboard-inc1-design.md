# CurioKids — Admin Dashboard, Increment 1 (Safety Spine) — Design

_Owner: Raghu · Date: 2026-09-19 · Status: Approved for planning_

Parent PRD: `docs/specs/CurioKids-Admin-Dashboard-PRD.md` (Phase 1).
This spec covers **Increment 1 only** — the safety spine — and records how the rest of
Phase 1 slices behind it.

## Purpose

Stand up a gated admin area and a `draft`/`published` gate on the shared gallery so that:
- Admin content never reaches a child until explicitly published.
- The kid app only ever reads `published` stories.
- An operator can log in, review, publish/unpublish, and delete any story.

Generation-from-brief, editing, and cost visibility are **later increments** (see
"Phase 1 slicing"). This increment deliberately ships no admin generation UI.

## Reconciliation with locked CLAUDE.md scope

This is a deliberate, owner-approved scope change. Decisions made during brainstorming
(2026-09-19):

1. **Admin dashboard is now in scope.** CLAUDE.md's "Out of scope → Admin dashboard" and
   "Moderation / delete of gallery stories" entries are superseded for this work. CLAUDE.md is
   updated as part of this increment.
2. **Two-state gate: `draft` / `published`.** (Not 3 states.)
3. **Kid-side live generation stays.** Kids still generate via `/api/generate-story`; those
   stories are inserted as **`published`** (today's live behavior preserved). Admin-produced
   stories are **`draft` by default**. The safety gate governs admin production, not the child's
   own creation.
4. **Admin auth = single passcode + stateless signed cookie.** Separate secret from the family
   `CREATE_PASSCODE`. Real accounts remain out of scope (deferred to PRD Phase 3).
5. **No rate-limiter table/counter in Increment 1.** The real guard is a **strong
   `ADMIN_PASSCODE`** (16+ random chars) plus a **fixed ~500ms delay on failed login
   attempts** — both stateless and effective on free-tier serverless, unlike a per-instance
   in-memory counter. A DB-backed limiter is a known upgrade path if more admins are added.
6. **Very good, unified responsive UI is a first-class requirement** (desktop + mobile). See
   the "UI / UX design" section.

## Data model change

Add a promoted `status` column to the `stories` table:

```sql
ALTER TABLE stories ADD COLUMN status text NOT NULL DEFAULT 'draft';
CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status);
```

- **DB default is `'draft'`** — fail-safe hidden. A forgotten/incomplete insert can never leak
  to kids.
- `status` is also mirrored inside the JSONB `story` blob for consistency, but the **promoted
  column is the source of truth** for filtering.
- The kid endpoint `/api/generate-story` explicitly inserts `status: 'published'`.
- Gallery is currently empty (0 rows), so **no backfill** is required. Migration script:
  `scripts/add-status-column.mjs` (idempotent: `ADD COLUMN IF NOT EXISTS`).
- `scripts/init-db.mjs` is updated so fresh installs get the column from the start.

`GeneratedStory` type gains `status: 'draft' | 'published'`. `StorySummary` gains `status` too
(so the admin list can render/filter it without fetching full blobs).

## Auth design (stateless, serverless-safe)

New env vars (added to `.env.example`):
- `ADMIN_PASSCODE` — the admin door code. If unset, `/admin/*` returns 503 "admin not
  configured" (never silently open — unlike the family gate, admin must be explicitly enabled).
- `ADMIN_SESSION_SECRET` — HMAC signing secret for the session cookie. If unset, derive from
  `ADMIN_PASSCODE` (documented fallback) so a single env var still works, but a distinct secret
  is recommended.

**Login flow** (`src/routes/admin/login`):
1. POST `{ passcode }` to the login action.
2. Constant-time compare against `ADMIN_PASSCODE` (reuse the `passcode.ts` timing-safe pattern).
3. On success set cookie `ck_admin` = `"<expiryEpochMs>.<hexHMAC(expiryEpochMs, secret)>"`.
   - `httpOnly`, `secure`, `sameSite: 'strict'`, `path: '/'`, `maxAge` ≈ 7 days.
   - Verified statelessly on every request: recompute HMAC, constant-time compare, check
     `expiry > now`. **No session table.**
4. On failure: **await a fixed ~500ms delay**, then return an error the login page shows. The
   delay is unconditional on failure (stateless, no shared counter) and throttles rapid guessing
   naturally on serverless.

**Guard** (`src/hooks.server.ts`):
- For any request to `/admin` or `/api/admin` (except `/admin/login` and its action):
  verify `ck_admin`. Invalid/expired/missing → page routes redirect to `/admin/login`; API
  routes return `401 { error: 'unauthorized' }`.
- Guard runs server-side only. The client is never trusted.

**Brute-force posture (no rate-limiter in Inc 1):**
- The primary guard is a **strong `ADMIN_PASSCODE`** — `.env.example` instructs 16+ random
  chars. Over HTTP, guessing such a secret is infeasible regardless of throttling.
- The **~500ms failed-attempt delay** is the stateless throttle. No in-memory counter (leaky
  per-instance on serverless) and no DB table in this increment.
- A DB-backed `admin_attempts` limiter remains the documented upgrade path for Phase 2/3 when
  multiple admins exist.

`adminAuth.ts` holds the pure, unit-testable core: `signSession(expiry, secret)`,
`verifySession(cookieValue, secret, now)`, `checkPasscode(input, expected)`. `hooks.server.ts`
and the login action are thin wrappers around it. The ~500ms failed-attempt delay lives in the
login action, not in `adminAuth.ts` (keeps the core pure and fast to test).

## Kid app changes

- `db.ts` `listStories` and `getStory` add `WHERE status = 'published'` (list also keeps the
  optional `language` filter). Kid-facing endpoints `/api/stories` and `/api/stories/[id]`
  otherwise unchanged.
- `getStory` returning `null` for a draft means the kid story viewer's existing "can't find that
  story" path already handles a draft/unpublished id gracefully — no new kid UI needed.

## Admin management UI (Increment 1 surface)

- **`/admin/login`** — single passcode field, big submit, error line, calm palette. No nav.
- **`/admin`** (guarded) — management table of **all** stories (draft + published):
  - Columns: cover thumb, title, language, age_tag, character, theme, **status**, created_at.
  - Filters: status (all/draft/published), language, age band, character, theme; search by
    title; newest-first sort.
  - Row actions: **Preview** (renders the kid story-viewer look in a modal/route),
    **Publish/Unpublish** (toggles `status`), **Delete** (confirm dialog → removes row + Blob
    image; exports the row to a timestamped JSON backup first, per the backup-before-delete
    rule).
  - Data comes from a new admin list query (returns drafts too) — the kid `listStories` must
    stay published-only, so the admin uses a separate `listStoriesAdmin` in `db.ts`.
- No generation or editing controls in this increment (Increments 2–3).

## UI / UX design (unified responsive — desktop + mobile)

A first-class requirement: the admin dashboard must look genuinely good and work equally well on
a desktop (primary — content production) and a phone (review/publish on the go). One codebase,
one responsive layout — not a separate mobile build.

**Aesthetic direction — "calm production tool", distinct from the kid app but coherent with it.**
The kid app is playful (Fraunces display, rounded cards, big tap targets). The admin app is a
*tool*: denser, more utilitarian, professional — but it **shares the brand palette and fonts** so
the two feel like one product. Concretely:
- Reuse the brand palette as **accents on a neutral base**: white / soft-gray surfaces, slate
  text, brand peach `#FFB89A` / sky `#A8D8EA` / mint `#B8E6C1` for status chips, primary actions,
  and highlights. Coral `#FF8B7B` reserved for destructive (delete/unpublish confirm).
- **Nunito** for UI text (already bundled); Fraunces used sparingly for page titles only.
- Status is color-coded and label-coded (never color alone, for accessibility): `draft` = muted
  gray chip, `published` = mint chip with a check.
- Calm, no gamification, soft shadows, generous whitespace — consistent with the product tone.

**Responsive layout system:**
- **App shell** (`admin/+layout.svelte`): on desktop (≥1024px) a fixed left **sidebar** nav +
  top bar (title, logout); on tablet/mobile the sidebar collapses into a **top bar + slide-in
  drawer** (hamburger). Single layout, Tailwind breakpoints — no duplicate markup.
- **Story list** — the responsive centerpiece:
  - Desktop: a real **data table** (sortable columns, inline filters bar, checkbox column for
    future bulk actions) — dense and scannable for production work.
  - Mobile: the same rows render as **stacked cards** (cover thumb + title + status chip +
    action menu). Implemented as one component that switches presentation at the `md` breakpoint
    (table on `md+`, card list below) — same data, same actions, no logic duplication.
  - Filters/search collapse into a **filter sheet/drawer** on mobile; inline toolbar on desktop.
- **Login** — centered card, full-viewport calm background, works identically at any width.
- **Preview** — renders the kid story-viewer look in a modal on desktop, full-screen route on
  mobile, so you always see exactly what the child sees.

**Component library** (`src/lib/components/admin/`): small, focused, reusable, each independently
testable — e.g. `AdminShell`, `StatusChip`, `StoryTable` (desktop), `StoryCardList` (mobile),
`FilterBar`, `ConfirmDialog`, `PreviewModal`. Built with Tailwind only (no new deps), lucide-svelte
icons (stroke 1.5), following the existing component conventions.

**Standards:** WCAG-minded contrast on all text/chips; keyboard-operable (focus states, Esc closes
dialogs, Enter submits); tap targets ≥44px on mobile controls; no layout shift; the page body never
scrolls horizontally (wide tables scroll inside their own `overflow-x:auto` container).

**Design contract note:** because "very good UI" is an explicit goal, the implementation plan will
run this increment's frontend through the `gsd-ui-phase` UI-spec/`gsd-ui-review` loop (or an
equivalent design pass) rather than treating the UI as incidental.

## Admin API (Increment 1)

- `POST /api/admin/stories/[id]` with `{ action: 'publish' | 'unpublish' }` → updates `status`.
- `DELETE /api/admin/stories/[id]` → backup-export the row, delete Blob images (cover + any
  page images), delete the row. Reuses the Blob-delete logic from `scripts/cleanup-stories.mjs`,
  promoted into `src/lib/server/blob.ts` as `deleteImages(urls)`.
- All under the `hooks.server.ts` guard.

## db.ts query changes (summary)

- `insertStory` — add `status` to the column list; caller supplies it (`'published'` from kid
  endpoint; admin increments will supply `'draft'`).
- `listStories(language?)` — add `WHERE status = 'published'` (kid gallery).
- `getStory(id)` — add `WHERE status = 'published'` (kid single-story).
- `listStoriesAdmin(filters)` — **new**, returns all statuses with optional filters, for `/admin`.
- `setStoryStatus(id, status)` — **new**, publish/unpublish. Also updates the mirrored JSONB
  `status` so a later full-blob read stays consistent.
- `getStoryAdmin(id)` — **new**, returns any-status full blob for admin preview.
- `deleteStory(id)` — **new**, deletes the row (Blob deletion handled in the endpoint).

## Files

**New**
- `src/hooks.server.ts`
- `src/lib/server/adminAuth.ts` + `adminAuth.test.ts`
- `src/lib/components/admin/` — admin UI component library (see "UI / UX design")
- `src/routes/admin/+layout.svelte` — admin app shell (responsive nav)
- `src/routes/admin/login/+page.svelte`, `+page.server.ts`
- `src/routes/admin/+page.svelte`, `+page.server.ts`
- `src/routes/api/admin/stories/[id]/+server.ts`
- `scripts/add-status-column.mjs`

**Edited**
- `src/lib/server/db.ts` (status in insert/list/get; new admin queries)
- `src/lib/server/blob.ts` (add `deleteImages`)
- `src/routes/api/generate-story/+server.ts` (insert `status: 'published'`)
- `src/lib/types.ts` (add `status` to `GeneratedStory` + `StorySummary`)
- `scripts/init-db.mjs` (status column + index)
- `.env.example` (`ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`)
- `CLAUDE.md` (scope update: admin dashboard now in scope; document status gate + admin env vars)

## Testing

- `adminAuth.test.ts`: sign/verify round-trip; tampered HMAC rejected; expired cookie rejected;
  correct vs wrong passcode (timing-safe); missing secret fallback behavior.
- Extend/adjust existing `db`-adjacent tests as needed for the new `status` argument.
- Manual verification (per the `verify` discipline): log in with right/wrong passcode; confirm
  `/admin` lists a seeded draft + published; publish/unpublish flips kid-app visibility;
  delete removes row + Blob and writes a backup file; kid `/api/stories` never returns a draft.
- Responsive UI check: verify the list renders as a table on desktop and stacked cards on
  mobile, nav collapses to a drawer, and no horizontal body scroll at 375px width.
- Gates: `npm run check` clean, `npm test` green.

## Non-goals (this increment)

- Admin story generation, editing (manual or AI), cover regen/upload — Increments 2–3.
- Cost visibility, OpenAI moderation — Increment 4.
- Facts production, audio, roles, batch, templates, analytics — PRD Phases 2–3.
- Real auth / accounts — PRD Phase 3.
- DB-backed rate limiting — deferred; Inc 1 relies on a strong passcode + failed-attempt delay.

## Phase 1 slicing (one spec, executed in order)

1. **Increment 1 (this spec)** — auth + status gate + kid app reads published + admin manage.
2. **Increment 2** — generate-from-brief: `/admin/create` + `/api/admin/generate-story`
   (brief fields per PRD §1.2), inserts `status: 'draft'`, draft preview.
3. **Increment 3** — editing: manual field edit + AI-prompt edit with diff/accept; cover
   regenerate/upload.
4. **Increment 4** — cost visibility (per-generation estimate + actual, today/month spend vs
   cap) + OpenAI moderation before draft is shown.
