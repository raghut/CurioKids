# CurioKids — Admin / Story Dashboard PRD

_Owner: Raghu · Last updated: 2026-09-19 · Status: Draft_

## Context

The kid-facing app reads from a shared, curated gallery (Neon Postgres + Vercel Blob). The **admin dashboard is the content production tool** — where stories and facts are generated with AI, reviewed by a human, and published. Nothing reaches a child until it's approved here. This dashboard is what makes CurioKids a *curated* product rather than a raw AI toy.

**Core principle:** AI drafts, human approves. Every published item passed through a person.

## Goals

- Let Raghu produce a high-quality story from a short brief in under 3 minutes.
- Guarantee a review gate — nothing is visible to kids until explicitly published.
- Keep AI spend visible and capped.
- Scale later from solo → small team → data-driven without re-architecting.

## Non-goals (dashboard)

- Not the kid app. No child-facing UX here.
- Not a general CMS. Purpose-built for CurioKids stories + facts only.
- No public sign-up. Access is gated, not account-based (until Phase 3 contributor portal).

## Users & access model

| Phase | Who | Access |
|---|---|---|
| 1 | Raghu only | Single shared passcode |
| 2 | Raghu + 1–3 content writers | Passcode + simple roles (admin / writer) |
| 3 | Team + vetted external contributors | Real accounts + role permissions + review queue |

---

# PHASE 1 — Core production loop

**Goal:** Log in → brief → generate → review → edit → publish → manage. The complete single-person content pipeline.

## 1.1 Login

- **Passcode-based login.** Single `ADMIN_PASSCODE` env var. Enter passcode → session cookie (httpOnly, ~7 day expiry) → access dashboard.
- No username, no signup. One door, one key.
- All `/admin/*` routes and `/api/admin/*` endpoints gated server-side (never trust the client).
- Rate-limit passcode attempts (e.g., 5 tries / 15 min) to prevent brute force.

> Note: this is the **admin** passcode — distinct from the family/kid app passcode you already built. Two separate secrets.

## 1.2 Create a story (the brief)

One main screen. A **brief** is what you fill in; the AI turns it into a full story.

**Fields — Phase 1 (recommended set):**

| Field | Type | Required | Notes |
|---|---|---|---|
| Story idea | Long text | Yes | Your main input. "A shy peacock who's afraid to dance at the village festival, learns courage." |
| Language | en / te | Yes | Drives generation language |
| Main character | Select (6 animals) + free text | Yes | Locks visual identity for cover |
| Supporting character | Select / free text | No | Optional friend/companion |
| Theme | Select (be_brave, help_friend, find_lost, learn_new) | Yes | Steers the arc |
| Age band | 5–6 / 7–8 | Yes | Controls vocabulary + sentence length |
| Setting | Select (village, forest, home, pond, festival, market) + free text | No | Indian-rooted context |
| Tone | gentle / funny / adventurous | No | Default gentle |
| Length | pages (default 5) | No | 30–50 words/page enforced |
| Moral focus | Short text | No | Optional explicit lesson steer |
| Extra wishes | Free text | No | Already built — sanitized, injected as untrusted content |

**Why these:** the "story idea" is your creative input; everything else is *constraints* that make output consistent and on-brand without you re-typing them each time. All the selects have safe defaults so you can generate from just an idea + language + character + theme + age.

**Generation flow:**
1. Fill brief → click **Generate**.
2. Server (`/api/admin/generate-story`) builds the prompt from the brief, calls OpenAI (text) + gpt-image-1 (cover).
3. Story is saved as **status: `draft`** immediately (never auto-published).
4. Dashboard shows the draft in a **preview** that looks like the kid's story viewer.

## 1.3 Review & publish (the gate)

This is your moderation control — the single most important part of the dashboard.

- Every generated story is **`draft`** until you act.
- **Preview** exactly as a child will see it (pages, cover, moral, reflection question).
- Actions on a draft:
  - **Publish** → `status: published`, visible to kids
  - **Keep as draft** → stays hidden, iterate later
  - **Reject/Delete** → remove
