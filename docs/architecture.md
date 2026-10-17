# Story generation: inputs and every API call

How a story gets made, from the form to the row in Postgres. Written to answer one
question precisely: **what goes in, which external calls fire, and in what order.**

There are two generation paths. They share almost all the machinery:

| | Kid flow | Admin flow |
|---|---|---|
| Entry | `/create` → `POST /api/generate-story` | `/admin/create` → `POST /api/admin/generate-story` |
| Gate | family passcode (`CREATE_PASSCODE`) | admin session cookie (`ADMIN_PASSCODE`) |
| Daily cap | yes — `DAILY_GENERATION_CAP`, global | **none** |
| Inputs | 6 locked animals × the active themes | free-text brief |
| Prompts | hardcoded in `storyPrompt.ts` | editable per age band at `/admin/prompts` |
| Images | cover only (unless `GENERATE_PAGE_IMAGES=true`) | cover only; **every page when age band is `2-4`** |
| Saved as | `published` | `draft` |

---

## 1. Input

### Kid flow — `validateGenerateRequest` (`src/lib/server/validate.ts`)

```jsonc
POST /api/generate-story
Header: x-create-code: <family passcode>   // only when CREATE_PASSCODE is set
{
  "character_id": "rabbit",     // must be one of the 6 locked animals
  "theme_id":     "sharing",    // must be an active theme id (see /admin/themes)
  "child_name":   "Geetha",     // optional, trimmed, capped at 40 chars
  "extra":        "add fireflies", // optional free text, sanitized, capped at 200
  "language":     "en"          // "en" | "te"
}
```

### Admin flow — `validateAdminBrief` (same file)

```jsonc
POST /api/admin/generate-story
Cookie: ck_admin=<HMAC-signed session>
{
  "story_idea":  "Motu the elephant finds a banana and shares it.", // REQUIRED, ≤500
  "character_id": "elephant",        // one of these two, never both
  "custom_character": "a tiny firefly named Chinni",
  "supporting_character": "a wise owl",   // optional, ≤120
  "theme_id":    "help_friend",
  "age_band":    "2-4",              // "2-4" | "5-6" | "7-8"
  "language":    "en",
  "tone":        "gentle",           // gentle | funny | adventurous, defaults gentle
  "setting":     "a village pond",   // optional, ≤120
  "moral_focus": "sharing feels good", // optional, ≤120
  "extra":       "add fireflies"     // optional, ≤200
}
```

**Every free-text field is sanitized** by `sanitizeText`: quotes and backticks stripped,
whitespace collapsed, length capped. `extra` is additionally fenced in the prompt as untrusted
*content*, never instructions — see §2.

Validation is **pure** (no I/O), so it is unit-tested directly in `validate.test.ts`.

---

## 2. Building the text prompt

No external call yet. The server assembles two chat messages.

`adminTemplateVars` (`storyPrompt.ts`) turns the brief into `{{placeholders}}`:
`story_idea`, `hero_line`, `supporting_line`, `theme_goal`, `setting_line`, `moral_line`,
`tone`, `extra_block`, `language_name`.

`buildAdminStoryMessages` renders the age band's template and appends the **locked floor**
(`LOCKED_FLOOR` in `promptTemplates.ts`) — the child-safety rules and the exact JSON contract.
The operator can edit the body at `/admin/prompts`; the floor is never editable, so no edit can
strip the guardrails or make the output unparseable.

The optional `extra` arrives fenced:

```
<<<CHILD_WISH
add fireflies
CHILD_WISH>>>
```

with an instruction to treat it as story *ingredients* and ignore any commands inside it. This is
prompt-injection defence: a child (or anyone with the link) typing "ignore your rules" gets it
treated as scenery.

---

## 3. API call #1 — story text

**`POST https://api.openai.com/v1/chat/completions`** — `openaiClient.ts:75`

```jsonc
{
  "model": "gpt-4o-mini",
  "messages": [ { "role": "system", ... }, { "role": "user", ... } ],
  "temperature": 0.8,
  "response_format": { "type": "json_object" }   // guarantees parseable output
}
```

`parseStoryJson` then enforces the contract — exactly 5 pages, non-empty title / moral /
reflection question, no empty page — and throws otherwise. The response:

```jsonc
{
  "title": "Motu Elephant's Big Banana",
  "pages": [
    {
      "text": "Minku the Monkey came swinging by...",
      "image_prompt": "Minku swings down and asks Motu for a banana", // the picture brief
      "has_supporting": true          // is the side character in THIS page?
    } // ×5
  ],
  "moral": "Sharing makes friends happy.",
  "reflection_question": "What would you share?",
  "scene": "a baby elephant sharing bananas under a tree",   // the cover
  "hero_descriptor": "a small grey baby elephant with big ears and a curled trunk",
  "supporting_descriptor": "a small brown monkey with a long curling tail"
}
```

**The text model writes the picture briefs.** Nothing has been drawn yet — this call decides what
every illustration will depict.

---

## 4. Building the image prompts

Which hero description reaches the illustrator:

- **Locked animal** → the fixed `prompt_descriptor` from `src/lib/data/characters.ts`. Never
  changes, so Ganga looks like Ganga across *different stories*.
- **Custom character** → `hero_descriptor`, which the text model derived from the story it just
  wrote. This exists because the Custom field is free text: a brief that typed instructions there
  once left the illustrator with no description of the hero at all, and later pages came back with
  a human child instead of an elephant.

