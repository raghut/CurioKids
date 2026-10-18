# Admin-driven facts (Why? section) — design

**Date:** 2026-10-18
**Status:** approved
**Increment:** A1 of a larger arc (see Scope below)

## Goal

Move the Why? section from hand-edited bundled JSON to **server-driven content authored
from the admin dashboard**: an operator writes a brief, OpenAI generates the fact in
**every supported language at once**, images are generated once and shared across
languages, and the fact is reviewed and published like a story.

## Why now

The Why? section's *code* is complete — the 2026-07-19 build delivered `FactCard`,
`SectionRenderer`, swipe navigation and a closing screen. What is missing is content:

| | |
|---|---|
| Facts that exist | 1 (`fact-001`, ants) |
| Telugu facts | 0 — `static/content/facts/te/` does not exist |
| Fact images | 0 — every image field is `""` |
| Dead file | `fact-001-ants.json` is never read; `loadFacts` takes everything from `index.json` |

The bottleneck is authoring, not rendering.

## Scope

This spec is **A1 only**. The wider arc, agreed with the product owner:

| | | Status |
|---|---|---|
| **A1** | Facts in Postgres + Blob; generate-from-brief; publish; kid-side reads the API | **this spec** |
| **A2** | Per-fact editing — section text per language, image prompts, regenerate a single image | later |
| **B** | Offline cache (service worker + Cache API + manifest), serving facts **and** stories | later |
| **C** | Retrofit `GeneratedStory` to the same multilingual shape, with migration | later |

**Between A1 and B the Why? section requires network.** Today it works offline with
exactly one fact. This is a known, accepted regression, taken deliberately so the offline
layer can be built once for the whole app rather than bolted onto one feature.

## The central idea: bilingual storage, single-language delivery

A fact is **one record holding every language**, because a nature fact is the same fact
told twice — and because **images are language-neutral**. A picture of ants does not
change between English and Telugu.

The record is a *storage* concern. **The API flattens it to the requested language before
it reaches the child**, so the kid-facing `Fact` type is unchanged and `FactCard`,
`SectionRenderer` and both routes keep working on today's shape.

```
stored (FactRecord)                     served (Fact — today's shape)
───────────────────                     ─────────────────────────────
{                                       {
  id, topic, age_range, status,           id, topic, age_range,
  cover_image_url,            ──────►     language: 'te',
  section_images: [...],                  cover_image: <shared url>,
  content: {                              title, subtitle?,
    en: { title, sections[…], … },        sections: [ {…text, image} ],
    te: { title, sections[…], … }         reflection_question,
  }                                       real_world_mission
}                                       }
```

Adding Hindi later is a third key in `content` plus a re-generation — **not a migration**,
because no image or structural field is keyed by language.

## Types

```ts
/** One language's words for a fact. Carries no images — those are shared. */
export type FactContent = {
	title: string;
	subtitle?: string;
	sections: FactSectionText[];
	reflection_question: string;
	real_world_mission: string;
};

/** Text-only section. The image (when any) comes from FactRecord.section_images[i]. */
export type FactSectionText =
	| { type: 'question'; text: string }
	| { type: 'discovery'; text: string }
	| { type: 'fun_facts'; items: string[] }
	| { type: 'lesson'; text: string };

/** What is stored. One row per fact, every language inside. */
export type FactRecord = {
	id: string;
	type: 'nature_fact';
	topic: string;
	age_range: '5-8';
	status: 'draft' | 'published';
	cover_image_url: string;
	/** Shared across languages, indexed to match sections. "" where a section has none. */
	section_images: string[];
	/** The rendered prompt behind each image, so A2 can edit and regenerate it. */
	cover_prompt?: string;
	section_image_prompts?: string[];
	/** Language code -> that language's words. At least one key; may be partially filled. */
	content: Partial<Record<Language, FactContent>>;
	created_at: string;
};

/** The admin list row. Shows which languages exist so a gap is visible, not silent. */
export type AdminFactSummary = {
	id: string;
	topic: string;
	/** The title in whichever language is present, for display only. */
	title: string;
	cover_url: string;
	status: 'draft' | 'published';
	languages: Language[];
	section_count: number;
	created_at: string;
};
```

The existing kid-facing `Fact` type in `src/lib/types.ts` is **unchanged**, and there is no
kid-side summary type: the facts grid consumes whole `Fact` objects today (it reads `title`,
`subtitle` and `cover_image` off them), and a fact is small — text plus image URLs — so
`/api/facts` returns the full flattened list exactly as `index.json` did.

