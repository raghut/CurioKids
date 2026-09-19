# Admin Dashboard — Increment 1 (Safety Spine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a passcode-gated admin area plus a `draft`/`published` status gate on the shared gallery, so admin content is hidden from kids until published and an operator can log in, review, publish/unpublish, and delete stories from a good responsive UI.

**Architecture:** Add a promoted `status` column to the Neon `stories` table (DB default `'draft'`, fail-safe hidden). Kid endpoints read `published` only; the kid generator keeps inserting `published`. Admin auth is a single passcode verified server-side, issuing a stateless HMAC-signed httpOnly cookie (no session store — serverless-safe). `hooks.server.ts` guards all `/admin` + `/api/admin` routes. The admin UI is one responsive SvelteKit route group (desktop data-table ↔ mobile card-list from shared data).

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Tailwind v4 (`@theme` tokens in `src/routes/layout.css`), `@neondatabase/serverless`, `@vercel/blob`, `lucide-svelte`, Vitest (node env, `src/**/*.test.ts`). Node `crypto` for HMAC. Run all npm via `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH"` first.

**Spec:** `docs/superpowers/specs/2026-09-19-admin-dashboard-inc1-design.md`

---

## File map

**New**
- `src/lib/server/adminAuth.ts` — pure auth core (sign/verify cookie, decide passcode) + env wrappers.
- `src/lib/server/adminAuth.test.ts` — unit tests for the pure core.
- `src/hooks.server.ts` — server guard for `/admin` + `/api/admin`.
- `src/routes/admin/+layout.svelte` — responsive admin shell (sidebar ↔ drawer).
- `src/routes/admin/+layout.server.ts` — exposes auth state to admin pages.
- `src/routes/admin/login/+page.svelte` — passcode login form.
- `src/routes/admin/login/+page.server.ts` — login action (verify + set cookie + 500ms fail delay) + logout.
- `src/routes/admin/+page.svelte` — story management list (table/cards + filters + actions).
- `src/routes/admin/+page.server.ts` — loads all stories via `listStoriesAdmin`.
- `src/routes/api/admin/stories/[id]/+server.ts` — POST publish/unpublish, DELETE story.
- `src/lib/components/admin/StatusChip.svelte`
- `src/lib/components/admin/FilterBar.svelte`
- `src/lib/components/admin/StoryTable.svelte` (desktop)
- `src/lib/components/admin/StoryCardList.svelte` (mobile)
- `src/lib/components/admin/ConfirmDialog.svelte`
- `scripts/add-status-column.mjs` — idempotent migration for the live DB.

**Edited**
- `src/lib/types.ts` — add `status` to `GeneratedStory`; add `AdminStorySummary`.
- `src/lib/server/assembleStory.ts` — accept + set `status`.
- `src/lib/server/assembleStory.test.ts` — cover `status`.
- `src/lib/server/db.ts` — `status` in insert; published-filter reads; new admin queries.
- `src/lib/server/blob.ts` — add `deleteImages(urls)`.
- `src/routes/api/generate-story/+server.ts` — pass `status: 'published'` to assembler.
- `scripts/init-db.mjs` — create the `status` column + index for fresh installs.
- `.env.example` — `ADMIN_PASSCODE`, `ADMIN_SESSION_SECRET`.
- `CLAUDE.md` — scope update (admin dashboard in scope; status gate; admin env vars).

**Convention note:** `db.ts` functions hit the live Neon DB and — matching the existing codebase — are **not** unit-tested (only pure modules like `validate`, `assembleStory`, `passcode` have `.test.ts`). They are verified via the migration script + manual `/admin` checks at the end. Only pure logic (`adminAuth`, `assembleStory`) gets Vitest tests.

---

## Task 1: Add `status` to types

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `status` to `GeneratedStory` and a new `AdminStorySummary` type**

In `src/lib/types.ts`, add `status` to `GeneratedStory` (after `created_at`):

```ts
export type GeneratedStory = {
	id: string;
	type: 'story';
	source: 'generated';
	language: Language;
	age_range: '5-8';
	age_tag: string;
	character_id: string;
	theme_id: string;
	child_name: string | null;
	title: string;
	cover_image_url: string;
	pages: Array<{ text: string; image_url: string }>;
	moral: string;
	reflection_question: string;
	created_at: string;
	status: 'draft' | 'published';
};
```

And add, after `StorySummary`:

```ts
export type AdminStorySummary = {
	id: string;
	title: string;
	cover_url: string;
	age_tag: string;
	language: string;
	created_at: string;
	status: 'draft' | 'published';
	character_id: string;
	theme_id: string;
};
```

