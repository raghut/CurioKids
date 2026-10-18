# Fact Editing (A2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Let an operator fix a generated fact after the fact — edit every language's words side by side, edit and regenerate any picture, and generate a missing language block.

**Spec:** increment A2 of `docs/superpowers/specs/2026-10-18-admin-driven-facts-design.md`.

**Decisions (approved 2026-10-18):**
1. **Languages side by side**, not tabs — the reason to open this page is to fix a translation that drifted, and tabs hide exactly the comparison you need.
2. **A missing language can be generated** (~₹0.5, text only) and then corrected by hand in the same fields.
3. **Title, subtitle, reflection question and mission are editable**, unlike the story page which leaves its equivalents alone — a fact's title is the question on the card.

**What makes this different from story editing:**
- **Images are shared across languages.** Regenerating one picture changes it for every language. The UI must say so.
- **Every language's `sections` array must stay positionally aligned with `structure`.** Nothing here may add, remove or reorder sections; that would break the shared `section_images` index.

**Node:** `source ~/.nvm/nvm.sh && nvm use 22.23.1`. **No `npm run lint`** exists. **Never read or submit `ADMIN_PASSCODE`/`CREATE_PASSCODE`; never modify `.env`.** **No `confirm()`/`alert()`/`prompt()`.**

---

## Task 1: `updateFact` + the pure edit module

**Files:** modify `src/lib/server/db.ts`; create `src/lib/server/factEdit.ts` + `factEdit.test.ts`

- [ ] **Step 1: Add `updateFact` to `db.ts`**

Append to the Facts section, mirroring `updateStory`:

```ts
/**
 * Overwrite a fact's JSONB and re-sync the promoted columns that mirror it, the way
 * updateStory and setFactStatus keep column and blob in step.
 */
export async function updateFact(fact: FactRecord): Promise<void> {
	const q = sql();
	await q`
		UPDATE facts
		SET fact = ${JSON.stringify(fact)},
		    topic = ${fact.topic},
		    status = ${fact.status},
		    cover_url = ${fact.cover_image_url}
		WHERE id = ${fact.id}
	`;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/server/factEdit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { FactRecord } from '$lib/types';
import {
	validateContentEdit,
	validateImageEdit,
	applyContentEdit,
	applyImageEdit,
	COVER_SLOT
} from './factEdit';

function record(over: Partial<FactRecord> = {}): FactRecord {
	return {
		id: 'f1',
		type: 'nature_fact',
		topic: 'Ants',
		age_range: '5-8',
		status: 'draft',
		cover_image_url: 'https://blob/cover.jpg',
		cover_prompt: 'ants on a path',
		section_images: ['https://blob/s0.jpg', '', ''],
		structure: [
			{ type: 'question', image_prompt: 'a child watching ants' },
			{ type: 'fun_facts' },
			{ type: 'lesson' }
		],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [{ text: 'Have you seen them?' }, { items: ['One', 'Two'] }, { text: 'Together is easier.' }],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Go and look.'
			}
		},
		created_at: '2026-10-18T00:00:00.000Z',
		...over
	};
}

const goodContent = {
	language: 'en',
	title: 'New title',
	subtitle: 'New subtitle',
	sections: [{ text: 'New opener.' }, { items: ['A', 'B'] }, { text: 'New lesson.' }],
	reflection_question: 'New question?',
	real_world_mission: 'New mission.'
};

describe('validateContentEdit', () => {
	it('accepts a well-formed edit', () => {
		const r = validateContentEdit(goodContent, record());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.language).toBe('en');
	});

	it('accepts an edit for a language the record does not have yet', () => {
		expect(validateContentEdit({ ...goodContent, language: 'te' }, record()).ok).toBe(true);
	});

	it('rejects an unknown language', () => {
		expect(validateContentEdit({ ...goodContent, language: 'fr' }, record()).ok).toBe(false);
	});

	// Section count is what keeps every language aligned with the shared image array.
	it('rejects a section count that differs from the structure', () => {
		const short = { ...goodContent, sections: goodContent.sections.slice(0, 2) };
		const r = validateContentEdit(short, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/sections/i);
	});

	it('rejects empty text on a text section', () => {
		const bad = { ...goodContent, sections: [{ text: '  ' }, { items: ['A'] }, { text: 'x' }] };
		expect(validateContentEdit(bad, record()).ok).toBe(false);
	});

	it('rejects an empty fun_facts list', () => {
		const bad = { ...goodContent, sections: [{ text: 'x' }, { items: [] }, { text: 'y' }] };
		const r = validateContentEdit(bad, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/fun facts|fun_facts/i);
	});

	it('rejects a blank title, reflection question or mission', () => {
		expect(validateContentEdit({ ...goodContent, title: '' }, record()).ok).toBe(false);
		expect(validateContentEdit({ ...goodContent, reflection_question: ' ' }, record()).ok).toBe(false);
		expect(validateContentEdit({ ...goodContent, real_world_mission: '' }, record()).ok).toBe(false);
	});

	it('treats a blank subtitle as absent rather than an error', () => {
		const r = validateContentEdit({ ...goodContent, subtitle: '   ' }, record());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.content.subtitle).toBeUndefined();
	});

	it('trims the words it keeps', () => {
		const r = validateContentEdit({ ...goodContent, title: '  Spaced  ' }, record());
		if (r.ok) expect(r.content.title).toBe('Spaced');
	});
});

describe('applyContentEdit', () => {
	it('replaces only that language and leaves images and structure alone', () => {
		const before = record();
		const r = validateContentEdit(goodContent, before);
		if (!r.ok) throw new Error('expected ok');
		const after = applyContentEdit(before, r);
		expect(after.content.en?.title).toBe('New title');
		expect(after.section_images).toEqual(before.section_images);
		expect(after.structure).toEqual(before.structure);
	});

	it('adds a language that was missing without touching the existing one', () => {
		const before = record();
		const r = validateContentEdit({ ...goodContent, language: 'te', title: 'తెలుగు' }, before);
		if (!r.ok) throw new Error('expected ok');
		const after = applyContentEdit(before, r);
		expect(after.content.te?.title).toBe('తెలుగు');
		expect(after.content.en?.title).toBe('Why do ants walk in a line?');
	});

	it('does not mutate the record it was given', () => {
		const before = record();
		const r = validateContentEdit(goodContent, before);
		if (!r.ok) throw new Error('expected ok');
		applyContentEdit(before, r);
		expect(before.content.en?.title).toBe('Why do ants walk in a line?');
	});
});

describe('validateImageEdit', () => {
	it('accepts the cover', () => {
		const r = validateImageEdit({ slot: COVER_SLOT, prompt: 'new cover' }, record());
		expect(r.ok).toBe(true);
	});

	it('accepts an image-capable section', () => {
		expect(validateImageEdit({ slot: 0, prompt: 'new picture' }, record()).ok).toBe(true);
	});

	it('rejects a section that cannot hold a picture', () => {
		const r = validateImageEdit({ slot: 1, prompt: 'nope' }, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/picture/i);
	});

	it('rejects an out-of-range slot', () => {
		expect(validateImageEdit({ slot: 9, prompt: 'x' }, record()).ok).toBe(false);
		expect(validateImageEdit({ slot: -2, prompt: 'x' }, record()).ok).toBe(false);
	});

	it('rejects a blank prompt', () => {
		expect(validateImageEdit({ slot: 0, prompt: '   ' }, record()).ok).toBe(false);
	});
});

describe('applyImageEdit', () => {
	it('swaps the cover url and prompt', () => {
		const after = applyImageEdit(record(), COVER_SLOT, 'https://blob/new.jpg', 'new cover');
		expect(after.cover_image_url).toBe('https://blob/new.jpg');
		expect(after.cover_prompt).toBe('new cover');
	});

	it('swaps one section image and its prompt, leaving the others alone', () => {
		const before = record();
		const after = applyImageEdit(before, 0, 'https://blob/new.jpg', 'new picture');
		expect(after.section_images[0]).toBe('https://blob/new.jpg');
		expect(after.section_images[1]).toBe('');
		expect(after.structure[0].image_prompt).toBe('new picture');
		expect(after.structure[1].image_prompt).toBeUndefined();
	});

	it('does not mutate the record it was given', () => {
		const before = record();
		applyImageEdit(before, 0, 'https://blob/new.jpg', 'p');
		expect(before.section_images[0]).toBe('https://blob/s0.jpg');
	});
});
```

- [ ] **Step 3: Run and confirm failure.** `npm test -- factEdit` → cannot resolve `./factEdit`.

- [ ] **Step 4: Implement**

Create `src/lib/server/factEdit.ts`:

```ts
import type { FactContent, FactContentSection, FactRecord, Language } from '$lib/types';

/** The cover is addressed as -1, the way pageEdit.ts addresses a story cover. */
export const COVER_SLOT = -1;

const LANGUAGES: Language[] = ['en', 'te'];
const IMAGE_TYPES = ['question', 'discovery'];

export type ContentEditOk = { ok: true; language: Language; content: FactContent };
export type ImageEditOk = { ok: true; slot: number; prompt: string };
export type EditErr = { ok: false; message: string };

/**
 * Validate an operator's edit to one language's words.
 *
 * The section COUNT is checked against the structure, not against the language's
 * current sections: a language being added for the first time has none yet, and every
 * language must line up with the shared `section_images` array by position.
 * Nothing here may add, remove or reorder sections.
 */
export function validateContentEdit(body: unknown, record: FactRecord): ContentEditOk | EditErr {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): EditErr => ({ ok: false, message });

	const language = b.language as Language;
	if (!LANGUAGES.includes(language)) return err('Unknown language.');

	const title = String(b.title ?? '').trim();
	if (!title) return err('The title cannot be empty.');

	const reflection = String(b.reflection_question ?? '').trim();
	if (!reflection) return err('The reflection question cannot be empty.');

	const mission = String(b.real_world_mission ?? '').trim();
	if (!mission) return err('The real-world mission cannot be empty.');

	const raw = b.sections;
	if (!Array.isArray(raw) || raw.length !== record.structure.length) {
		return err(`This fact has ${record.structure.length} sections; the edit had ${Array.isArray(raw) ? raw.length : 0}.`);
	}

	const sections: FactContentSection[] = [];
	for (let i = 0; i < raw.length; i++) {
		const s = (raw[i] ?? {}) as { text?: unknown; items?: unknown };
		if (record.structure[i].type === 'fun_facts') {
			const items = Array.isArray(s.items) ? s.items.map((x) => String(x).trim()).filter(Boolean) : [];
			if (!items.length) return err(`The fun facts list at ${i + 1} cannot be empty.`);
			sections.push({ items });
		} else {
			const text = String(s.text ?? '').trim();
			if (!text) return err(`Section ${i + 1} cannot be empty.`);
			sections.push({ text });
		}
	}

	const subtitle = String(b.subtitle ?? '').trim();
	return {
		ok: true,
		language,
		content: {
			title,
			...(subtitle ? { subtitle } : {}),
			sections,
			reflection_question: reflection,
			real_world_mission: mission
		}
	};
}

/** Returns a new record; never mutates the one it was given. */
export function applyContentEdit(record: FactRecord, edit: ContentEditOk): FactRecord {
	return { ...record, content: { ...record.content, [edit.language]: edit.content } };
}

/**
 * Validate a request to regenerate one picture. Only the cover and sections whose type
 * can hold an image are addressable — fun_facts and lesson have nowhere to put one.
 */
export function validateImageEdit(body: unknown, record: FactRecord): ImageEditOk | EditErr {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): EditErr => ({ ok: false, message });

	const slot = Number(b.slot);
	if (!Number.isInteger(slot) || slot < COVER_SLOT || slot >= record.structure.length) {
		return err('That picture is not part of this fact.');
	}
	if (slot !== COVER_SLOT && !IMAGE_TYPES.includes(record.structure[slot].type)) {
		return err('That section does not have a picture.');
	}

	const prompt = String(b.prompt ?? '').trim();
	if (!prompt) return err('The picture prompt cannot be empty.');

	return { ok: true, slot, prompt };
}

/** Returns a new record; never mutates the one it was given. */
export function applyImageEdit(
	record: FactRecord,
	slot: number,
	url: string,
	prompt: string
): FactRecord {
	if (slot === COVER_SLOT) {
		return { ...record, cover_image_url: url, cover_prompt: prompt };
	}
	const section_images = [...record.section_images];
	while (section_images.length < record.structure.length) section_images.push('');
	section_images[slot] = url;

	const structure = record.structure.map((s, i) => (i === slot ? { ...s, image_prompt: prompt } : s));
	return { ...record, section_images, structure };
}
```

- [ ] **Step 5:** `npm test -- factEdit` → PASS, 21 tests. `npm run check` → clean.

- [ ] **Step 6: Commit**
```bash
git add src/lib/server/db.ts src/lib/server/factEdit.ts src/lib/server/factEdit.test.ts
git commit -m "feat: pure fact-edit rules and updateFact"
```

---

## Task 2: The translate prompt

**File:** modify `src/lib/server/factPrompt.ts`

- [ ] **Step 1: Append**

