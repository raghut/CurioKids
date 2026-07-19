# Backend-Driven Shared Story Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move generated stories from browser localStorage to a Postgres (Neon) + Vercel Blob backend as a shared global gallery, with per-page illustrations behind a config flag.

**Architecture:** The `generate-story` endpoint generates story text (1 OpenAI call), then a cover + 5 page images in parallel, uploads each JPEG to Vercel Blob, and inserts one row into Postgres with the full story as a flexible JSONB blob. Two new read endpoints serve the shared gallery. The browser stores no story data — only a daily rate-limit count and language preference.

**Tech Stack:** SvelteKit (Svelte 5 runes) + TypeScript, `@neondatabase/serverless`, `@vercel/blob`, OpenAI REST (`gpt-4o-mini` + `gpt-image-1`), vitest for unit tests.

**Spec:** `docs/superpowers/specs/2026-07-19-backend-shared-gallery-design.md`

**Environment note:** Default `node` on this machine is v20.9.0 (too old for Vite 8). Every command below assumes Node 22 is on PATH:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
```

---

## File Structure

**New files:**
- `src/lib/server/db.ts` — Neon client + all story queries (insert, list, get, count-today)
- `src/lib/server/blob.ts` — Vercel Blob upload helper
- `src/lib/server/validate.ts` — pure request validation (unit tested)
- `src/lib/server/assembleStory.ts` — pure GeneratedStory builder (unit tested)
- `src/routes/api/stories/+server.ts` — GET list endpoint
- `src/routes/api/stories/[id]/+server.ts` — GET single-story endpoint
- `scripts/init-db.mjs` — one-time schema creation script
- `src/lib/server/storyPrompt.test.ts` — unit tests
- `src/lib/server/validate.test.ts` — unit tests
- `src/lib/server/assembleStory.test.ts` — unit tests

**Modified files:**
- `src/lib/types.ts` — GeneratedStory per-page images + age_tag; drop cover_image_data_uri
- `src/lib/server/storyPrompt.ts` — per-page image_prompt + buildImagePrompts
- `src/lib/server/openaiClient.ts` — generic parallel image generation returning bytes
- `src/routes/api/generate-story/+server.ts` — parallel images, Blob upload, DB insert, daily cap
- `src/lib/stores/generatedStories.ts` — thin API client (no localStorage story storage)
- `src/routes/stories/+page.svelte` — fetch shared gallery from backend
- `src/routes/stories/[id]/+page.svelte` — per-page image rendering
- `src/lib/components/ContentCard.svelte` — placeholder tile for missing cover
- `package.json` — deps + scripts
- `vite.config.ts` — vitest config
- `.env.example` — new env vars
- `CLAUDE.md` — record scope changes

---

## Task 1: Project setup — dependencies, test runner, env vars

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `.env.example`

- [ ] **Step 1: Install dependencies**

Run:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
npm install @neondatabase/serverless @vercel/blob
npm install -D vitest
```
Expected: packages added, no errors.

- [ ] **Step 2: Add test + db scripts to package.json**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run",
"test:watch": "vitest",
"db:init": "node --env-file=.env scripts/init-db.mjs"
```

- [ ] **Step 3: Configure vitest in vite.config.ts**

Replace `vite.config.ts` with:
```ts
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node'
	}
});
```

- [ ] **Step 4: Add new env vars to .env.example**

Replace `.env.example` with:
```
OPENAI_API_KEY=sk-your-key-here
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_token
GENERATE_PAGE_IMAGES=false
DAILY_GENERATION_CAP=20
```

- [ ] **Step 5: Add real credentials to .env (manual, one-time)**

Add `DATABASE_URL` (from Neon — create a free project at neon.tech or via Vercel → Storage → Postgres) and `BLOB_READ_WRITE_TOKEN` (Vercel → Storage → Blob) to your gitignored `.env`. Also add `GENERATE_PAGE_IMAGES=false` and `DAILY_GENERATION_CAP=20` for now.
Expected: `.env` has all 5 vars. This is a prerequisite for Tasks 2, 3, 7-9 verification.

- [ ] **Step 6: Verify test runner works**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: vitest runs and reports "No test files found" (no tests yet) — confirms wiring.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vite.config.ts .env.example
git commit -m "chore: add neon, blob, vitest deps and env scaffolding"
```

---

## Task 2: Update types for per-page images and age_tag

**Files:**
- Modify: `src/lib/types.ts:38-54` (the `GeneratedStory` type)

- [ ] **Step 1: Update the GeneratedStory type**

Replace the `GeneratedStory` type in `src/lib/types.ts` with:
```ts
export type GeneratedStory = {
	id: string;
	type: 'story';
	source: 'generated';
	language: Language;
	age_range: '5-8';
	age_tag: string;                  // promoted DB column; defaults "5-8"
	character_id: string;
	theme_id: string;
	child_name: string | null;
	title: string;
	cover_image_url: string;          // Vercel Blob URL ("" if cover failed)
	pages: Array<{ text: string; image_url: string }>;  // image_url "" if that page's image failed or is disabled
	moral: string;
	reflection_question: string;
	created_at: string;
};
```

Note: `cover_image_data_uri` is removed.