- [ ] **Step 2: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: FAIL — `assembleStory.ts` now returns a `GeneratedStory` missing `status`. That is fixed in Task 2. (If you prefer green-between-tasks, do Task 2 before re-running.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add status field to GeneratedStory + AdminStorySummary type"
```

---

## Task 2: `status` in the story assembler

**Files:**
- Modify: `src/lib/server/assembleStory.ts`
- Test: `src/lib/server/assembleStory.test.ts`

- [ ] **Step 1: Add a failing test for `status`**

Append to `src/lib/server/assembleStory.test.ts` a case inside the existing `describe`:

```ts
	it('sets the status passed in', () => {
		const story = assembleStory({
			id: 'id-1',
			text: { title: 'T', pages: [{ text: 'p1' }], moral: 'm', reflection_question: 'r', scene: 's' } as never,
			language: 'en',
			character_id: 'rabbit',
			theme_id: 'be_brave',
			childName: null,
			coverUrl: '',
			pageUrls: [],
			createdAt: '2026-09-19T00:00:00.000Z',
			status: 'published'
		});
		expect(story.status).toBe('published');
	});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm test -- assembleStory`
Expected: FAIL — `status` is not an accepted input / not on the result.

- [ ] **Step 3: Implement**

In `src/lib/server/assembleStory.ts`, add `status` to the input type and the returned object:

```ts
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
	status: 'draft' | 'published';
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
		created_at: input.createdAt,
		status: input.status
	};
}
```

- [ ] **Step 4: Run tests**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm test -- assembleStory`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/assembleStory.ts src/lib/server/assembleStory.test.ts
git commit -m "feat: assembleStory sets story status"
```

---

## Task 3: Kid generator inserts `published`

**Files:**
- Modify: `src/routes/api/generate-story/+server.ts:75-85`

- [ ] **Step 1: Pass `status: 'published'` into the assembler**

In the `assembleStory({ ... })` call, add `status: 'published'` (kid creations stay live):

```ts
			const story = assembleStory({
				id: crypto.randomUUID(),
				text,
				language,
				character_id: character.id,
				theme_id: theme.id,
				childName,
				coverUrl,
				pageUrls,
				createdAt: new Date().toISOString(),
				status: 'published'
			});
```

- [ ] **Step 2: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS (types now consistent through the generate path).

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/generate-story/+server.ts
git commit -m "feat: kid-generated stories insert as published"
```

---

## Task 4: DB migration script + init-db update

**Files:**
- Create: `scripts/add-status-column.mjs`
- Modify: `scripts/init-db.mjs`

- [ ] **Step 1: Create the idempotent migration**

`scripts/add-status-column.mjs`:

```js
import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/add-status-column.mjs');
	process.exit(1);
}

const sql = neon(url);

await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`;
await sql`CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status)`;

const rows = await sql`SELECT status, count(*)::int AS n FROM stories GROUP BY status`;
console.log('✅ status column ready. Current counts:', rows.length ? rows : '(no rows)');
```

- [ ] **Step 2: Run the migration against the live DB**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && node --env-file=.env scripts/add-status-column.mjs`
Expected: `✅ status column ready. Current counts: (no rows)` (gallery is currently empty).

- [ ] **Step 3: Update `scripts/init-db.mjs` so fresh installs get the column**

In `scripts/init-db.mjs`, add `status` to the `CREATE TABLE` and add its index. Change the table body to include:

```js
		status text NOT NULL DEFAULT 'draft',
```

(place it just before the `story jsonb NOT NULL` line), and after the existing index lines add:

```js
await sql`CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status)`;
```

- [ ] **Step 4: Commit**

```bash
git add scripts/add-status-column.mjs scripts/init-db.mjs
git commit -m "feat: add status column migration + init-db schema update"
```

---

## Task 5: db.ts — status in insert, published-filter reads, admin queries

**Files:**
- Modify: `src/lib/server/db.ts`

- [ ] **Step 1: Import the admin summary type**

Change the type import at the top of `src/lib/server/db.ts`:

```ts
import type { GeneratedStory, StorySummary, AdminStorySummary } from '$lib/types';
```

- [ ] **Step 2: Add `status` to `insertStory`**

Replace the `INSERT` in `insertStory`:

```ts
export async function insertStory(story: GeneratedStory): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO stories (id, language, title, cover_url, age_tag, status, story)
		VALUES (${story.id}, ${story.language}, ${story.title}, ${story.cover_image_url}, ${story.age_tag}, ${story.status}, ${JSON.stringify(story)})
	`;
}
```

- [ ] **Step 3: Restrict kid reads to `published`**

Replace `listStories` and `getStory`:

```ts
/** Lightweight gallery list (published only) from promoted columns. */
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' AND language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' ORDER BY created_at DESC`;
	return rows as StorySummary[];
}

/** Full published story by id, or null. Drafts are treated as not-found for kids. */
export async function getStory(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id} AND status = 'published'`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}
```

- [ ] **Step 4: Add admin queries at the end of the file**

```ts
/** All stories (any status) with the fields the admin list needs. */
export async function listStoriesAdmin(): Promise<AdminStorySummary[]> {
	const q = sql();
	const rows = await q`
		SELECT id, title, cover_url, age_tag, language, created_at, status,
		       story->>'character_id' AS character_id,
		       story->>'theme_id' AS theme_id
		FROM stories
		ORDER BY created_at DESC
	`;
	return rows as AdminStorySummary[];
}

/** Full story (any status) for admin preview, or null. */
export async function getStoryAdmin(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id}`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}

/** Publish/unpublish: update the promoted column and mirror into the jsonb blob. */
export async function setStoryStatus(id: string, status: 'draft' | 'published'): Promise<void> {
	const q = sql();
	await q`
		UPDATE stories
		SET status = ${status},
		    story = jsonb_set(story, '{status}', to_jsonb(${status}::text))
		WHERE id = ${id}
	`;
}

/** Hard-delete a story row (Blob deletion is handled by the caller). */
export async function deleteStory(id: string): Promise<void> {
	const q = sql();
	await q`DELETE FROM stories WHERE id = ${id}`;
}
```

- [ ] **Step 5: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/server/db.ts
git commit -m "feat: db status support — published-only kid reads + admin queries"
```

---

## Task 6: blob.ts — `deleteImages`

**Files:**
- Modify: `src/lib/server/blob.ts`

- [ ] **Step 1: Add a batch delete helper**

Append to `src/lib/server/blob.ts`:

```ts
import { del } from '@vercel/blob';