```ts
/**
 * Ask for ONE missing language, given a language the fact already has.
 *
 * The structure is fixed and supplied, not re-derived: every language must keep the
 * same number of sections in the same order, because one shared `section_images`
 * array is indexed by position.
 */
export function buildFactTranslateMessages(
	source: FactContent,
	structure: FactStructureSection[],
	from: Language,
	to: Language
): ChatMessage[] {
	const system = [
		`You translate short children's nature explainers for readers aged 5 to 8.`,
		`You write natural ${LANGUAGE_NAMES[to]} — not word-for-word — keeping the same facts, the same order and the same number of sections.`,
		`You always respond with a single valid JSON object and nothing else.`
	].join(' ');

	const shape = structure
		.map((s, i) => `  ${i}: ${s.type === 'fun_facts' ? '{"items": [...]}' : '{"text": "..."}'}`)
		.join('\n');

	const user = [
		`Translate this ${LANGUAGE_NAMES[from]} explainer into ${LANGUAGE_NAMES[to]}.`,
		``,
		`Return exactly: {"title","subtitle","sections","reflection_question","real_world_mission"}`,
		`"sections" must have exactly ${structure.length} entries, in this shape:`,
		shape,
		``,
		`LANGUAGE RULES: each sentence max 12 words. Simple words. Active voice. Read-aloud friendly.`,
		``,
		`SOURCE (${LANGUAGE_NAMES[from]}):`,
		JSON.stringify(source),
		``,
		LOCKED_FLOOR
	].join('\n');

	return [
		{ role: 'system', content: system },
		{ role: 'user', content: user }
	];
}
```

Add `FactContent` and `FactStructureSection` to the type import at the top. **Remove the zero-width character** if one survives the paste in the `Return exactly` line — type it as plain ASCII.

- [ ] **Step 2:** `npm run check` → clean. **Commit:** `feat: fact translation prompt`

---

## Task 3: The three endpoints

**Files:** create `src/routes/api/admin/facts/[id]/content/+server.ts`, `…/image/+server.ts`, `…/translate/+server.ts`

Each: parse body → `getFactRecordAdmin` (404 if missing) → validate → act → `updateFact`. Mirror `src/routes/api/admin/stories/[id]/page/+server.ts` exactly, including its ordering comment.

- [ ] **content** — plain save, no model call, no cost:
  `validateContentEdit(body, fact)` → `applyContentEdit` → `updateFact` → `json({ ok: true, language, content })`.

- [ ] **image** — `export const config = { maxDuration: 60 };`
  `validateImageEdit(body, fact)` → `generateImage(buildFactImagePrompt(edit.prompt))` → `uploadImage(bytes, \`fact-${id}-${edit.slot}\`, 'facts')` → `applyImageEdit` → `updateFact` → **then** `deleteImages([previousUrl])` only if it differs. **Never delete before the row is saved** — if the save fails the old image must still be there. Return 502 `openai_failed` on a generation failure, and on a save failure say the picture was made but not saved rather than claiming success.

- [ ] **translate** — `export const config = { maxDuration: 60 };`
  Body `{ language }`. 400 if unknown, or if the fact already has it, or if it has no source language. Pick the first existing language as source, call `chatJson(buildFactTranslateMessages(...))`, then run the parsed object through `validateContentEdit({ ...parsed, language }, fact)` so a bad model response is rejected by the same rule a hand edit is — then `applyContentEdit` → `updateFact`. Return `json({ ok: true, language, content })`.

- [ ] Verify: `npm run check`, `npm test`, `npm run build`; with the dev server, each route returns **401** unqualified. **Do not authenticate and do not trigger a real generation or translation.** Commit: `feat: fact content, image and translate endpoints`

---

## Task 4: The edit page

**Files:** create `src/routes/admin/facts/[id]/+page.server.ts` and `+page.svelte`

- [ ] **Load:** `getFactRecordAdmin(params.id)`, `error(404)` when missing. Return `{ fact }`.

- [ ] **Page.** Mirror `src/routes/admin/stories/[id]/+page.svelte` for styling, the local-working-copy pattern (`$state(untrack(() => structuredClone(data.fact)))`), the per-block `busy`/`note` maps, and its button classes.

Layout, top to bottom:

1. **Header** — topic, `StatusChip`, languages present, link back to `/admin/facts`.
2. **Cover** — the image, an editable prompt box, a Regenerate button. Label it **"Shared by every language"**.
3. **Each section `i`**, in structure order:
   - if the type can hold a picture: the image, its prompt box, Regenerate — again labelled shared.
   - then **one row with a column per language**, side by side: a textarea for `text`, or one line per item for `fun_facts`. Column headers `EN` / `TE`.
4. **Title, subtitle, reflection question, mission** — the same side-by-side columns.
5. **One Save button per language**, posting that whole language block to `…/content`. Saving English must never touch Telugu.
6. When a language is **missing**: that column shows an empty state with a **"Generate Telugu"** button posting to `…/translate`, noting it costs about ₹0.5 and is a first draft to correct. After it returns, fill the column from the response.

**Side by side is the point** — the reason to open this page is a translation that drifted from the English, and that comparison must be visible without switching tabs. On a narrow screen let the columns stack.

- [ ] **Link it:** on `/admin/facts`, make each row's title link to `/admin/facts/<id>`.

- [ ] Verify `npm run check`, `npm test`, `npm run build`, and that `/admin/facts/<id>` returns **303**. Commit: `feat: fact edit page with side-by-side languages`

---

## Notes for the implementer

- **Never add, remove or reorder sections.** Every language's `sections` is positionally tied to `structure` and to the shared `section_images`. Editing words and prompts is in scope; changing the shape is not.
- **Images are shared.** Say so next to every Regenerate button — an operator must not be surprised that fixing the English picture changed the Telugu one.
- **Do not invent Telugu.** Admin UI is English, as elsewhere.
- **Delete a replaced Blob only after the row is saved.**