- [ ] **Step 1b: Add the shared StorySummary type**

Also in `src/lib/types.ts`, add this exported type (it must live here, NOT in `$lib/server/db.ts`, because client code imports it — SvelteKit forbids importing `$lib/server/*` into client bundles):
```ts
export type StorySummary = {
	id: string;
	title: string;
	cover_url: string;
	age_tag: string;
	language: string;
	created_at: string;
};
```

- [ ] **Step 2: Verify types compile**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -5`
Expected: errors ONLY in files that still reference old fields (generate-story endpoint, generating screen, story viewer) — these are fixed in later tasks. Note them; do not fix yet.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: GeneratedStory gains per-page images and age_tag"
```

---

## Task 3: Story prompt builder — per-page image prompts (TDD)

**Files:**
- Modify: `src/lib/server/storyPrompt.ts`
- Test: `src/lib/server/storyPrompt.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/storyPrompt.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildStoryMessages, buildImagePrompts } from './storyPrompt';
import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';

const rabbit = characters.find((c) => c.id === 'rabbit')!;
const brave = themes.find((t) => t.id === 'be_brave')!;

describe('buildStoryMessages', () => {
	it('asks for a per-page image_prompt in the JSON shape', () => {
		const msgs = buildStoryMessages({ character: rabbit, theme: brave, childName: null, language: 'en' });
		const user = msgs.find((m) => m.role === 'user')!.content;
		expect(user).toContain('image_prompt');
	});
});

describe('buildImagePrompts', () => {
	it('returns cover + one prompt per page, each carrying the locked descriptor', () => {
		const pages = [
			{ image_prompt: 'rabbit hops into woods' },
			{ image_prompt: 'rabbit meets a bird' }
		];
		const prompts = buildImagePrompts(rabbit, 'a sunny meadow', pages);
		expect(prompts).toHaveLength(3); // 1 cover + 2 pages
		for (const p of prompts) {
			expect(p).toContain(rabbit.prompt_descriptor);
		}
		expect(prompts[1]).toContain('rabbit hops into woods');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: FAIL — `buildImagePrompts` is not exported / `image_prompt` not in prompt.

- [ ] **Step 3: Add per-page image_prompt to the JSON shape**

In `src/lib/server/storyPrompt.ts`, in `buildStoryMessages`, change the pages line inside the returned JSON shape. Replace:
```ts
		`  "pages": [ { "text": string }, { "text": string }, { "text": string }, { "text": string }, { "text": string } ],`,
```
with:
```ts
		`  "pages": [`,
		`    { "text": string, "image_prompt": string },`,
		`    { "text": string, "image_prompt": string },`,
		`    { "text": string, "image_prompt": string },`,
		`    { "text": string, "image_prompt": string },`,
		`    { "text": string, "image_prompt": string }`,
		`  ],`,
```
And add this line to the HARD RULES list (after the reflection-question rule):
```ts
		`- Each page also needs "image_prompt": one short English sentence describing that page's single illustration (what the hero is doing, where). No text/words in the image.`,
```

- [ ] **Step 4: Add buildImagePrompts and a per-page prompt helper**

In `src/lib/server/storyPrompt.ts`, below `buildCoverImagePrompt`, add:
```ts
/**
 * Builds the image prompt for a single story page. Uses the character's LOCKED
 * prompt_descriptor (for cross-page visual consistency) plus the page's scene.
 */
export function buildPageImagePrompt(character: Character, pageScene: string): string {
	return [
		`Children's picture-book illustration for one page.`,
		character.prompt_descriptor + '.',
		`Scene: ${pageScene}.`,
		`Soft watercolor style, warm gentle colors, calm mood, no text, no words, no letters.`
	].join(' ');
}

/**
 * Builds all image prompts for a story: cover first, then one per page.
 */