/**
 * Delete images from Vercel Blob by URL. Ignores empty strings and non-Blob
 * URLs. A failed delete is logged but never throws (best-effort cleanup).
 */
export async function deleteImages(urls: Array<string | null | undefined>): Promise<void> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const targets = [...new Set(urls.filter((u): u is string => !!u && u.includes('blob.vercel-storage.com')))];
	if (!targets.length) return;
	try {
		await del(targets, { token: env.BLOB_READ_WRITE_TOKEN });
	} catch (e) {
		console.error('blob delete failed:', e instanceof Error ? e.message : 'unknown');
	}
}
```

Note: merge the `import { del }` into the existing `import { put } from '@vercel/blob';` line → `import { put, del } from '@vercel/blob';` rather than adding a second import.

- [ ] **Step 2: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/blob.ts
git commit -m "feat: deleteImages helper for Vercel Blob cleanup"
```

---

## Task 7: Admin auth core (pure) + tests

**Files:**
- Create: `src/lib/server/adminAuth.ts`
- Test: `src/lib/server/adminAuth.test.ts`

- [ ] **Step 1: Write failing tests**

`src/lib/server/adminAuth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { signSession, verifySession, decideAdminPasscode } from './adminAuth';

const SECRET = 'test-secret-1234567890';

describe('adminAuth session cookie', () => {
	it('signs and verifies a fresh session', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		expect(verifySession(value, SECRET, now)).toBe(true);
	});

	it('rejects an expired session', () => {
		const now = 1_000_000;
		const value = signSession(now - 1, SECRET);
		expect(verifySession(value, SECRET, now)).toBe(false);
	});

	it('rejects a tampered mac', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		const tampered = value.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
		expect(verifySession(tampered, SECRET, now)).toBe(false);
	});

	it('rejects the wrong secret', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		expect(verifySession(value, 'other-secret', now)).toBe(false);
	});

	it('rejects malformed / empty values', () => {
		const now = 1_000_000;
		expect(verifySession('', SECRET, now)).toBe(false);
		expect(verifySession('nodot', SECRET, now)).toBe(false);
		expect(verifySession(undefined, SECRET, now)).toBe(false);
		expect(verifySession(signSession(now + 1, SECRET), '', now)).toBe(false);
	});
});

describe('decideAdminPasscode', () => {
	it('accepts the exact passcode', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', 'hunter2hunter2hunter2')).toBe(true);
	});
	it('trims the provided value', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', '  hunter2hunter2hunter2  ')).toBe(true);
	});
	it('rejects a wrong passcode', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', 'nope')).toBe(false);
	});
	it('rejects when the expected passcode is unset (admin disabled)', () => {
		expect(decideAdminPasscode('', 'anything')).toBe(false);
		expect(decideAdminPasscode('   ', 'anything')).toBe(false);
	});
	it('rejects empty input', () => {
		expect(decideAdminPasscode('secretsecretsecret', '')).toBe(false);
		expect(decideAdminPasscode('secretsecretsecret', null)).toBe(false);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm test -- adminAuth`
Expected: FAIL — module `./adminAuth` not found.

- [ ] **Step 3: Implement `adminAuth.ts`**

`src/lib/server/adminAuth.ts`:

```ts
import { env } from '$env/dynamic/private';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

/**
 * Admin auth core. NOT the family passcode — this is a separate, stronger door
 * code (ADMIN_PASSCODE) plus a stateless, HMAC-signed session cookie. No session
 * store: any serverless instance can verify any cookie from the secret alone.
 * Pure functions here are unit-tested; the env-reading wrappers are thin.
 */

export const COOKIE_NAME = 'ck_admin';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // ~7 days

/** Constant-time equality via sha256 (no length or timing leak). */
export function constantTimeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** Cookie value = "<expiryEpochMs>.<hex hmac(expiry, secret)>". */
export function signSession(expiryMs: number, secret: string): string {
	const mac = createHmac('sha256', secret).update(String(expiryMs)).digest('hex');
	return `${expiryMs}.${mac}`;
}

/** Verify signature + expiry. `now` is epoch ms. */
export function verifySession(value: string | null | undefined, secret: string, now: number): boolean {
	if (!value || !secret) return false;
	const dot = value.indexOf('.');
	if (dot <= 0) return false;
	const expiryStr = value.slice(0, dot);
	const mac = value.slice(dot + 1);
	const expiry = Number(expiryStr);
	if (!Number.isFinite(expiry) || expiry <= now) return false;
	const expected = createHmac('sha256', secret).update(expiryStr).digest('hex');
	return constantTimeEqual(mac, expected);
}

/** Pure passcode decision. Empty/whitespace expected → admin disabled → reject. */
export function decideAdminPasscode(expected: string, provided: string | null | undefined): boolean {
	const e = (expected ?? '').trim();
	if (!e) return false; // admin not configured → closed
	if (!provided || !provided.trim()) return false;
	return constantTimeEqual(provided.trim(), e);
}

// --- Env wrappers (thin; not unit-tested) ---

/** The HMAC signing secret: ADMIN_SESSION_SECRET, or ADMIN_PASSCODE as fallback. */
export function adminSessionSecret(): string {
	const s = (env.ADMIN_SESSION_SECRET ?? '').trim();
	return s || (env.ADMIN_PASSCODE ?? '').trim();
}

/** Whether admin is configured at all (ADMIN_PASSCODE set). */
export function isAdminConfigured(): boolean {
	return (env.ADMIN_PASSCODE ?? '').trim().length > 0;
}

/** Check a login attempt against ADMIN_PASSCODE. */
export function checkAdminPasscode(provided: string | null | undefined): boolean {
	return decideAdminPasscode(env.ADMIN_PASSCODE ?? '', provided);
}

/** Verify the cookie value against the configured secret. */
export function verifyAdminCookie(value: string | null | undefined): boolean {
	return verifySession(value, adminSessionSecret(), Date.now());
}

/** Build a fresh signed cookie value for a successful login. */
export function freshCookieValue(): string {
	return signSession(Date.now() + SESSION_TTL_MS, adminSessionSecret());
}
```