- Published stories can be **Unpublished** (pulled from kids instantly) at any time.
- Safety self-check reminder shown before publish: age-appropriate? nothing scary? Telugu reads naturally?

## 1.4 Edit a story

Two editing modes — you need both:

**A. Edit by prompt (AI):**
- "Make page 3 less scary." "Shorten the ending." "Give the peacock a name — Neelu." "Make the Telugu simpler."
- AI applies the change, shows a diff/preview, you accept or discard.

**B. Manual edit (direct):**
- Plain-text edit any field: title, any page, moral, reflection question.
- Don't route a typo fix through AI — just fix it.

**Cover controls:**
- Regenerate cover (new gpt-image-1 call)
- Upload your own image
- Keep current

## 1.5 List & manage stories

- Table/grid of all stories (draft + published).
- **Filters:** language, age band, character, theme, **status (draft/published)**, date range.
- **Search:** by title / idea text.
- **Sort:** newest first (add "most-read" in Phase 3 when analytics exist).
- **Row actions:** preview, edit, publish/unpublish, delete.
- **Bulk actions:** publish, unpublish, delete selected.

## 1.6 Delete a story

- Soft-friendly hard delete: removes DB row + deletes the Vercel Blob image (avoid orphaned storage cost).
- Confirm dialog. No accidental deletes.

## 1.7 Cost visibility (Phase 1 essential — you care about the bill)

- Show **estimated cost per generation** before you click (text tokens + 1 image).
- Show **actual cost** after generation.
- Dashboard header shows **today's spend vs global cap** (you already have `DAILY_GENERATION_CAP`).
- Simple running total: this-month spend.

## Phase 1 acceptance criteria

- [ ] Can log in with passcode; wrong passcode is rejected and rate-limited.
- [ ] Can generate a story from a brief; it lands as `draft`.
- [ ] Can preview a draft as the kid will see it.
- [ ] Can edit by prompt AND edit manually.
- [ ] Can regenerate the cover.
- [ ] Can publish / unpublish / delete.
- [ ] Kid app only ever fetches `published` stories.
- [ ] List filters by language, age, character, theme, status.
- [ ] Deleting a story also deletes its blob image.
- [ ] Per-generation and daily cost are visible.

---

# PHASE 2 — Quality, richness & small team

**Goal:** Produce more, better, faster — and add facts + audio. Bring in 1–3 helpers.

## Features

- **Facts production loop** — same generate → review → publish pipeline for Pillar 2 nature facts (not just stories). Reuses most of Phase 1.
- **Audio narration** — generate TTS per story/fact per language (ElevenLabs / Google / AI4Bharat for Telugu), preview, attach. OR upload human-recorded audio (grandmother voice). Publish story with audio.
- **Character consistency** — lock a reference image per character; pass it to gpt-image-1 edit/variation so Neelu looks the same across every story. Kills the "different peacock every time" problem.
- **Telugu bilingual workflow** — generate English → AI-draft Telugu → **human edits Telugu** side-by-side → publish both linked. Never ship unreviewed Telugu.
- **Batch generation** — queue 10 briefs, generate overnight, review a stack in the morning.
- **Saved brief templates** — reusable presets ("Neelu village adventure, age 7–8, Telugu").
- **Collections / series** — group stories ("Neelu's Adventures", "Monsoon Tales").
- **Version history** — see prior versions of a story, roll back a bad edit.
- **Roles** — admin (publish) vs writer (draft only). Writers can't publish; admin approves.
- **Duplicate detection** — warn if a new brief is near-identical to an existing story.
- **Scheduled publishing** — set a future publish date (drip content).

## Phase 2 success signals

- Time-to-publish per story drops (target: <2 min including review).
- Telugu library reaches parity with English.
- Zero unreviewed items ever reach kids.

---

# PHASE 3 — Intelligence, analytics & ecosystem

**Goal:** Let data drive what you make. Mature operations. Optional community.

## Features