export function buildImagePrompts(
	character: Character,
	coverScene: string,
	pages: Array<{ image_prompt: string }>
): string[] {
	return [
		buildCoverImagePrompt(character, coverScene),
		...pages.map((p) => buildPageImagePrompt(character, p.image_prompt))
	];
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: PASS (both describe blocks green).

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/storyPrompt.ts src/lib/server/storyPrompt.test.ts
git commit -m "feat: per-page image prompts in story prompt builder"
```

---

## Task 4: OpenAI client — generic image generation returning bytes

**Files:**
- Modify: `src/lib/server/openaiClient.ts`

- [ ] **Step 1: Update StoryTextResult pages type**

In `src/lib/server/openaiClient.ts`, change the `StoryTextResult` type's `pages` field from:
```ts
	pages: Array<{ text: string }>;
```
to:
```ts
	pages: Array<{ text: string; image_prompt: string }>;
```

- [ ] **Step 2: Replace generateCoverImage with a generic generateImage returning bytes**

Replace the entire `generateCoverImage` function in `src/lib/server/openaiClient.ts` with:
```ts
/**
 * Generate one image with gpt-image-1 and return the raw JPEG bytes (so the
 * caller can upload to blob storage). We request JPEG at moderate compression
 * to keep stored files small.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
	const res = await fetch(`${OPENAI_BASE}/images/generations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey()}`
		},
		body: JSON.stringify({
			model: 'gpt-image-1',
			prompt,
			n: 1,
			size: '1024x1024',
			quality: 'medium',
			output_format: 'jpeg',
			output_compression: 80
		})
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`OpenAI image failed (${res.status}): ${detail.slice(0, 200)}`);
	}

	const data = await res.json();
	const b64 = data?.data?.[0]?.b64_json;
	if (!b64) throw new Error('OpenAI image returned no data');
	return Buffer.from(b64, 'base64');
}
```

- [ ] **Step 3: Verify it compiles (endpoint errors expected)**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -8`
Expected: errors only in `generate-story/+server.ts` (still calls old `generateCoverImage`) — fixed in Task 8.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/openaiClient.ts
git commit -m "feat: generic generateImage returning JPEG bytes for blob upload"
```

---

## Task 5: Vercel Blob upload helper

**Files:**
- Create: `src/lib/server/blob.ts`

- [ ] **Step 1: Write the blob helper**

Create `src/lib/server/blob.ts`:
```ts
import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';

/**
 * Upload JPEG bytes to Vercel Blob and return the public URL.
 * `key` is a human-readable prefix (e.g. "story-<id>-cover"); a random suffix
 * is added to avoid collisions.
 */
export async function uploadImage(bytes: Buffer, key: string): Promise<string> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const { url } = await put(`stories/${key}.jpg`, bytes, {
		access: 'public',
		contentType: 'image/jpeg',
		token: env.BLOB_READ_WRITE_TOKEN,
		addRandomSuffix: true
	});
	return url;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -3`
Expected: no new errors from `blob.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/blob.ts
git commit -m "feat: vercel blob image upload helper"
```

---

## Task 6: Request validation (TDD)

**Files:**
- Create: `src/lib/server/validate.ts`
- Test: `src/lib/server/validate.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/validate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateGenerateRequest } from './validate';