- [ ] **Step 4: Run tests**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm test -- adminAuth`
Expected: PASS (all cases).

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/adminAuth.ts src/lib/server/adminAuth.test.ts
git commit -m "feat: admin auth core — signed session cookie + passcode decision"
```

---

## Task 8: Server guard in `hooks.server.ts`

**Files:**
- Create: `src/hooks.server.ts`

- [ ] **Step 1: Implement the guard**

`src/hooks.server.ts`:

```ts
import { redirect, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { COOKIE_NAME, verifyAdminCookie, isAdminConfigured } from '$lib/server/adminAuth';

const LOGIN_PATH = '/admin/login';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

	if (isAdminArea) {
		// Admin must be explicitly enabled; never silently open.
		if (!isAdminConfigured()) {
			return json(
				{ error: 'not_configured', message: 'Admin is not set up on this deployment.' },
				{ status: 503 }
			);
		}

		const authed = verifyAdminCookie(event.cookies.get(COOKIE_NAME));
		event.locals.admin = authed;

		const isLogin = pathname === LOGIN_PATH || pathname.startsWith('/admin/login');
		if (!authed && !isLogin) {
			if (pathname.startsWith('/api/admin')) {
				return json({ error: 'unauthorized', message: 'Please log in.' }, { status: 401 });
			}
			throw redirect(303, LOGIN_PATH);
		}
		// Already logged in and visiting the login page → send to dashboard.
		if (authed && isLogin) {
			throw redirect(303, '/admin');
		}
	}

	return resolve(event);
};
```

- [ ] **Step 2: Declare `locals.admin` for TypeScript**

In `src/app.d.ts`, add `admin` to the `Locals` interface (create the file's `App` namespace entry if empty). The `Locals` block should read:

```ts
		interface Locals {
			admin?: boolean;
		}
```

- [ ] **Step 3: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks.server.ts src/app.d.ts
git commit -m "feat: hooks.server guard for /admin and /api/admin"
```

---

## Task 9: Login route (form action + cookie + fail delay) and logout

**Files:**
- Create: `src/routes/admin/login/+page.server.ts`
- Create: `src/routes/admin/login/+page.svelte`

- [ ] **Step 1: Implement the login/logout actions**

`src/routes/admin/login/+page.server.ts`:

```ts
import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { COOKIE_NAME, SESSION_TTL_MS, checkAdminPasscode, freshCookieValue } from '$lib/server/adminAuth';

const FAIL_DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const passcode = String(form.get('passcode') ?? '');

		if (!checkAdminPasscode(passcode)) {
			await sleep(FAIL_DELAY_MS); // stateless throttle against rapid guessing
			return fail(401, { error: 'Wrong passcode.' });
		}

		cookies.set(COOKIE_NAME, freshCookieValue(), {
			path: '/',
			httpOnly: true,
			secure: true,
			sameSite: 'strict',
			maxAge: Math.floor(SESSION_TTL_MS / 1000)
		});
		throw redirect(303, '/admin');
	},

	logout: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