`supporting_descriptor` is added **only to pages whose `has_supporting` is true**, so the side
character is consistent where it appears and absent where it isn't.

Each prompt is `renderTemplate(body, vars)` + `LOCKED_FLOOR`, producing something like:

```
Children's picture-book illustration for one page.
The hero is exactly this character, unchanged: a small grey baby elephant with big ears...
Draw this same character — do not substitute a human child, a person, or a different animal.
Also in this picture, drawn exactly the same way on every page: a small brown monkey...
Scene: Minku swings down and asks Motu for a banana.
Soft watercolor style, warm gentle colors, calm mood.
Gentle, age-appropriate children's book art. Nothing frightening. No text, no words, no letters.
```

> **The single most important fact in this document:** `gpt-image-1` has **no memory between
> calls**. Each image is an independent request that knows nothing about the previous one. The only
> thing holding a character together across six pictures is that same descriptor string being
> pasted into every prompt.

Builders return `{ full, body }`. `full` (with floor) goes to the model; `body` (without) is what
gets stored, so editing and regenerating later can't compound the floor.

---

## 5. API calls #2..N — the images

**`POST https://api.openai.com/v1/images/generations`** — `openaiClient.ts:107`

```jsonc
{
  "model": "gpt-image-1",
  "prompt": "<the assembled prompt above>",
  "n": 1,
  "size": "1024x1024",
  "quality": "medium",
  "output_format": "jpeg",
  "output_compression": 80
}
```

One call per image, **all fired in parallel** with `Promise.all`:

| Age band / flow | Image calls |
|---|---|
| Admin `5-6`, `7-8` | 1 (cover) |
| Admin `2-4` | **6** (cover + 5 pages) |
| Kid flow | 1, or 6 when `GENERATE_PAGE_IMAGES=true` |

Parallelism is why a 2-4 story takes ~60–90s rather than six times one image — and why the admin
route declares `maxDuration: 120`.

A failed image degrades to `""` for that slot; the story still saves. One bad picture never costs
the whole story.

The response is base64, converted to a `Buffer`. **Billing note:** `gpt-image-1` bills per *token*,
not per image, and `quality` + `size` set that token count — so those two fields are the cost lever.

---

## 6. API call — image storage

**Vercel Blob `put()`** — `blob.ts`, one per image:

```ts
put(`stories/admin-page-3.jpg`, bytes, {
  access: 'public',
  contentType: 'image/jpeg',
  addRandomSuffix: true
})
```

Returns a public URL. **Only the URL is stored in Postgres** — no image bytes, no data URIs, ever
in the database.

---

## 7. API call — persistence

`assembleStory` builds the final `GeneratedStory` (pure, unit-tested), then `insertStory` writes
one row to Neon Postgres:

```sql
INSERT INTO stories (id, language, title, cover_url, age_tag, status, story)
VALUES (..., $jsonb)
```

The whole object lives in the `story` JSONB column; `title`, `cover_url`, `age_tag`, `language`,
`status` are promoted columns for cheap listing and filtering. The stored object carries
`cover_prompt` and per-page `image_prompt` — the rendered bodies — which is what makes later
editing possible.

---

## Full call sequence

```
admin brief
    │
    ├─▶ Postgres  getPromptOverrides(band)      ← editable templates, falls back to defaults
    │
    ├─▶ OpenAI    POST /v1/chat/completions     ← gpt-4o-mini, 1 call, ~5s
    │             returns text + picture briefs + character descriptions
    │
    ├─▶ OpenAI    POST /v1/images/generations   ← gpt-image-1, 1 or 6 calls IN PARALLEL, ~15-60s
    │
    ├─▶ Blob      put() × N                     ← returns public URLs
    │
    └─▶ Postgres  insertStory()                 ← one row, status 'draft'
```

The kid flow adds `countStoriesToday()` against Postgres **before** any OpenAI call, so the daily
cap is enforced before money is spent.

---

## Regenerating one picture

`POST /api/admin/stories/<id>/page` with `{ index, action: "image", prompt }` (`index: -1` = cover):

```
├─▶ Postgres  getStoryAdmin(id)
├─▶ OpenAI    POST /v1/images/generations   ← 1 call, the edited prompt + locked floor
├─▶ Blob      put()                          ← new URL
├─▶ Postgres  updateStory()                  ← swap URL + prompt, re-sync promoted columns
└─▶ Blob      del(previous URL)               ← only AFTER the new one is safely stored
```

`action: "text"` takes the same route with **no OpenAI call at all** — a plain save, no cost.

---

## Error codes

Both generation endpoints return `{ error, message }` where `message` is kid-safe and displayable:

| Code | HTTP | When |
|---|---|---|
| `unauthorized` | 401 | family passcode missing/wrong (kid flow) |
| `invalid_input` | 400 | validation failed |
| `rate_limit` | 429 | daily cap reached (kid flow only) |
| `openai_failed` | 502 | either OpenAI call failed |
| `server_error` | 500 | Postgres unreachable |

---

## Secrets

`OPENAI_API_KEY` is read in exactly one place — `apiKey()` in `openaiClient.ts` — and used by both
the chat and the image call. The file lives under `src/lib/server/`, which SvelteKit refuses to
bundle into client code, so the key cannot reach the browser. Costs are separated in the OpenAI
dashboard by **model** (`gpt-4o-mini` vs `gpt-image-1`), not by key.

`DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` are likewise server-only.