describe('validateGenerateRequest', () => {
	it('accepts valid input and trims child_name', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '  Geeta  ' });
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.character.id).toBe('rabbit');
			expect(r.theme.id).toBe('be_brave');
			expect(r.language).toBe('en');
			expect(r.childName).toBe('Geeta');
		}
	});

	it('rejects unknown character', () => {
		const r = validateGenerateRequest({ character_id: 'dragon', theme_id: 'be_brave', language: 'en' });
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.code).toBe('invalid_input');
	});

	it('rejects unknown theme', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'nope', language: 'en' });
		expect(r.ok).toBe(false);
	});

	it('rejects unknown language', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'fr' });
		expect(r.ok).toBe(false);
	});

	it('treats empty child_name as null', () => {
		const r = validateGenerateRequest({ character_id: 'rabbit', theme_id: 'be_brave', language: 'en', child_name: '   ' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.childName).toBeNull();
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: FAIL — `validate.ts` does not exist.

- [ ] **Step 3: Write the validator**

Create `src/lib/server/validate.ts`:
```ts
import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';
import type { Character, Language, Theme } from '$lib/types';

type Ok = { ok: true; character: Character; theme: Theme; language: Language; childName: string | null };
type Err = { ok: false; code: 'invalid_input'; message: string };

const LANGUAGES: Language[] = ['en', 'te'];

/**
 * Validate the generate-story request body against the locked enums. Pure — no
 * I/O. child_name is trimmed and capped; empty becomes null.
 */
export function validateGenerateRequest(body: unknown): Ok | Err {
	const { character_id, theme_id, child_name, language } = (body ?? {}) as Record<string, unknown>;

	const character = characters.find((c) => c.id === character_id);
	if (!character) return { ok: false, code: 'invalid_input', message: 'Please pick a character first.' };

	const theme = themes.find((t) => t.id === theme_id);
	if (!theme) return { ok: false, code: 'invalid_input', message: 'Please pick a story kind first.' };

	if (!LANGUAGES.includes(language as Language)) {
		return { ok: false, code: 'invalid_input', message: "Something's not right. Let's go back and try again." };
	}

	const childName =
		typeof child_name === 'string' && child_name.trim() ? child_name.trim().slice(0, 40) : null;

	return { ok: true, character, theme, language: language as Language, childName };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: PASS (all 5 validate tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/validate.ts src/lib/server/validate.test.ts
git commit -m "feat: pure generate-story request validation"
```

---

## Task 7: Pure story assembler (TDD)

**Files:**
- Create: `src/lib/server/assembleStory.ts`
- Test: `src/lib/server/assembleStory.test.ts`

- [ ] **Step 1: Write failing tests**

Create `src/lib/server/assembleStory.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { assembleStory } from './assembleStory';
import type { StoryTextResult } from './openaiClient';

const text: StoryTextResult = {
	title: 'Brave Mishti',
	pages: [
		{ text: 'p1', image_prompt: 'a' },
		{ text: 'p2', image_prompt: 'b' }
	],
	moral: 'Be brave.',
	reflection_question: 'What made you brave?',
	scene: 'a meadow'
};

describe('assembleStory', () => {
	it('maps page image urls in order and sets metadata', () => {
		const story = assembleStory({
			id: 'abc',
			text,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: 'Geeta',
			coverUrl: 'http://blob/cover.jpg',
			pageUrls: ['http://blob/p1.jpg', 'http://blob/p2.jpg'],
			createdAt: '2026-01-01T00:00:00Z'
		});
		expect(story.id).toBe('abc');
		expect(story.source).toBe('generated');
		expect(story.age_tag).toBe('5-8');
		expect(story.cover_image_url).toBe('http://blob/cover.jpg');
		expect(story.pages).toEqual([
			{ text: 'p1', image_url: 'http://blob/p1.jpg' },
			{ text: 'p2', image_url: 'http://blob/p2.jpg' }
		]);
		expect(story.child_name).toBe('Geeta');
	});

	it('uses empty string for a missing page url (failed/disabled image)', () => {
		const story = assembleStory({
			id: 'abc',
			text,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: null,
			coverUrl: '',
			pageUrls: ['http://blob/p1.jpg', ''],
			createdAt: '2026-01-01T00:00:00Z'
		});
		expect(story.pages[1].image_url).toBe('');
		expect(story.cover_image_url).toBe('');
	});
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: FAIL — `assembleStory.ts` does not exist.

- [ ] **Step 3: Write the assembler**

Create `src/lib/server/assembleStory.ts`:
```ts
import type { GeneratedStory, Language } from '$lib/types';
import type { StoryTextResult } from './openaiClient';

/**
 * Pure builder: combine generated text + uploaded image URLs into the final
 * GeneratedStory. pageUrls is index-aligned with text.pages; an empty string
 * means that page has no image (failed or disabled).
 */
export function assembleStory(input: {
	id: string;
	text: StoryTextResult;
	language: Language;
	character_id: string;
	theme_id: string;
	childName: string | null;
	coverUrl: string;
	pageUrls: string[];
	createdAt: string;
}): GeneratedStory {
	return {
		id: input.id,
		type: 'story',
		source: 'generated',
		language: input.language,
		age_range: '5-8',
		age_tag: '5-8',
		character_id: input.character_id,
		theme_id: input.theme_id,
		child_name: input.childName,
		title: input.text.title,
		cover_image_url: input.coverUrl,
		pages: input.text.pages.map((p, i) => ({ text: p.text, image_url: input.pageUrls[i] ?? '' })),
		moral: input.text.moral,
		reflection_question: input.text.reflection_question,
		created_at: input.createdAt
	};
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm test`
Expected: PASS (both assembleStory tests green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/assembleStory.ts src/lib/server/assembleStory.test.ts
git commit -m "feat: pure GeneratedStory assembler"
```

---

## Task 8: Database layer + schema init script

**Files:**
- Create: `src/lib/server/db.ts`
- Create: `scripts/init-db.mjs`

- [ ] **Step 1: Write the db module**

Create `src/lib/server/db.ts`:
```ts
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import type { GeneratedStory, StorySummary } from '$lib/types';

function sql() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
	return neon(env.DATABASE_URL);
}

/** Insert a fully-assembled story. The whole object is stored in the jsonb column. */
export async function insertStory(story: GeneratedStory): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO stories (id, language, title, cover_url, age_tag, story)
		VALUES (${story.id}, ${story.language}, ${story.title}, ${story.cover_image_url}, ${story.age_tag}, ${JSON.stringify(story)})
	`;
}

/** Lightweight gallery list from promoted columns only (no jsonb parse). */
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories ORDER BY created_at DESC`;
	return rows as StorySummary[];
}

/** Full story (jsonb blob) by id, or null if not found. */
export async function getStory(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id}`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}

/** Count of stories created since midnight (server time) — for the global daily cap. */
export async function countStoriesToday(): Promise<number> {
	const q = sql();
	const rows = await q`SELECT count(*)::int AS n FROM stories WHERE created_at >= date_trunc('day', now())`;
	return (rows[0]?.n as number) ?? 0;
}
```

- [ ] **Step 2: Write the schema init script**

Create `scripts/init-db.mjs`:
```js
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/init-db.mjs');
	process.exit(1);
}

const sql = neon(url);

await sql`
	CREATE TABLE IF NOT EXISTS stories (
		id uuid PRIMARY KEY,
		created_at timestamptz NOT NULL DEFAULT now(),
		language text NOT NULL,
		title text NOT NULL,
		cover_url text NOT NULL DEFAULT '',
		age_tag text NOT NULL DEFAULT '5-8',
		story jsonb NOT NULL
	)
`;
await sql`CREATE INDEX IF NOT EXISTS stories_lang_created_idx ON stories (language, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS stories_age_idx ON stories (age_tag)`;

console.log('✅ stories table ready');
```

- [ ] **Step 3: Run the init script against your Neon DB**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run db:init`
Expected: `✅ stories table ready`. (Requires `DATABASE_URL` in `.env` from Task 1 Step 5.)

- [ ] **Step 4: Verify the table exists**

Run:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
node --env-file=.env -e "import('@neondatabase/serverless').then(async ({neon})=>{const s=neon(process.env.DATABASE_URL);const r=await s\`SELECT count(*)::int n FROM stories\`;console.log('rows:',r[0].n)})"
```
Expected: `rows: 0`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/db.ts scripts/init-db.mjs
git commit -m "feat: neon db layer and schema init script"
```

---

## Task 9: Rewire generate-story endpoint (parallel images, blob, DB, daily cap)

**Files:**
- Modify: `src/routes/api/generate-story/+server.ts` (full rewrite)

- [ ] **Step 1: Rewrite the endpoint**

Replace the entire contents of `src/routes/api/generate-story/+server.ts` with:
```ts
import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { validateGenerateRequest } from '$lib/server/validate';
import { buildStoryMessages, buildImagePrompts } from '$lib/server/storyPrompt';
import { generateStoryText, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { assembleStory } from '$lib/server/assembleStory';
import { insertStory, countStoriesToday } from '$lib/server/db';

type ErrorCode = 'invalid_input' | 'rate_limit' | 'openai_failed' | 'server_error';

function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	// --- Parse + validate ---
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', "Something's not right. Let's go back and try again.", 400);
	}

	const v = validateGenerateRequest(body);
	if (!v.ok) return fail(v.code, v.message, 400);
	const { character, theme, language, childName } = v;

	// --- Global daily cost guard ---
	const cap = parseInt(env.DAILY_GENERATION_CAP ?? '20', 10);
	try {
		if ((await countStoriesToday()) >= cap) {
			return fail('rate_limit', "We've made lots of stories today. Let's make more tomorrow!", 429);
		}
	} catch (err) {
		console.error('daily cap check failed:', err instanceof Error ? err.message : 'unknown');
		return fail('server_error', "Let's try again after wifi comes back!", 500);
	}

	const withPageImages = (env.GENERATE_PAGE_IMAGES ?? 'false') === 'true';

	// --- Generate ---
	try {
		const messages = buildStoryMessages({ character, theme, childName, language });
		const text = await generateStoryText(messages);

		// Build prompts: [cover, page1..pageN]. If page images are off, only the cover.
		const imagePrompts = withPageImages
			? buildImagePrompts(character, text.scene, text.pages)
			: buildImagePrompts(character, text.scene, []); // cover only

		// Generate all images in parallel; a failed image becomes "" (no image for that slot).
		const imageResults = await Promise.all(
			imagePrompts.map((p, i) =>
				generateImage(p)
					.then((bytes) => uploadImage(bytes, `img-${i}`))
					.catch((e) => {
						console.error(`image ${i} failed:`, e instanceof Error ? e.message : 'unknown');
						return '';
					})
			)
		);

		const coverUrl = imageResults[0] ?? '';
		// When page images are disabled, there are no page URLs — assembler fills "".
		const pageUrls = withPageImages ? imageResults.slice(1) : [];

		const story = assembleStory({
			id: crypto.randomUUID(),
			text,
			language,
			character_id: character.id,
			theme_id: theme.id,
			childName,
			coverUrl,
			pageUrls,
			createdAt: new Date().toISOString()
		});

		await insertStory(story);
		return json({ story });
	} catch (err) {
		console.error('generate-story failed:', err instanceof Error ? err.message : 'unknown error');
		return fail('openai_failed', "Let's try again after wifi comes back!", 502);
	}
};
```

- [ ] **Step 2: Verify types compile**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -5`
Expected: no errors in `generate-story/+server.ts`. (Frontend errors may remain — fixed in Tasks 11-13.)

- [ ] **Step 3: Start dev server**

Run:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
pkill -f "vite dev" 2>/dev/null; sleep 1
nohup npm run dev -- --port 5178 > /tmp/ck-dev.log 2>&1 &
sleep 6; tail -3 /tmp/ck-dev.log
```
Expected: Vite ready on http://localhost:5178.

- [ ] **Step 4: Integration test — invalid input**

Run:
```bash
curl -s -X POST http://localhost:5178/api/generate-story -H "Content-Type: application/json" -d '{"character_id":"dragon","theme_id":"be_brave","language":"en"}'
```
Expected: `{"error":"invalid_input","message":"Please pick a character first."}`

- [ ] **Step 5: Integration test — real generation (cover only, cheap)**

Ensure `.env` has `GENERATE_PAGE_IMAGES=false`, then:
```bash
curl -s -o /tmp/g.json -w "HTTP %{http_code} time %{time_total}s\n" -X POST http://localhost:5178/api/generate-story -H "Content-Type: application/json" -d '{"character_id":"rabbit","theme_id":"be_brave","child_name":"Geeta","language":"en"}' --max-time 120
node -e 'const s=require("/tmp/g.json").story; console.log("title:",s.title); console.log("cover_url:",s.cover_image_url.slice(0,40)); console.log("pages:",s.pages.length,"| page image_urls:",s.pages.map(p=>p.image_url?"img":"none").join(",")); console.log("age_tag:",s.age_tag);'
```
Expected: HTTP 200; cover_url is an `https://...blob...` URL; 5 pages; page image_urls all "none" (page images disabled); age_tag "5-8".

- [ ] **Step 6: Verify it persisted to Postgres**

Run:
```bash
export PATH="/opt/homebrew/opt/node@22/bin:$PATH"
node --env-file=.env -e "import('@neondatabase/serverless').then(async ({neon})=>{const s=neon(process.env.DATABASE_URL);const r=await s\`SELECT id,title,cover_url FROM stories ORDER BY created_at DESC LIMIT 1\`;console.log(r[0])})"
```
Expected: the story row you just created, with a cover_url.

- [ ] **Step 7: Commit**

```bash
git add src/routes/api/generate-story/+server.ts
git commit -m "feat: generate-story persists to db with parallel images and daily cap"
```

---

## Task 10: Gallery read endpoints

**Files:**
- Create: `src/routes/api/stories/+server.ts`
- Create: `src/routes/api/stories/[id]/+server.ts`

- [ ] **Step 1: Write the list endpoint**

Create `src/routes/api/stories/+server.ts`:
```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listStories } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const language = url.searchParams.get('language') ?? undefined;
	try {
		const stories = await listStories(language);
		return json({ stories });
	} catch (err) {
		console.error('list stories failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load stories.' }, { status: 500 });
	}
};
```

- [ ] **Step 2: Write the single-story endpoint**

Create `src/routes/api/stories/[id]/+server.ts`:
```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStory } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const story = await getStory(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });
		return json({ story });
	} catch (err) {
		console.error('get story failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the story.' }, { status: 500 });
	}
};
```

- [ ] **Step 3: Integration test — list**

Run: `curl -s "http://localhost:5178/api/stories?language=en" | node -e 'const d=JSON.parse(require("fs").readFileSync(0));console.log("count:",d.stories.length);console.log("first:",d.stories[0]?.title, d.stories[0]?.cover_url?.slice(0,30))'`
Expected: count ≥ 1; first story title + cover_url.

- [ ] **Step 4: Integration test — single story**

Run:
```bash
ID=$(curl -s "http://localhost:5178/api/stories?language=en" | node -e 'const d=JSON.parse(require("fs").readFileSync(0));process.stdout.write(d.stories[0].id)')
curl -s "http://localhost:5178/api/stories/$ID" | node -e 'const d=JSON.parse(require("fs").readFileSync(0));console.log("title:",d.story.title,"| pages:",d.story.pages.length)'
curl -s -o /dev/null -w "bogus id -> HTTP %{http_code}\n" "http://localhost:5178/api/stories/does-not-exist"
```
Expected: real story returns title + 5 pages; bogus id returns HTTP 404.

- [ ] **Step 5: Commit**

```bash
git add src/routes/api/stories/
git commit -m "feat: shared gallery read endpoints (list + single)"
```

---

## Task 11: generatedStories store → thin API client

**Files:**
- Modify: `src/lib/stores/generatedStories.ts` (full rewrite)

- [ ] **Step 1: Rewrite the store as an API client**

Replace the entire contents of `src/lib/stores/generatedStories.ts` with:
```ts
import { writable } from 'svelte/store';
import type { GeneratedStory, Language, StorySummary } from '$lib/types';

/** Client-side daily generation count (UX only; the real cost guard is server-side). */
type RateState = { generationsToday: number; generationDate: string };

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function createGeneratedStoriesStore() {
	const initial: RateState =
		typeof window !== 'undefined'
			? JSON.parse(localStorage.getItem('curiokids_gen_rate') || '{"generationsToday":0,"generationDate":""}')
			: { generationsToday: 0, generationDate: '' };

	if (initial.generationDate !== todayStr()) {
		initial.generationsToday = 0;
		initial.generationDate = todayStr();
	}

	const { subscribe, update } = writable<RateState>(initial);

	function saveRate(state: RateState) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('curiokids_gen_rate', JSON.stringify(state));
		}
	}

	return {
		subscribe,
		/** Fetch the shared gallery list for a language. */
		async loadGallery(language: Language): Promise<StorySummary[]> {
			const res = await fetch(`/api/stories?language=${language}`);
			if (!res.ok) throw new Error('gallery load failed');
			const data = (await res.json()) as { stories: StorySummary[] };
			return data.stories;
		},
		/** Fetch one full story by id (null if not found). */
		async getStory(id: string): Promise<GeneratedStory | null> {
			const res = await fetch(`/api/stories/${id}`);
			if (res.status === 404) return null;
			if (!res.ok) throw new Error('story load failed');
			const data = (await res.json()) as { story: GeneratedStory };
			return data.story;
		},
		/** Record one successful generation for the client-side daily UX counter. */
		recordGeneration() {
			update((state) => {
				const next =
					state.generationDate === todayStr()
						? { generationsToday: state.generationsToday + 1, generationDate: todayStr() }
						: { generationsToday: 1, generationDate: todayStr() };
				saveRate(next);
				return next;
			});
		},
		/** Client-side daily limit check (3/day) for instant UX. */
		canGenerate(state: RateState): boolean {
			if (state.generationDate !== todayStr()) return true;
			return state.generationsToday < 3;
		}
	};
}

export const generatedStories = createGeneratedStoriesStore();
```

- [ ] **Step 2: Verify types compile (consumer errors expected)**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -8`
Expected: errors in `stories/+page.svelte`, `stories/[id]/+page.svelte`, `create/generating/+page.svelte` (they use the old store API) — fixed in Tasks 12-14.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/generatedStories.ts
git commit -m "refactor: generatedStories store is now a backend API client"
```

---

## Task 12: Stories grid → fetch shared gallery

**Files:**
- Modify: `src/routes/stories/+page.svelte` (full rewrite)

- [ ] **Step 1: Rewrite the grid**

Replace the entire contents of `src/routes/stories/+page.svelte` with:
```svelte
<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStories } from '$lib/data/loadContent';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Story, StorySummary } from '$lib/types';

	let curated = $state<Story[]>([]);
	let generated = $state<StorySummary[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadStories($language).then((s) => (curated = s));
		generatedStories
			.loadGallery($language)
			.then((g) => (generated = g))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	const te = $derived($language === 'te');
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>{te ? 'కథలు' : 'Stories'}</h1>
	</header>

	<div class="grid grid-cols-2 gap-4">
		{#each curated as story}
			<ContentCard
				title={story.title}
				coverImage={story.cover_image || '📖'}
				href="/stories/{story.id}"
				completed={$progress.includes(story.id)}
			/>
		{/each}

		{#each generated as gen}
			<ContentCard
				title={gen.title}
				coverImage={gen.cover_url || '✨'}
				href="/stories/{gen.id}"
				completed={$progress.includes(gen.id)}
				badge="✨"
			/>
		{/each}
	</div>

	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథలు వస్తున్నాయి...' : 'Loading stories...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథల కోసం వైఫై కావాలి.' : 'We need wifi to load new stories.'}
		</p>
	{:else if curated.length === 0 && generated.length === 0}
		<p class="text-center text-gray-400 mt-12 text-lg">No stories yet!</p>
	{/if}
</div>
```

- [ ] **Step 2: Verify grid renders in browser**

With dev server running, open http://localhost:5178 → set language → Stories. Confirm the generated story you created appears with its cover image and a ✨ badge.
Expected: generated story tile shows the real cover image (not raw text).

- [ ] **Step 3: Commit**

```bash
git add src/routes/stories/+page.svelte
git commit -m "feat: stories grid fetches shared backend gallery"
```

---

## Task 13: Story viewer → per-page images

**Files:**
- Modify: `src/routes/stories/[id]/+page.svelte` (full rewrite)

- [ ] **Step 1: Rewrite the viewer**

Replace the entire contents of `src/routes/stories/[id]/+page.svelte` with:
```svelte
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStory } from '$lib/data/loadContent';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Story, GeneratedStory } from '$lib/types';

	let story = $state<Story | GeneratedStory | null>(null);
	let notFound = $state(false);
	let pageIndex = $state(0);

	$effect(() => {
		const id = $page.params.id;
		if (!id) return;
		story = null;
		notFound = false;

		// Try the backend gallery first (generated stories).
		generatedStories.getStory(id).then((gen) => {
			if (gen) {
				story = gen;
				return;
			}
			// Fall back to curated (bundled) content.
			if ($language) {
				loadStory(id, $language).then((s) => {
					story = s;
					notFound = s === null;
				});
			} else {
				notFound = true;
			}
		}).catch(() => (notFound = true));
	});

	type ViewPage = { text: string; image_url?: string };
	const pages = $derived<ViewPage[]>(
		story
			? story.source === 'generated'
				? (story as GeneratedStory).pages
				: (story as Story).pages.map((p) => ({ text: p.text }))
			: []
	);

	const current = $derived(pages[pageIndex]);
	const isLast = $derived(pageIndex === pages.length - 1);

	function next() {
		if (!isLast) pageIndex++;
	}
	function prev() {
		if (pageIndex > 0) pageIndex--;
	}
	function done() {
		if (story) progress.markComplete(story.id);
		goto('/stories');
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex justify-end mb-4">
		<a href="/stories" class="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
			<X size={24} strokeWidth={1.5} />
		</a>
	</header>

	{#if story}
		<h2 class="text-2xl font-bold mb-4">{story.title}</h2>

		<div class="flex-1 flex flex-col justify-center">
			<div class="bg-peach/20 rounded-2xl p-6 min-h-[200px] flex flex-col items-center justify-center gap-4">
				{#if current?.image_url}
					<img src={current.image_url} alt="" class="w-full max-w-sm rounded-xl object-cover" />
				{/if}
				<p class="text-xl leading-relaxed text-center">{current?.text}</p>
			</div>
		</div>

		<div class="flex items-center justify-between mt-6">
			<button onclick={prev} disabled={pageIndex === 0} class="p-3 rounded-full bg-gray-100 disabled:opacity-30" aria-label="Previous">
				<ChevronLeft size={28} />
			</button>

			{#if isLast}
				<button onclick={done} class="px-8 py-3 rounded-full bg-mint font-bold text-lg">Done!</button>
			{:else}
				<span class="text-sm text-gray-400">{pageIndex + 1} / {pages.length}</span>
			{/if}

			<button onclick={next} disabled={isLast} class="p-3 rounded-full bg-gray-100 disabled:opacity-30" aria-label="Next">
				<ChevronRight size={28} />
			</button>
		</div>

		{#if isLast && story.moral}
			<div class="mt-4 p-4 bg-mint/20 rounded-xl text-center">
				<p class="text-base italic">{story.moral}</p>
			</div>
		{/if}
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-xl font-bold mb-6">Hmm, we can't find that story.</p>
			<a href="/stories" class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold">Back to stories</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12">Loading...</p>
	{/if}
</div>
```

- [ ] **Step 2: Verify viewer in browser**

Open the generated story from the grid. Confirm it shows the cover-less text pages (page images disabled), navigates with arrows, and shows the moral + "Done!" on the last page. Then visit `http://localhost:5178/stories/does-not-exist` and confirm the "can't find that story" screen.
Expected: story renders and navigates; bogus id shows not-found (no infinite loading).

- [ ] **Step 3: Commit**

```bash
git add src/routes/stories/[id]/+page.svelte
git commit -m "feat: story viewer fetches from backend and renders per-page images"
```

---

## Task 14: Generating screen + ContentCard placeholder + docs

**Files:**
- Modify: `src/routes/create/generating/+page.svelte:63-70`
- Modify: `src/lib/components/ContentCard.svelte:13-20`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update generating screen to use the new store API**

In `src/routes/create/generating/+page.svelte`, find the success block (currently `generatedStories.addStory(data.story); await goto(...)`). Replace:
```ts
			generatedStories.addStory(data.story);
			await goto(`/stories/${data.story.id}`);
```
with:
```ts
			generatedStories.recordGeneration();
			await goto(`/stories/${data.story.id}`);
```

- [ ] **Step 2: Verify no other old-store references remain**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; grep -rn "addStory\|cover_image_data_uri\|\.stories" src/routes src/lib/stores`
Expected: no matches (all old-API usages removed). If any remain, update them to the new API.

- [ ] **Step 3: Add missing-cover placeholder to ContentCard**

In `src/lib/components/ContentCard.svelte`, replace the cover block:
```svelte
	<div class="aspect-square bg-butter/30 flex items-center justify-center text-4xl">
		{#if coverImage.startsWith('/') || coverImage.startsWith('data:')}
			<img src={coverImage} alt={title} class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>
```
with:
```svelte
	<div class="aspect-square bg-butter/30 flex items-center justify-center text-4xl">
		{#if coverImage.startsWith('/') || coverImage.startsWith('data:') || coverImage.startsWith('http')}
			<img src={coverImage} alt={title} class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>
```

(Note: the `✨`/`📖` fallback passed by the grid already renders as the placeholder glyph when there is no cover URL.)

- [ ] **Step 4: Run full check + unit tests**

Run: `export PATH="/opt/homebrew/opt/node@22/bin:$PATH"; npm run check 2>&1 | tail -3 && npm test`
Expected: `0 ERRORS 0 WARNINGS` and all unit tests pass.

- [ ] **Step 5: Full end-to-end browser test**

With page images still off, do the whole flow in the browser: Create → pick character + theme → Make my story → lands on the new story → back to grid → story appears in shared gallery. Then in a **different browser** (or incognito), open Stories and confirm the same story appears (proves it's shared, not per-device).
Expected: story generates, opens, and is visible across browsers.

- [ ] **Step 6: (Optional) Verify page images when enabled**

Set `GENERATE_PAGE_IMAGES=true` in `.env`, restart dev server, generate one story, and confirm each page shows an image above its text. Expect ~25-35s and ~$1 cost. Set back to `false` afterward to avoid spend.

- [ ] **Step 7: Update CLAUDE.md scope**

In `CLAUDE.md`, update the persistence/backend rules to reflect reality: generated stories now live in Postgres (Neon) + Vercel Blob as a shared gallery; per-page images exist behind `GENERATE_PAGE_IMAGES`; localStorage now only holds language pref + daily rate count. Keep facts and curated stories fully offline/bundled (unchanged). Add the new env vars to the tech-stack section.

- [ ] **Step 8: Commit**

```bash
git add src/routes/create/generating/+page.svelte src/lib/components/ContentCard.svelte CLAUDE.md
git commit -m "feat: wire generating screen to backend gallery; update scope docs"
```

---

## Self-Review Notes

- **Spec coverage:** shared gallery (Tasks 9-13), per-page images + flag (Tasks 3,4,9), JSONB flexible format (Task 8), age_tag column (Tasks 2,8), Blob for covers (Tasks 5,9), no localStorage story storage (Task 11), server-side daily cap (Task 9), read endpoints (Task 10), error handling incl. text-only failed pages / not-found (Tasks 9,13), CLAUDE.md scope update (Task 14). All spec sections mapped.
- **Non-goals honored:** no identity, no admin dashboard, no age filtering logic, no offline caching, no moderation/delete, no migration of old localStorage stories.
- **Type consistency:** `GeneratedStory` (Task 2) with `pages: {text, image_url}[]`, `age_tag`, `cover_image_url` is used consistently by `assembleStory` (Task 7), `db.ts` (Task 8), the endpoint (Task 9), and the viewer (Task 13). `StorySummary` is defined in shared `$lib/types` (Task 2, Step 1b) — NOT in `$lib/server/db` — so client code (store Task 11, grid Task 12) can import it; db.ts also imports it from there. `StoryTextResult.pages` gains `image_prompt` in Task 4 and is produced by the prompt in Task 3 and consumed in Task 9.