```

- [ ] **Step 2: Implement the login page**

`src/routes/admin/login/+page.svelte`:

```svelte
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock } from 'lucide-svelte';
	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>CurioKids Admin — Sign in</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
		<div class="mb-6 flex flex-col items-center gap-2 text-center">
			<span class="grid h-12 w-12 place-items-center rounded-full bg-peach/30 text-coral">
				<Lock size={22} strokeWidth={1.5} />
			</span>
			<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">
				Admin
			</h1>
			<p class="text-sm text-slate-500">Enter the admin passcode to continue.</p>
		</div>

		<form
			method="POST"
			action="?/login"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="flex flex-col gap-4"
		>
			<input
				name="passcode"
				type="password"
				autocomplete="current-password"
				placeholder="Passcode"
				required
				class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/40"
			/>

			{#if form?.error}
				<p class="text-sm text-coral" role="alert">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-xl bg-coral py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-60"
			>
				{submitting ? 'Checking…' : 'Sign in'}
			</button>
		</form>
	</div>
</div>
```

- [ ] **Step 3: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/login
git commit -m "feat: admin login/logout with signed cookie and fail delay"
```

---

## Task 10: Admin shell layout (responsive) + layout load

**Files:**
- Create: `src/routes/admin/+layout.server.ts`
- Create: `src/routes/admin/+layout.svelte`

- [ ] **Step 1: Expose auth state to admin pages**

`src/routes/admin/+layout.server.ts`:

```ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = ({ locals, url }) => {
	return { admin: locals.admin ?? false, pathname: url.pathname };
};
```

- [ ] **Step 2: Implement the shell (sidebar on desktop, drawer on mobile)**

`src/routes/admin/+layout.svelte`:

```svelte
<script lang="ts">
	import '../layout.css';
	import { LayoutGrid, LogOut, Menu, X } from 'lucide-svelte';
	let { children, data } = $props();
	let drawerOpen = $state(false);

	const isLogin = $derived((data?.pathname ?? '').startsWith('/admin/login'));
</script>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-slate-50 text-slate-800">
		<!-- Top bar (mobile) -->
		<header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
			<button
				aria-label="Open menu"
				class="grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
				onclick={() => (drawerOpen = true)}
			>
				<Menu size={22} strokeWidth={1.5} />
			</button>
			<span class="font-[family-name:var(--font-fraunces)] text-lg font-bold">CurioKids Admin</span>
			<span class="w-11"></span>
		</header>

		<div class="lg:flex">
			<!-- Sidebar (desktop) -->
			<aside class="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
				{@render nav()}
			</aside>

			<!-- Drawer (mobile) -->
			{#if drawerOpen}
				<div class="fixed inset-0 z-40 lg:hidden">
					<button
						aria-label="Close menu"
						class="absolute inset-0 bg-slate-900/30"
						onclick={() => (drawerOpen = false)}
					></button>
					<aside class="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl">
						<div class="mb-4 flex items-center justify-between">
							<span class="font-[family-name:var(--font-fraunces)] text-lg font-bold">Admin</span>
							<button
								aria-label="Close menu"
								class="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
								onclick={() => (drawerOpen = false)}
							>
								<X size={20} strokeWidth={1.5} />
							</button>
						</div>
						{@render nav()}
					</aside>
				</div>
			{/if}

			<main class="min-w-0 flex-1 p-4 lg:p-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

{#snippet nav()}
	<nav class="flex h-full flex-col gap-1">
		<a
			href="/admin"
			class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
			onclick={() => (drawerOpen = false)}
		>
			<LayoutGrid size={18} strokeWidth={1.5} /> Stories
		</a>
		<form method="POST" action="/admin/login?/logout" class="mt-auto">
			<button
				type="submit"
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
			>
				<LogOut size={18} strokeWidth={1.5} /> Sign out
			</button>
		</form>
	</nav>
{/snippet}
```

- [ ] **Step 3: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/routes/admin/+layout.server.ts src/routes/admin/+layout.svelte
git commit -m "feat: responsive admin shell (sidebar + mobile drawer)"
```

---

## Task 11: Admin UI components

**Files:**
- Create: `src/lib/components/admin/StatusChip.svelte`
- Create: `src/lib/components/admin/FilterBar.svelte`
- Create: `src/lib/components/admin/ConfirmDialog.svelte`
- Create: `src/lib/components/admin/StoryTable.svelte`
- Create: `src/lib/components/admin/StoryCardList.svelte`

- [ ] **Step 1: `StatusChip.svelte` (color + label, never color alone)**

```svelte
<script lang="ts">
	import { Check, PencilLine } from 'lucide-svelte';
	let { status }: { status: 'draft' | 'published' } = $props();
</script>

{#if status === 'published'}
	<span class="inline-flex items-center gap-1 rounded-full bg-mint/40 px-2.5 py-1 text-xs font-bold text-emerald-700">
		<Check size={13} strokeWidth={2} /> Published
	</span>
{:else}
	<span class="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
		<PencilLine size={13} strokeWidth={2} /> Draft
	</span>
{/if}
```

- [ ] **Step 2: `FilterBar.svelte` (bindable filters; inline on desktop, stacks on mobile)**

```svelte
<script lang="ts">
	import { Search } from 'lucide-svelte';
	let {
		search = $bindable(''),
		status = $bindable('all'),
		language = $bindable('all')
	}: {
		search: string;
		status: 'all' | 'draft' | 'published';
		language: 'all' | 'en' | 'te';
	} = $props();

	const selectClass =
		'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-blue';
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
	<label class="relative flex-1">
		<span class="sr-only">Search by title</span>
		<Search size={16} strokeWidth={1.5} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
		<input
			bind:value={search}
			type="search"
			placeholder="Search title…"
			class="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-blue"
		/>
	</label>
	<select bind:value={status} class={selectClass} aria-label="Filter by status">
		<option value="all">All statuses</option>
		<option value="draft">Draft</option>
		<option value="published">Published</option>
	</select>
	<select bind:value={language} class={selectClass} aria-label="Filter by language">
		<option value="all">All languages</option>
		<option value="en">English</option>
		<option value="te">Telugu</option>
	</select>
</div>
```

- [ ] **Step 3: `ConfirmDialog.svelte` (accessible; Esc closes; no native `confirm()`)**

```svelte
<script lang="ts">
	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirm',
		destructive = false,
		onconfirm
	}: {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		destructive?: boolean;
		onconfirm: () => void;
	} = $props();

	function close() {
		open = false;
	}
	function confirm() {
		onconfirm();
		open = false;
	}
</script>

<svelte:window on:keydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
		<button class="absolute inset-0 bg-slate-900/40" aria-label="Close" onclick={close}></button>
		<div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
			<h2 class="text-lg font-bold text-slate-800">{title}</h2>
			<p class="mt-2 text-sm text-slate-600">{message}</p>
			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={close}
					class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
				>
					Cancel
				</button>
				<button
					onclick={confirm}
					class="rounded-lg px-4 py-2 text-sm font-bold text-white {destructive ? 'bg-coral' : 'bg-sky-blue'} hover:brightness-105"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
```

- [ ] **Step 4: `StoryTable.svelte` (desktop; `md+` only)**

```svelte
<script lang="ts">
	import type { AdminStorySummary } from '$lib/types';
	import StatusChip from './StatusChip.svelte';
	import { Eye, Send, EyeOff, Trash2 } from 'lucide-svelte';
	let {
		stories,
		onpreview,
		ontoggle,
		ondelete
	}: {
		stories: AdminStorySummary[];
		onpreview: (s: AdminStorySummary) => void;
		ontoggle: (s: AdminStorySummary) => void;
		ondelete: (s: AdminStorySummary) => void;
	} = $props();
	const iconBtn = 'grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100';
</script>

<div class="hidden overflow-x-auto rounded-xl ring-1 ring-slate-200 md:block">
	<table class="w-full min-w-[720px] border-collapse text-left text-sm">
		<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
			<tr>
				<th class="px-4 py-3 font-semibold">Story</th>
				<th class="px-4 py-3 font-semibold">Lang</th>
				<th class="px-4 py-3 font-semibold">Character</th>
				<th class="px-4 py-3 font-semibold">Theme</th>
				<th class="px-4 py-3 font-semibold">Status</th>
				<th class="px-4 py-3 text-right font-semibold">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each stories as s (s.id)}
				<tr class="hover:bg-slate-50/70">
					<td class="px-4 py-3">
						<div class="flex items-center gap-3">
							{#if s.cover_url}
								<img src={s.cover_url} alt="" class="h-10 w-10 shrink-0 rounded-md object-cover" />
							{:else}
								<div class="h-10 w-10 shrink-0 rounded-md bg-slate-200"></div>
							{/if}
							<span class="font-semibold text-slate-800">{s.title}</span>
						</div>
					</td>
					<td class="px-4 py-3 uppercase text-slate-500">{s.language}</td>
					<td class="px-4 py-3 text-slate-600">{s.character_id}</td>
					<td class="px-4 py-3 text-slate-600">{s.theme_id}</td>
					<td class="px-4 py-3"><StatusChip status={s.status} /></td>
					<td class="px-4 py-3">
						<div class="flex justify-end gap-1">
							<button class={iconBtn} title="Preview" aria-label="Preview" onclick={() => onpreview(s)}>
								<Eye size={17} strokeWidth={1.5} />
							</button>
							<button
								class={iconBtn}
								title={s.status === 'published' ? 'Unpublish' : 'Publish'}
								aria-label={s.status === 'published' ? 'Unpublish' : 'Publish'}
								onclick={() => ontoggle(s)}
							>
								{#if s.status === 'published'}
									<EyeOff size={17} strokeWidth={1.5} />
								{:else}
									<Send size={17} strokeWidth={1.5} />
								{/if}
							</button>
							<button class="{iconBtn} hover:text-coral" title="Delete" aria-label="Delete" onclick={() => ondelete(s)}>
								<Trash2 size={17} strokeWidth={1.5} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
```

- [ ] **Step 5: `StoryCardList.svelte` (mobile; below `md`)**

```svelte
<script lang="ts">
	import type { AdminStorySummary } from '$lib/types';
	import StatusChip from './StatusChip.svelte';
	import { Eye, Send, EyeOff, Trash2 } from 'lucide-svelte';
	let {
		stories,
		onpreview,
		ontoggle,
		ondelete
	}: {
		stories: AdminStorySummary[];
		onpreview: (s: AdminStorySummary) => void;
		ontoggle: (s: AdminStorySummary) => void;
		ondelete: (s: AdminStorySummary) => void;
	} = $props();
	const action = 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold';
</script>

<div class="flex flex-col gap-3 md:hidden">
	{#each stories as s (s.id)}
		<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
			<div class="flex items-center gap-3">
				{#if s.cover_url}
					<img src={s.cover_url} alt="" class="h-14 w-14 shrink-0 rounded-lg object-cover" />
				{:else}
					<div class="h-14 w-14 shrink-0 rounded-lg bg-slate-200"></div>
				{/if}
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold text-slate-800">{s.title}</p>
					<p class="text-xs text-slate-500">{s.character_id} · {s.theme_id} · {s.language.toUpperCase()}</p>
					<div class="mt-1"><StatusChip status={s.status} /></div>
				</div>
			</div>
			<div class="mt-3 flex gap-2">
				<button class="{action} bg-slate-100 text-slate-600" onclick={() => onpreview(s)}>
					<Eye size={16} strokeWidth={1.5} /> Preview
				</button>
				<button class="{action} bg-sky-blue/20 text-slate-700" onclick={() => ontoggle(s)}>
					{#if s.status === 'published'}
						<EyeOff size={16} strokeWidth={1.5} /> Unpublish
					{:else}
						<Send size={16} strokeWidth={1.5} /> Publish
					{/if}
				</button>
				<button class="{action} bg-coral/15 text-coral" onclick={() => ondelete(s)}>
					<Trash2 size={16} strokeWidth={1.5} />
				</button>
			</div>
		</div>
	{/each}
</div>
```

- [ ] **Step 6: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/admin
git commit -m "feat: admin UI components (chip, filters, dialog, table, card list)"
```

---

## Task 12: Admin API — publish/unpublish/delete

**Files:**
- Create: `src/routes/api/admin/stories/[id]/+server.ts`

- [ ] **Step 1: Implement the endpoint**

`src/routes/api/admin/stories/[id]/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStoryAdmin, setStoryStatus, deleteStory } from '$lib/server/db';
import { deleteImages } from '$lib/server/blob';

// Auth is enforced in hooks.server.ts (all /api/admin/* require a valid cookie).

export const POST: RequestHandler = async ({ params, request }) => {
	let body: { action?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	if (body.action !== 'publish' && body.action !== 'unpublish') {
		return json({ error: 'invalid_input', message: 'Unknown action.' }, { status: 400 });
	}

	const status = body.action === 'publish' ? 'published' : 'draft';
	try {
		await setStoryStatus(params.id, status);
		return json({ ok: true, status });
	} catch (err) {
		console.error('setStoryStatus failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not update the story.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const story = await getStoryAdmin(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });

		// Recovery trail: serverless FS is read-only, so log the full row before deleting.
		console.log('[admin] deleting story backup:', JSON.stringify(story));

		const urls = [story.cover_image_url, ...story.pages.map((p) => p.image_url)];
		await deleteImages(urls);
		await deleteStory(params.id);
		return json({ ok: true });
	} catch (err) {
		console.error('delete story failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not delete the story.' }, { status: 500 });
	}
};
```

- [ ] **Step 2: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/admin/stories
git commit -m "feat: admin API — publish/unpublish and delete (row + blob)"
```

---

## Task 13: Admin story list page (loads data, wires filters + actions + preview)

**Files:**
- Create: `src/routes/admin/+page.server.ts`
- Create: `src/routes/admin/+page.svelte`

- [ ] **Step 1: Load all stories**

`src/routes/admin/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { listStoriesAdmin } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const stories = await listStoriesAdmin();
		return { stories };
	} catch (err) {
		console.error('admin list failed:', err instanceof Error ? err.message : 'unknown');
		return { stories: [], loadError: true };
	}
};
```

- [ ] **Step 2: Implement the page (filters, responsive list, actions, preview modal)**

`src/routes/admin/+page.svelte`:

```svelte
<script lang="ts">
	import type { AdminStorySummary, GeneratedStory } from '$lib/types';
	import FilterBar from '$lib/components/admin/FilterBar.svelte';
	import StoryTable from '$lib/components/admin/StoryTable.svelte';
	import StoryCardList from '$lib/components/admin/StoryCardList.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import { invalidateAll } from '$app/navigation';
	import { X } from 'lucide-svelte';

	let { data } = $props();

	let search = $state('');
	let status = $state<'all' | 'draft' | 'published'>('all');
	let language = $state<'all' | 'en' | 'te'>('all');

	let busy = $state(false);
	let errorMsg = $state('');

	// Delete confirm
	let confirmOpen = $state(false);
	let pendingDelete = $state<AdminStorySummary | null>(null);

	// Preview
	let previewStory = $state<GeneratedStory | null>(null);
	let previewLoading = $state(false);

	const filtered = $derived(
		(data.stories as AdminStorySummary[]).filter((s) => {
			if (status !== 'all' && s.status !== status) return false;
			if (language !== 'all' && s.language !== language) return false;
			if (search.trim() && !s.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
			return true;
		})
	);

	async function toggle(s: AdminStorySummary) {
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/stories/${s.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: s.status === 'published' ? 'unpublish' : 'publish' })
			});
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not update that story. Try again.';
		} finally {
			busy = false;
		}
	}

	function askDelete(s: AdminStorySummary) {
		pendingDelete = s;
		confirmOpen = true;
	}

	async function doDelete() {
		if (!pendingDelete) return;
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/stories/${pendingDelete.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not delete that story. Try again.';
		} finally {
			busy = false;
			pendingDelete = null;
		}
	}

	async function preview(s: AdminStorySummary) {
		previewLoading = true;
		previewStory = null;
		try {
			// Admin preview endpoint returns any status (drafts included).
			const res = await fetch(`/api/admin/stories/${s.id}?preview=1`);
			if (res.ok) previewStory = (await res.json()).story ?? null;
		} finally {
			previewLoading = false;
		}
	}