**Flattening fills every field of the kid `Fact`:** `language` is the requested one,
`cover_image` is `cover_image_url`, each section gains `image` from `section_images[i]`
(`""` when absent), and **`audio` is always `""`** — facts have no audio and the viewer
already renders without it.

## Section model

- **1 to 10 sections**, in the order the model returns them. `parseFactJson` rejects fewer
  than 1 or more than 10.
- **Types are the existing four**, because `SectionRenderer` already renders exactly these
  and the viewer's closing screen depends on the shape: `question`, `discovery`,
  `fun_facts`, `lesson`.
- A long "how things work" explainer is a `question` opener, several `discovery` steps, then
  `fun_facts` and `lesson`.
- **Only `question` and `discovery` can carry an image**, matching the existing schema.
  `fun_facts` and `lesson` never do.
- **Every language must have the same number of sections, of the same types, in the same
  order.** This is enforced at parse time and is what makes one `section_images` array valid
  for all languages. It is also why both languages are produced by a single model call.
- `section_images[i]` is `""` for any section without a picture; `SectionRenderer` already
  renders text-only in that case.

## Generation

**One text call.** `gpt-4o-mini` with `response_format: { type: 'json_object' }`, returning
every requested language in one object. A single call — rather than one per language —
is what guarantees parallel structure; two independent calls could return 6 sections in
English and 8 in Telugu, which would break the shared image array.

**Image calls.** `gpt-image-1`, generated in parallel, uploaded to Vercel Blob. A failed
individual image becomes `""` for that slot rather than failing the whole request, matching
the story pipeline.

**Illustration level is chosen by the operator at generation time**, with the cost shown
before generating — image spend scales with section count and this is real money:

| Choice | Images | ~Cost |
|---|---|---|
| `cover` | 1 | ₹4 |
| `cover_plus` (cover + first two image-capable sections) | up to 3 | ~₹12 |
| `every` (cover + every image-capable section) | 1 + n | ₹4 × (1+n) |

Default is `cover_plus`. The admin create screen shows the estimated cost for the chosen
level and section count before the button is pressed.

**Prompts are hardcoded** in `src/lib/server/factPrompt.ts` for this increment, exactly as
story prompts were before they became editable. Making them editable is a later increment
with a clear upgrade path (`prompt_templates` already has a `kind` column).

**Cost guard.** Fact generation is admin-only and sits behind `ADMIN_PASSCODE`, like admin
story generation — no family passcode and no daily cap.

## Schema

```sql
CREATE TABLE IF NOT EXISTS facts (
  id          text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  topic       text NOT NULL,
  status      text NOT NULL DEFAULT 'draft',
  cover_url   text NOT NULL DEFAULT '',
  fact        jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS facts_status_idx  ON facts (status);
CREATE INDEX IF NOT EXISTS facts_created_idx ON facts (created_at DESC);
```

`id` is `text`, not `uuid`: the existing fact's id is `fact-001`, and the `progress` store
keys completion on that string — a uuid would silently un-complete it for any child who had
read it. New facts get a uuid; imported ones keep their id.

Promoted columns only for what listing and gating need; the whole `FactRecord` lives in
`fact`. **There is no `language` column** — a row holds all languages, so language is a
filter applied when flattening, not a column. Added to `scripts/init-db.mjs`; **requires a
`npm run db:init` re-run**.

## Endpoints

| Endpoint | Method | Returns |
|---|---|---|
| `/api/facts?language=en` | GET | `{ facts: Fact[] }` — **published only**, flattened, and only facts that have that language |
| `/api/facts/[id]?language=en` | GET | `{ fact: Fact }` — published, flattened; 404 if missing or lacking that language |
| `/api/admin/facts` | POST | generate from a brief; inserts as `draft`; returns the record |
| `/api/admin/facts/[id]` | POST | `{action: 'publish' \| 'unpublish'}` |
| `/api/admin/facts/[id]` | DELETE | removes the row and its Blob images |

`/api/facts*` are public and read-only like `/api/stories`. `/api/admin/*` is gated by the
existing `hooks.server.ts` rule — no new auth.

## Partially-translated facts

**A fact publishes with at least one language filled.** It appears in the lists for the
languages it has and is simply absent from the others. This is required for the imported
ants fact, which has no Telugu, and it avoids blocking an English fact on a Telugu block the
operator has not reviewed.

The admin list shows which languages each fact has, so a gap is visible rather than silent.