- **Content analytics** — which stories get opened, completed, replayed; drop-off page; most-loved characters/themes/settings. Read from kid-app telemetry.
- **Kid feedback loop** — surface replays / thumbs to admin: "kids replay peacock+bravery 3x more — make more."
- **AI quality pre-score** — an AI critic scores readability, age-fit, vocabulary, and safety *before* human review, so you review best-first.
- **Content gap analysis** — "20 animal stories, 2 space; kids search space often — fill the gap."
- **A/B content tests** — two versions of a story, measure retention, keep the winner.
- **Auto-suggest briefs** — "generate 5 more like your top performers."
- **Language expansion** — Hindi / Tamil / Kannada via the Phase 2 translation-review workflow.
- **Real accounts + permissions** — replace passcode with proper auth once >3 people.
- **Vetted contributor portal** — external parents/teachers submit → land in a review queue → admin approves. Community, still curated.
- **Cost analytics & budget alerts** — spend trends, per-story cost over time, alert at threshold.
- **Backup / export** — export the full gallery (content portability, disaster recovery).
- **Publish → CDN cache invalidation** — automatic, so published content appears instantly and stays fast.

---

# Story brief fields — full roadmap (answers "what else can we add?")

| Field | Phase | Rationale |
|---|---|---|
| Story idea (main input) | 1 | Your creative seed |
| Language | 1 | Core |
| Main character | 1 | Visual + narrative identity |
| Theme | 1 | Arc steering |
| Age band (5–6 / 7–8) | 1 | Vocabulary control |
| Supporting character | 1 | Richer stories |
| Setting | 1 | Indian context |
| Tone | 1 | Voice control |
| Length (pages) | 1 | Attention fit |
| Moral focus | 1 | Optional lesson steer |
| Extra wishes | 1 | Built ✓ |
| Audio voice choice | 2 | Narration |
| Series/collection | 2 | Grouping |
| Brief template | 2 | Speed |
| Reading level target (Lexile-ish) | 2 | Precision on difficulty |
| Vocabulary focus words | 2 | Teach specific words |
| Reference image lock | 2 | Character consistency |
| Target emotion | 3 | "calm before bed" vs "excited" |
| Curriculum tag (EVS topic, etc.) | 3 | School alignment |
| Seasonal/festival tag | 3 | Timely content (Sankranti, monsoon) |

---

# Cross-cutting concerns

**Safety (non-negotiable):**
- Draft-by-default is the core safety gate. Never auto-publish.
- Run generated text + `extra wishes` through OpenAI moderation before it's even shown as a draft.
- `extra wishes` stays fenced as untrusted content (already done ✓).
- Facts (Phase 2) need a factual-accuracy review step — AI gets science wrong sometimes.

**Cost controls:**
- Global daily cap (built ✓).
- Per-generation cost shown before/after.
- `GENERATE_PAGE_IMAGES` stays off in prod until justified (~₹20/story with it on).
- Delete removes blob images (no orphaned storage).

**Tech notes:**
- One SvelteKit project; `/admin/*` + `/api/admin/*` gated server-side.
- Reuse existing `validate`, `assembleStory`, `storyPrompt`, `passcode` server modules.
- Neon free tier auto-suspends after idle — expect cold-start on first admin action of the day.
- Keep admin bundle out of the kid app's critical path (lazy-load / separate route group).

---

# Open decisions

1. **Admin passcode vs. real auth in Phase 1?** Recommend passcode now, real auth in Phase 3. Confirm.
2. **Draft/published or draft/review/published (3 states)?** Recommend 2 states in Phase 1, add "in review" in Phase 2 with writers.
3. **Should the kid app's `/create` flow stay?** Decision: with the curated model, kid "create" = pick character → see matching *published* stories (filter), NOT live generation. Confirm you want to drop live kid-side generation.
4. **Audio in Phase 2: TTS or human-recorded first?** Affects tooling.
5. **Analytics source (Phase 3)** — you said "no analytics" for the kid app earlier. Reconcile: minimal privacy-safe content telemetry (story opened/completed) is needed to drive Phase 3. Confirm that's acceptable, or Phase 3 flies blind.