</script>

<svelte:head><title>CurioKids Admin — Stories</title></svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Stories</h1>
		<span class="text-sm text-slate-500">{filtered.length} shown</span>
	</div>

	<div class="mb-4">
		<FilterBar bind:search bind:status bind:language />
	</div>

	{#if errorMsg}
		<p class="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">{errorMsg}</p>
	{/if}

	{#if data.loadError}
		<p class="rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-500">
			Couldn’t load stories. Refresh to try again.
		</p>
	{:else if filtered.length === 0}
		<p class="rounded-lg bg-slate-100 px-4 py-10 text-center text-slate-500">No stories match.</p>
	{:else}
		<div class:opacity-60={busy} class:pointer-events-none={busy}>
			<StoryTable stories={filtered} onpreview={preview} ontoggle={toggle} ondelete={askDelete} />
			<StoryCardList stories={filtered} onpreview={preview} ontoggle={toggle} ondelete={askDelete} />
		</div>
	{/if}
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete this story?"
	message="This permanently removes the story and its images. This cannot be undone."
	confirmLabel="Delete"
	destructive
	onconfirm={doDelete}
/>

{#if previewLoading || previewStory}
	<div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
		<div class="my-8 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-bold text-slate-800">Preview</h2>
				<button
					aria-label="Close preview"
					class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
					onclick={() => (previewStory = null)}
				>
					<X size={18} strokeWidth={1.5} />
				</button>
			</div>
			{#if previewLoading}
				<p class="py-8 text-center text-slate-400">Loading…</p>
			{:else if previewStory}
				{#if previewStory.cover_image_url}
					<img src={previewStory.cover_image_url} alt="" class="mb-4 w-full rounded-xl object-cover" />
				{/if}
				<h3 class="mb-3 font-[family-name:var(--font-fraunces)] text-xl font-bold" lang={previewStory.language}>
					{previewStory.title}
				</h3>
				<div class="flex flex-col gap-4">
					{#each previewStory.pages as p, i (i)}
						<p class="text-base leading-relaxed text-slate-700" lang={previewStory.language}>{p.text}</p>
					{/each}
				</div>
				<p class="mt-4 rounded-lg bg-mint/20 px-3 py-2 text-sm text-slate-700" lang={previewStory.language}>
					{previewStory.moral}
				</p>
			{/if}
		</div>
	</div>
{/if}
```

- [ ] **Step 3: Add the admin preview branch to the API (GET with `?preview=1`)**

The page's preview fetches `GET /api/admin/stories/[id]?preview=1`. Add a `GET` handler to `src/routes/api/admin/stories/[id]/+server.ts`:

```ts
export const GET: RequestHandler = async ({ params, url }) => {
	if (url.searchParams.get('preview') !== '1') {
		return json({ error: 'invalid_input', message: 'Unsupported.' }, { status: 400 });
	}
	try {
		const story = await getStoryAdmin(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });
		return json({ story });
	} catch (err) {
		console.error('admin preview failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the story.' }, { status: 500 });
	}
};
```

- [ ] **Step 4: Typecheck**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/routes/admin/+page.server.ts src/routes/admin/+page.svelte src/routes/api/admin/stories
git commit -m "feat: admin story list — filters, responsive list, publish/delete, preview"
```

---

## Task 14: Env template + CLAUDE.md scope update

**Files:**
- Modify: `.env.example`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Add admin env vars to `.env.example`**

Append:

```bash
# Admin dashboard (content production tool). Admin is OFF unless ADMIN_PASSCODE is set.
# Use a STRONG value — 16+ random characters (e.g. `openssl rand -base64 24`).
ADMIN_PASSCODE=
# HMAC secret for the admin session cookie. If blank, ADMIN_PASSCODE is used as the secret.
# Recommended: set a distinct random value.
ADMIN_SESSION_SECRET=
```

- [ ] **Step 2: Update `CLAUDE.md` scope**

In `CLAUDE.md`:
- In the **Out of scope** list, change the admin-dashboard / moderation-delete entries to note they are **now in scope (approved 2026-09-19)** via the admin dashboard, gated by `ADMIN_PASSCODE`, with a `draft`/`published` status gate. Keep "no per-user accounts / real auth" out of scope (that stays Phase 3).
- In **Env vars**, add `ADMIN_PASSCODE` and `ADMIN_SESSION_SECRET` with one-line descriptions.
- Add a short note under the backend section: the `stories` table has a `status` column; the kid endpoints (`/api/stories`, `/api/stories/[id]`) return `published` only; admin content is `draft` by default; kid-generated stories insert as `published`.

- [ ] **Step 3: Run full gates**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check && npm test`
Expected: check PASS; all tests PASS (existing + `adminAuth` + `assembleStory` status case).

- [ ] **Step 4: Commit**

```bash
git add .env.example CLAUDE.md
git commit -m "docs: env template + CLAUDE.md scope update for admin dashboard"
```

---

## Task 15: End-to-end manual verification

**Files:** none (verification only). Requires `ADMIN_PASSCODE` set locally in `.env`.

- [ ] **Step 1: Set a local admin passcode**

Add to `.env` (gitignored): `ADMIN_PASSCODE=` a 16+ char random string, e.g. from `openssl rand -base64 24`.

- [ ] **Step 2: Start dev and seed one draft + one published story**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run dev` (background).
Seed two rows via a throwaway node script or by generating one via the kid `/create` flow (lands `published`) and inserting one draft directly with `node --env-file=.env` calling a tiny insert. (A quick seed script is acceptable and can be deleted after.)

- [ ] **Step 3: Verify the guard and login**

- Visit `/admin` unauthenticated → redirected to `/admin/login`.
- `GET /api/admin/stories/<id>` (e.g. via curl, no cookie) → `401`.
- Submit a wrong passcode → error shown after ~500ms; still on login.
- Submit the correct passcode → redirected to `/admin`.

- [ ] **Step 4: Verify management + gate**

- `/admin` lists both stories with correct status chips; filters (status/language/search) narrow the list; layout is a table on desktop and cards on mobile (resize / DevTools 375px — no horizontal body scroll).
- Preview opens and shows the story as a child sees it (works for the draft too).
- Publish the draft → chip flips to Published; confirm the kid endpoint now returns it: `GET /api/stories` includes it.
- Unpublish it → `GET /api/stories` no longer includes it; `GET /api/stories/<id>` returns 404.
- Delete a story via the confirm dialog → row disappears; server log shows the `[admin] deleting story backup:` line; the row is gone from `GET /api/admin` after refresh; its Blob cover URL 404s.

- [ ] **Step 5: Confirm gates still green and stop dev**

Run: `export PATH="$HOME/.nvm/versions/node/v22.23.1/bin:$PATH" && npm run check && npm test`
Expected: PASS. Stop the dev server. Delete any throwaway seed script.

---

## Self-review notes (author)

- **Spec coverage:** status column + fail-safe default (Task 4/5), kid published-only reads (Task 5), kid inserts published (Task 3), stateless signed cookie + strong-passcode + 500ms delay (Tasks 7/9), server guard incl. 503-when-unconfigured (Task 8), admin list/filters/preview/publish/unpublish/delete + blob delete + log-before-delete (Tasks 11–13), responsive table↔cards + drawer shell + accessibility (Tasks 10–11), env + CLAUDE.md (Task 14), verification incl. 375px + gate flip (Task 15). All spec sections map to a task.
- **Types:** `AdminStorySummary`, `GeneratedStory.status`, and `assembleStory`'s `status` input are defined in Tasks 1–2 and used consistently in Tasks 5, 12, 13.
- **Deviation from spec wording:** delete logs the row rather than writing a backup *file* (serverless FS is read-only) — spec updated to match.
- **Convention:** `db.ts` remains untested by Vitest (matches existing repo); verified via migration + Task 15. Only pure logic is unit-tested.
```