## Kid-facing changes

`src/lib/data/loadContent.ts`: `loadFacts` and `loadFact` fetch `/api/facts` instead of
`/content/facts/<lang>/index.json`. Their signatures and return types are unchanged, so
`/facts/+page.svelte` and `/facts/[id]/+page.svelte` need **no change beyond failure
handling**.

Because facts now need network, `/facts` gains the same two states the stories grid has:

1. loading
2. fetch failed → "We need wifi to load facts" (Telugu equivalent), matching the stories
   wording so the child meets one idea, not two
3. genuinely no facts → the existing "No facts yet!"

## Migrating the existing fact

`scripts/import-facts.mjs` — one-time, idempotent, re-runnable. Reads
`static/content/facts/en/index.json` and inserts each fact as a `FactRecord` with the English
block filled, `content.te` absent, `status: 'published'` (it is live today, so it stays
live), and empty image fields.

The bundled JSON files are **left in place and in git history**, not deleted — they stop
being read, and keeping them costs nothing while making the migration trivially reversible.

## Testing

Pure modules with vitest, following the house pattern:

- `src/lib/server/factParse.test.ts` — `parseFactJson`: accepts 1 and 10 sections; rejects 0
  and 11; rejects a language whose section count or type order differs from the first;
  rejects an unknown section type; rejects an empty `fun_facts` list
- `src/lib/server/factFlatten.test.ts` — `flattenFact`: merges `section_images` into the
  right sections by index; yields `""` for sections beyond the image array; returns null for
  a language the record lacks; never leaks another language's text
- `src/lib/server/factImages.test.ts` — `imagePlan`: the three illustration levels produce
  the right number and indices of image slots; `fun_facts` and `lesson` never get one; the
  cost estimate matches the slot count
- `src/lib/server/validate.test.ts` — the admin fact brief: rejects a blank brief, a blank
  topic, an unknown illustration level; sanitises and caps free text

Plus `npm run check` and `npm run build`.

## Files touched

| File | Change |
|---|---|
| `src/lib/types.ts` | `FactRecord`, `FactContent`, `FactSectionText`, `AdminFactSummary`; kid `Fact` unchanged |
| `src/lib/server/factParse.ts` + test | **new, pure** — parse and validate the model's JSON |
| `src/lib/server/factFlatten.ts` + test | **new, pure** — record → single-language `Fact` |
| `src/lib/server/factImages.ts` + test | **new, pure** — illustration plan + cost estimate |
| `src/lib/server/factPrompt.ts` | **new** — hardcoded prompts |
| `src/lib/server/db.ts` | `insertFact`, `listFacts`, `getFact`, `listFactsAdmin`, `getFactAdmin`, `setFactStatus`, `deleteFact` |
| `src/lib/server/validate.ts` | `validateFactBrief` |
| `src/routes/api/facts/+server.ts` | **new** |
| `src/routes/api/facts/[id]/+server.ts` | **new** |
| `src/routes/api/admin/facts/+server.ts` | **new** |
| `src/routes/api/admin/facts/[id]/+server.ts` | **new** |
| `src/routes/admin/facts/+page.svelte` + `.server.ts` | **new** — list, publish, delete |
| `src/routes/admin/facts/create/+page.svelte` | **new** — brief + illustration level + cost |
| `src/routes/admin/+layout.svelte` | nav link |
| `src/lib/data/loadContent.ts` | facts come from the API |
| `src/routes/facts/+page.svelte` | loading + wifi-failure states |
| `scripts/init-db.mjs` | `facts` table |
| `scripts/import-facts.mjs` | **new** — one-time import |
| `CLAUDE.md` | the rule amendment and the new surface |

No new dependency. No new env var.

## Rule amendments this requires

1. **"Keep facts and curated stories fully offline"** — amended for facts: they are
   server-driven as of 2026-10-18, with the offline cache deferred to increment B.
2. **"Never auto-translate curated content between English and Telugu"** — generated facts
   are produced in all languages by one call, which is a translation relationship by
   construction. This extends the exception that already covers generated stories. It does
   **not** apply to hand-authored curated content.
3. **"Don't write content"** stands. Claude builds the pipeline; the operator writes briefs
   and reviews output.

## Out of scope

Per-fact editing and image regeneration (A2). Editable fact prompts. Age bands for facts.
Audio — recorded-vs-TTS is still undecided and no files exist. Offline caching (B). Story
multilingual retrofit (C). Any kid-facing way to create or request a fact.
