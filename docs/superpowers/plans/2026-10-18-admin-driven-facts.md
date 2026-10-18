# Admin-Driven Facts (A1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the Why? section from bundled JSON to Postgres + Blob, authored from the admin dashboard: a brief generates a fact in every language at once, with images generated once and shared across languages.

**Architecture:** One `facts` row holds every language. The section **structure** (types and image prompts) lives *outside* the per-language content, so all languages share it by construction. The API flattens a record to one language before it reaches the child, so the kid-facing `Fact` type, `FactCard`, `SectionRenderer` and both kid routes are unchanged. All parsing, flattening and image-planning logic lives in pure modules with unit tests; the endpoints just orchestrate.

**Tech Stack:** SvelteKit 2 (Svelte 5 runes), TypeScript, Tailwind 4, Neon Postgres, Vercel Blob, OpenAI (`gpt-4o-mini`, `gpt-image-1`), vitest 4.

**Spec:** `docs/superpowers/specs/2026-10-18-admin-driven-facts-design.md`

**Node:** `source ~/.nvm/nvm.sh && nvm use 22.23.1`. Homebrew `node@22` is v23 and breaks the build.

**There is no `npm run lint`** — `package.json` has no such script and eslint is not installed. `npm run check` is the only static gate. Do not add a dependency.

**Page-level `curl` of kid routes proves nothing** — `src/routes/+layout.svelte:9` gates them behind a client-only splash. Verify via `npm run check`, `npm test`, `npm run build` and `/api/*`.

**Never read, guess, echo or submit `ADMIN_PASSCODE` / `CREATE_PASSCODE`, and never modify `.env`.** Admin verification is limited to confirming a route is gated (non-200).

## Three deviations from the spec, deliberate

1. **Section structure lives outside `content`.** The spec said "every language must have the same number of sections, of the same types, in the same order", enforced at parse time. Instead the model returns one `sections` array carrying `type` and `image_prompt` (language-neutral), and each language supplies only the words positionally. The invariant then holds **by construction** rather than by validation, and it removes a whole class of failure.
2. **`openaiClient` gains `chatJson`.** `generateStoryText` calls `parseStoryJson` internally and is story-shaped, so it cannot be reused. The raw chat call is extracted into `chatJson(messages)` and `generateStoryText` is rewritten to use it — no behaviour change for stories.
3. **`uploadImage` gains a folder argument.** It currently hardcodes a `stories/` path prefix. Facts upload under `facts/`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/types.ts` | `FactRecord`, `FactContent`, `FactStructureSection`, `FactContentSection`, `AdminFactSummary`; kid `Fact` unchanged |
| `src/lib/server/factParse.ts` | **new, pure** — parse + validate the model's JSON |
| `src/lib/server/factFlatten.ts` | **new, pure** — record → single-language kid `Fact` |
| `src/lib/server/factImages.ts` | **new, pure** — illustration plan + cost estimate |
| `src/lib/server/factPrompt.ts` | **new** — the hardcoded prompt, incl. the safety floor |
| `src/lib/server/openaiClient.ts` | extract `chatJson` |
| `src/lib/server/blob.ts` | `uploadImage` takes a folder |
| `src/lib/server/db.ts` | fact queries |
| `src/lib/server/validate.ts` | `validateFactBrief` |
| `src/routes/api/facts/…` | **new** — public read, flattened |
| `src/routes/api/admin/facts/…` | **new** — generate, publish, delete |
| `src/routes/admin/facts/…` | **new** — list + create |
| `src/lib/data/loadContent.ts` | facts from the API |
| `src/routes/facts/+page.svelte` | loading + wifi-failure states |
| `scripts/init-db.mjs`, `scripts/import-facts.mjs` | schema + one-time import |

---

## Task 1: Types

**Files:** Modify `src/lib/types.ts`

- [ ] **Step 1: Add the fact record types**

Append to `src/lib/types.ts` (the existing `Fact` and `FactSection` types stay exactly as they are — they are the kid-facing shape):

```ts
// --- Admin-driven facts (stored shape) -------------------------------------------
// A fact is ONE row holding every language. The section structure — types and image
// prompts — lives outside `content`, so every language shares it by construction and
// a single `section_images` array is valid for all of them.

/** Language-neutral: what this section IS, and the prompt behind its picture. */
export type FactStructureSection = {
	type: 'question' | 'discovery' | 'fun_facts' | 'lesson';
	/** Only ever set for question/discovery. '' or absent means this section has no picture. */
	image_prompt?: string;
};

/** One language's words for one section. Positionally matched to the structure. */
export type FactContentSection = { text?: string; items?: string[] };

/** One language's words for the whole fact. */
export type FactContent = {
	title: string;
	subtitle?: string;
	sections: FactContentSection[];
	reflection_question: string;
	real_world_mission: string;
};

export type FactRecord = {
	id: string;
	type: 'nature_fact';
	topic: string;
	age_range: '5-8';
	status: 'draft' | 'published';
	cover_image_url: string;
	/** The rendered prompt behind the cover, so a later increment can regenerate it. */
	cover_prompt?: string;
	/** Shared across languages; index-aligned with `structure`. '' where there is none. */
	section_images: string[];
	structure: FactStructureSection[];
	/** Language code -> that language's words. At least one key; may be partially filled. */
	content: Partial<Record<Language, FactContent>>;
	created_at: string;
};

/** The admin list row. Shows which languages exist so a gap is visible, not silent. */
export type AdminFactSummary = {
	id: string;
	topic: string;
	title: string;
	cover_url: string;
	status: 'draft' | 'published';
	languages: Language[];
	section_count: number;
	created_at: string;
};
```

- [ ] **Step 2: Verify**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run check`
Expected: PASS, 0 errors, 0 warnings.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: fact record types — one row, every language, shared structure"
```

---

## Task 2: Parsing the model's JSON

**Files:** Create `src/lib/server/factParse.ts`, `src/lib/server/factParse.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/factParse.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseFactJson, MAX_SECTIONS } from './factParse';

function payload(over: Record<string, unknown> = {}) {
	return JSON.stringify({
		topic: 'Ants',
		cover_prompt: 'a line of friendly cartoon ants on a path, watercolour',
		sections: [
			{ type: 'question', image_prompt: 'a child watching ants' },
			{ type: 'discovery', image_prompt: 'ants following a scent trail' },
			{ type: 'fun_facts' },
			{ type: 'lesson' }
		],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [
					{ text: 'Have you seen ants walking one behind another?' },
					{ text: 'Ants leave a smell on the ground called a scent trail.' },
					{ items: ['Ants can carry 50 times their weight.', 'There are 10,000 kinds of ants.'] },
					{ text: 'Working together makes hard things easy.' }
				],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Find a line of ants and watch where it goes.'
			}
		},
		...over
	});
}

describe('parseFactJson', () => {
	it('accepts a well-formed payload', () => {
		const f = parseFactJson(payload());
		expect(f.topic).toBe('Ants');
		expect(f.structure).toHaveLength(4);
		expect(f.content.en?.sections).toHaveLength(4);
		expect(f.structure[0].image_prompt).toBeTruthy();
	});

	it('rejects invalid JSON', () => {
		expect(() => parseFactJson('not json')).toThrow(/invalid JSON/i);
	});

	it('accepts the minimum of one section', () => {
		const one = payload({
			sections: [{ type: 'lesson' }],
			content: {
				en: {
					title: 'T',
					sections: [{ text: 'One lesson.' }],
					reflection_question: 'Q?',
					real_world_mission: 'Go look.'
				}
			}
		});
		expect(parseFactJson(one).structure).toHaveLength(1);
	});

	it(`accepts the maximum of ${MAX_SECTIONS} sections`, () => {
		const many = payload({
			sections: Array.from({ length: MAX_SECTIONS }, () => ({ type: 'discovery' })),
			content: {
				en: {
					title: 'T',
					sections: Array.from({ length: MAX_SECTIONS }, (_, i) => ({ text: `Step ${i + 1}.` })),
					reflection_question: 'Q?',
					real_world_mission: 'Go look.'
				}
			}
		});
		expect(parseFactJson(many).structure).toHaveLength(MAX_SECTIONS);
	});

	it('rejects zero sections', () => {
		expect(() =>
			parseFactJson(payload({ sections: [], content: { en: { title: 'T', sections: [], reflection_question: 'Q', real_world_mission: 'M' } } }))
		).toThrow(/between 1 and/i);
	});

	it(`rejects more than ${MAX_SECTIONS} sections`, () => {
		const tooMany = payload({
			sections: Array.from({ length: MAX_SECTIONS + 1 }, () => ({ type: 'discovery' })),
			content: {
				en: {
					title: 'T',
					sections: Array.from({ length: MAX_SECTIONS + 1 }, () => ({ text: 'x' })),
					reflection_question: 'Q?',
					real_world_mission: 'M'
				}
			}
		});
		expect(() => parseFactJson(tooMany)).toThrow(/between 1 and/i);
	});

	it('rejects an unknown section type', () => {
		expect(() => parseFactJson(payload({ sections: [{ type: 'riddle' }] }))).toThrow(/section type/i);
	});

	// The shared section_images array is indexed by structure position, so a language
	// with a different length would misalign every picture after the gap.
	it('rejects a language whose section count differs from the structure', () => {
		const short = JSON.parse(payload());
		short.content.en.sections = short.content.en.sections.slice(0, 2);
		expect(() => parseFactJson(JSON.stringify(short))).toThrow(/sections/i);
	});

	it('rejects a fun_facts section with no items', () => {
		const bad = JSON.parse(payload());
		bad.content.en.sections[2] = { items: [] };
		expect(() => parseFactJson(JSON.stringify(bad))).toThrow(/fun_facts/i);
	});

	it('rejects a text section with empty text', () => {
		const bad = JSON.parse(payload());
		bad.content.en.sections[1] = { text: '   ' };
		expect(() => parseFactJson(JSON.stringify(bad))).toThrow(/empty/i);
	});

	it('rejects a language missing a title or mission', () => {
		const noTitle = JSON.parse(payload());
		noTitle.content.en.title = '';
		expect(() => parseFactJson(JSON.stringify(noTitle))).toThrow(/title/i);

		const noMission = JSON.parse(payload());
		noMission.content.en.real_world_mission = '';
		expect(() => parseFactJson(JSON.stringify(noMission))).toThrow(/mission/i);
	});

	it('rejects a payload with no languages at all', () => {
		expect(() => parseFactJson(payload({ content: {} }))).toThrow(/language/i);
	});

	it('keeps multiple languages and shares one structure between them', () => {
		const two = JSON.parse(payload());
		two.content.te = { ...two.content.en, title: 'చీమలు ఎందుకు వరుసగా నడుస్తాయి?' };
		const f = parseFactJson(JSON.stringify(two));
		expect(Object.keys(f.content).sort()).toEqual(['en', 'te']);
		expect(f.content.te?.sections).toHaveLength(f.structure.length);
	});

	it('drops an image_prompt on a section type that cannot have a picture', () => {
		const f = parseFactJson(payload({
			sections: [
				{ type: 'question', image_prompt: 'keep me' },
				{ type: 'discovery', image_prompt: 'keep me too' },
				{ type: 'fun_facts', image_prompt: 'drop me' },
				{ type: 'lesson', image_prompt: 'drop me too' }
			]
		}));
		expect(f.structure[2].image_prompt).toBeUndefined();
		expect(f.structure[3].image_prompt).toBeUndefined();
		expect(f.structure[0].image_prompt).toBe('keep me');
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm test -- factParse`
Expected: FAIL — cannot resolve `./factParse`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/factParse.ts`:

```ts
import type { FactContent, FactStructureSection, Language } from '$lib/types';

/** A fact can run to a ten-screen "how things work" explainer. */
export const MAX_SECTIONS = 10;

const SECTION_TYPES = ['question', 'discovery', 'fun_facts', 'lesson'] as const;
type SectionType = (typeof SECTION_TYPES)[number];

/** Only these carry a picture, matching the kid-facing FactSection schema. */
const IMAGE_TYPES: SectionType[] = ['question', 'discovery'];

export type ParsedFact = {
	topic: string;
	cover_prompt: string;
	structure: FactStructureSection[];
	content: Partial<Record<Language, FactContent>>;
};

/**
 * Parse and check the model's fact payload. Pure, so the contract is testable without
 * a network call.
 *
 * The section structure is language-neutral and lives outside `content`: every
 * language supplies only the words, positionally. That is what makes one
 * `section_images` array valid for all languages — a per-language structure could
 * disagree and misalign every picture after the first gap.
 */
export function parseFactJson(raw: string): ParsedFact {
	let p: Record<string, unknown>;
	try {
		p = JSON.parse(raw);
	} catch {
		throw new Error('OpenAI returned invalid JSON');
	}

	const topic = String(p.topic ?? '').trim();
	if (!topic) throw new Error('Fact JSON is missing a topic');

	const rawSections = p.sections;
	if (!Array.isArray(rawSections) || rawSections.length < 1 || rawSections.length > MAX_SECTIONS) {
		throw new Error(`Fact JSON must have between 1 and ${MAX_SECTIONS} sections`);
	}

	const structure: FactStructureSection[] = rawSections.map((s, i) => {
		const type = (s as { type?: string })?.type as SectionType;
		if (!SECTION_TYPES.includes(type)) {
			throw new Error(`Fact JSON has an unknown section type at ${i}: ${String(type)}`);
		}
		// An image_prompt on fun_facts/lesson is dropped rather than rejected: the words
		// are fine, and the renderer has nowhere to put the picture anyway.
		const prompt = String((s as { image_prompt?: string })?.image_prompt ?? '').trim();
		return IMAGE_TYPES.includes(type) && prompt ? { type, image_prompt: prompt } : { type };
	});

	const rawContent = (p.content ?? {}) as Record<string, unknown>;
	const langs = Object.keys(rawContent);
	if (!langs.length) throw new Error('Fact JSON has no language content');

	const content: Partial<Record<Language, FactContent>> = {};
	for (const lang of langs) {
		const c = rawContent[lang] as Record<string, unknown>;
		const title = String(c?.title ?? '').trim();
		if (!title) throw new Error(`Fact JSON (${lang}) is missing a title`);

		const reflection = String(c?.reflection_question ?? '').trim();
		if (!reflection) throw new Error(`Fact JSON (${lang}) is missing a reflection question`);

		const mission = String(c?.real_world_mission ?? '').trim();
		if (!mission) throw new Error(`Fact JSON (${lang}) is missing a real world mission`);

		const secs = c?.sections;
		if (!Array.isArray(secs) || secs.length !== structure.length) {
			throw new Error(
				`Fact JSON (${lang}) has ${Array.isArray(secs) ? secs.length : 0} sections, expected ${structure.length}`
			);
		}

		const sections = secs.map((s, i) => {
			const kind = structure[i].type;
			if (kind === 'fun_facts') {
				const items = (s as { items?: unknown[] })?.items;
				const clean = Array.isArray(items)
					? items.map((x) => String(x).trim()).filter(Boolean)
					: [];
				if (!clean.length) throw new Error(`Fact JSON (${lang}) has an empty fun_facts list at ${i}`);
				return { items: clean };
			}
			const text = String((s as { text?: string })?.text ?? '').trim();
			if (!text) throw new Error(`Fact JSON (${lang}) has an empty section at ${i}`);
			return { text };
		});

		const subtitle = String(c?.subtitle ?? '').trim();
		content[lang as Language] = {
			title,
			...(subtitle ? { subtitle } : {}),
			sections,
			reflection_question: reflection,
			real_world_mission: mission
		};
	}

	return {
		topic,
		cover_prompt: String(p.cover_prompt ?? '').trim(),
		structure,
		content
	};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- factParse`
Expected: PASS, 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/factParse.ts src/lib/server/factParse.test.ts
git commit -m "feat: parse and validate generated fact JSON"
```

---

## Task 3: Flattening a record to one language

**Files:** Create `src/lib/server/factFlatten.ts`, `src/lib/server/factFlatten.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/factFlatten.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { FactRecord } from '$lib/types';
import { flattenFact, factLanguages } from './factFlatten';

function record(over: Partial<FactRecord> = {}): FactRecord {
	return {
		id: 'fact-001',
		type: 'nature_fact',
		topic: 'Ants',
		age_range: '5-8',
		status: 'published',
		cover_image_url: 'https://blob/cover.jpg',
		section_images: ['https://blob/s0.jpg', '', ''],
		structure: [{ type: 'question' }, { type: 'fun_facts' }, { type: 'lesson' }],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [{ text: 'Have you seen them?' }, { items: ['One', 'Two'] }, { text: 'Together is easier.' }],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Go and look.'
			},
			te: {
				title: 'చీమలు ఎందుకు వరుసగా నడుస్తాయి?',
				sections: [{ text: 'చూశావా?' }, { items: ['ఒకటి', 'రెండు'] }, { text: 'కలిసి సులభం.' }],
				reflection_question: 'చీమతో ఏమి చెబుతావు?',
				real_world_mission: 'వెళ్ళి చూడు.'
			}
		},
		created_at: '2026-10-18T00:00:00.000Z',
		...over
	};
}

describe('flattenFact', () => {
	it('produces the kid-facing Fact shape for a language', () => {
		const f = flattenFact(record(), 'en')!;
		expect(f.id).toBe('fact-001');
		expect(f.language).toBe('en');
		expect(f.title).toBe('Why do ants walk in a line?');
		expect(f.cover_image).toBe('https://blob/cover.jpg');
		expect(f.reflection_question).toBe('What would you say to an ant?');
		expect(f.real_world_mission).toBe('Go and look.');
	});

	// audio is required on the kid Fact type and facts have none yet.
	it('always sets audio to an empty string', () => {
		expect(flattenFact(record(), 'en')!.audio).toBe('');
	});

	it('merges shared images into the right sections by index', () => {
		const f = flattenFact(record(), 'en')!;
		const first = f.sections[0];
		expect(first.type).toBe('question');
		if (first.type === 'question') expect(first.image).toBe('https://blob/s0.jpg');
	});

	it('gives a section with no image an empty string', () => {
		const f = flattenFact(record({ section_images: ['', '', ''] }), 'en')!;
		const first = f.sections[0];
		if (first.type === 'question') expect(first.image).toBe('');
	});

	it('tolerates a section_images array shorter than the structure', () => {
		const f = flattenFact(record({ section_images: [] }), 'en')!;
		const first = f.sections[0];
		if (first.type === 'question') expect(first.image).toBe('');
	});

	it('carries fun_facts items through', () => {
		const f = flattenFact(record(), 'en')!;
		const second = f.sections[1];
		expect(second.type).toBe('fun_facts');
		if (second.type === 'fun_facts') expect(second.items).toEqual(['One', 'Two']);
	});

	it('serves the other language from the same record and the same images', () => {
		const te = flattenFact(record(), 'te')!;
		expect(te.title).toBe('చీమలు ఎందుకు వరుసగా నడుస్తాయి?');
		expect(te.cover_image).toBe('https://blob/cover.jpg');
		const first = te.sections[0];
		if (first.type === 'question') expect(first.image).toBe('https://blob/s0.jpg');
	});

	it('never leaks another language into the result', () => {
		expect(JSON.stringify(flattenFact(record(), 'en'))).not.toContain('చీమలు');
	});

	it('returns null for a language the record does not have', () => {
		const enOnly = record();
		delete enOnly.content.te;
		expect(flattenFact(enOnly, 'te')).toBeNull();
	});

	it('omits subtitle when that language has none', () => {
		expect(flattenFact(record(), 'te')!.subtitle).toBeUndefined();
	});
});

describe('factLanguages', () => {
	it('lists the languages present', () => {
		expect(factLanguages(record()).sort()).toEqual(['en', 'te']);
	});

	it('is empty for a record with no content', () => {
		expect(factLanguages(record({ content: {} }))).toEqual([]);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- factFlatten`
Expected: FAIL — cannot resolve `./factFlatten`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/factFlatten.ts`:

```ts
import type { Fact, FactRecord, FactSection, Language } from '$lib/types';

/** Which languages this record actually has words for. */
export function factLanguages(record: FactRecord): Language[] {
	return Object.keys(record.content) as Language[];
}

/**
 * Collapse a stored record into the single-language `Fact` the child's screens expect.
 *
 * This is the whole point of the bilingual record: storage keeps every language and one
 * set of images, while `FactCard`, `SectionRenderer` and both kid routes keep working on
 * the shape they already had. Returns null when the record has no words in `language`.
 */
export function flattenFact(record: FactRecord, language: Language): Fact | null {
	const c = record.content[language];
	if (!c) return null;

	const sections: FactSection[] = record.structure.map((s, i) => {
		const words = c.sections[i] ?? {};
		// Images are shared, stored outside content, and index-aligned with structure.
		const image = record.section_images[i] ?? '';
		switch (s.type) {
			case 'fun_facts':
				return { type: 'fun_facts', items: words.items ?? [] };
			case 'lesson':
				return { type: 'lesson', text: words.text ?? '' };
			case 'question':
				return { type: 'question', text: words.text ?? '', image };
			case 'discovery':
			default:
				return { type: 'discovery', text: words.text ?? '', image };
		}
	});

	return {
		id: record.id,
		type: 'nature_fact',
		language,
		topic: record.topic,
		age_range: record.age_range,
		title: c.title,
		...(c.subtitle ? { subtitle: c.subtitle } : {}),
		cover_image: record.cover_image_url,
		// Facts have no audio yet (recorded-vs-TTS is undecided) and the viewer renders
		// fine without it, but the kid Fact type requires the field.
		audio: '',
		sections,
		reflection_question: c.reflection_question,
		real_world_mission: c.real_world_mission
	};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- factFlatten`
Expected: PASS, 12 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/factFlatten.ts src/lib/server/factFlatten.test.ts
git commit -m "feat: flatten a fact record to one language"
```

---

## Task 4: The illustration plan

**Files:** Create `src/lib/server/factImages.ts`, `src/lib/server/factImages.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `src/lib/server/factImages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { FactStructureSection } from '$lib/types';
import { imagePlan, estimateCost, ILLUSTRATION_LEVELS, RUPEES_PER_IMAGE } from './factImages';

const structure: FactStructureSection[] = [
	{ type: 'question', image_prompt: 'q' },
	{ type: 'discovery', image_prompt: 'd1' },
	{ type: 'fun_facts' },
	{ type: 'discovery', image_prompt: 'd2' },
	{ type: 'lesson' }
];

describe('imagePlan', () => {
	it('cover: just the cover', () => {
		const plan = imagePlan(structure, 'cover');
		expect(plan.cover).toBe(true);
		expect(plan.sectionIndices).toEqual([]);
	});

	it('cover_plus: the cover and the first two image-capable sections', () => {
		expect(imagePlan(structure, 'cover_plus').sectionIndices).toEqual([0, 1]);
	});

	it('every: the cover and every image-capable section', () => {
		expect(imagePlan(structure, 'every').sectionIndices).toEqual([0, 1, 3]);
	});

	it('never picks fun_facts or lesson', () => {
		const idx = imagePlan(structure, 'every').sectionIndices;
		expect(idx).not.toContain(2);
		expect(idx).not.toContain(4);
	});

	it('skips an image-capable section with no prompt', () => {
		const noPrompt: FactStructureSection[] = [{ type: 'question' }, { type: 'discovery', image_prompt: 'd' }];
		expect(imagePlan(noPrompt, 'every').sectionIndices).toEqual([1]);
	});

	it('cover_plus takes fewer than two when fewer exist', () => {
		const one: FactStructureSection[] = [{ type: 'question', image_prompt: 'q' }, { type: 'lesson' }];
		expect(imagePlan(one, 'cover_plus').sectionIndices).toEqual([0]);
	});

	it('handles a structure with no image-capable sections', () => {
		const none: FactStructureSection[] = [{ type: 'fun_facts' }, { type: 'lesson' }];
		const plan = imagePlan(none, 'every');
		expect(plan.cover).toBe(true);
		expect(plan.sectionIndices).toEqual([]);
	});
});

describe('estimateCost', () => {
	it('counts the cover plus each planned section image', () => {
		expect(estimateCost(imagePlan(structure, 'cover'))).toBe(RUPEES_PER_IMAGE);
		expect(estimateCost(imagePlan(structure, 'cover_plus'))).toBe(RUPEES_PER_IMAGE * 3);
		expect(estimateCost(imagePlan(structure, 'every'))).toBe(RUPEES_PER_IMAGE * 4);
	});
});

describe('ILLUSTRATION_LEVELS', () => {
	it('is the three supported levels', () => {
		expect(ILLUSTRATION_LEVELS).toEqual(['cover', 'cover_plus', 'every']);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- factImages`
Expected: FAIL — cannot resolve `./factImages`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/server/factImages.ts`:

```ts
import type { FactStructureSection } from '$lib/types';

/** Rough per-image cost, used only to warn the operator before they spend it. */
export const RUPEES_PER_IMAGE = 4;

export const ILLUSTRATION_LEVELS = ['cover', 'cover_plus', 'every'] as const;
export type IllustrationLevel = (typeof ILLUSTRATION_LEVELS)[number];

/** How many section pictures `cover_plus` buys. */
const COVER_PLUS_COUNT = 2;

export type ImagePlan = {
	cover: boolean;
	/** Indices into the structure that should get a picture. */
	sectionIndices: number[];
};

/**
 * Decide which pictures to generate.
 *
 * Image spend scales with section count — a ten-step explainer illustrated throughout is
 * an order of magnitude more than a cover — so the level is the operator's choice and the
 * cost is shown before they commit to it. A section with no image_prompt is skipped
 * whatever the level: there is nothing to draw from.
 */
export function imagePlan(
	structure: FactStructureSection[],
	level: IllustrationLevel
): ImagePlan {
	const capable = structure
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => (s.type === 'question' || s.type === 'discovery') && !!s.image_prompt)
		.map(({ i }) => i);

	if (level === 'cover') return { cover: true, sectionIndices: [] };
	if (level === 'cover_plus') return { cover: true, sectionIndices: capable.slice(0, COVER_PLUS_COUNT) };
	return { cover: true, sectionIndices: capable };
}

/** Rupees, for the create screen's warning. */
export function estimateCost(plan: ImagePlan): number {
	return ((plan.cover ? 1 : 0) + plan.sectionIndices.length) * RUPEES_PER_IMAGE;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- factImages`
Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/factImages.ts src/lib/server/factImages.test.ts
git commit -m "feat: fact illustration plan and cost estimate"
```

---

## Task 5: Shared plumbing — `chatJson` and the Blob folder

**Files:** Modify `src/lib/server/openaiClient.ts`, `src/lib/server/blob.ts`

- [ ] **Step 1: Extract the raw chat call**

In `src/lib/server/openaiClient.ts`, add this function above `generateStoryText`:

```ts
/**
 * One chat completion returning raw JSON text. Callers parse and validate it
 * themselves, which keeps those contracts pure and unit-testable.
 */
export async function chatJson(messages: ChatMessage[], temperature = 0.8): Promise<string> {
	const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey()}`
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			messages,
			temperature,
			response_format: { type: 'json_object' }
		})
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`OpenAI chat failed (${res.status}): ${detail.slice(0, 200)}`);
	}

	const data = await res.json();
	const content = data?.choices?.[0]?.message?.content;
	if (!content) throw new Error('OpenAI chat returned no content');
	return content;
}
```

Then replace the **body** of `generateStoryText` so it reuses it — the signature and behaviour stay identical:

```ts
export async function generateStoryText(
	messages: ChatMessage[],
	expectedPages = 5
): Promise<StoryTextResult> {
	return parseStoryJson(await chatJson(messages), expectedPages);
}
```

- [ ] **Step 2: Give `uploadImage` a folder**

In `src/lib/server/blob.ts`, change `uploadImage` — `folder` defaults to `stories` so every existing call site keeps working untouched:

```ts
/**
 * Upload JPEG bytes to Vercel Blob and return the public URL.
 * `key` is a human-readable prefix (e.g. "story-<id>-cover"); a random suffix
 * is added to avoid collisions. `folder` separates content types in the bucket.
 */
export async function uploadImage(bytes: Buffer, key: string, folder = 'stories'): Promise<string> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const { url } = await put(`${folder}/${key}.jpg`, bytes, {
		access: 'public',
		contentType: 'image/jpeg',
		token: env.BLOB_READ_WRITE_TOKEN,
		addRandomSuffix: true
	});
	return url;
}
```

- [ ] **Step 3: Verify nothing regressed**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm test && npm run check`
Expected: PASS both. The existing `openaiClient.test.ts` covers `parseStoryJson`, which is untouched; `generateStoryText` keeps the same signature and behaviour.

- [ ] **Step 4: Commit**

```bash
git add src/lib/server/openaiClient.ts src/lib/server/blob.ts
git commit -m "refactor: extract chatJson and let uploadImage pick a folder"
```

---

## Task 6: The fact prompt

**Files:** Create `src/lib/server/factPrompt.ts`

- [ ] **Step 1: Write the prompt builder**

Create `src/lib/server/factPrompt.ts`:

```ts
import type { ChatMessage } from './storyPrompt';
import type { Language } from '$lib/types';
import { MAX_SECTIONS } from './factParse';

const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', te: 'Telugu' };

/**
 * Non-negotiable rules appended to every fact prompt. Same idea as the story
 * templates' LOCKED_FLOOR: the operator's brief steers the topic, never the safety
 * rules or the output contract.
 */
const LOCKED_FLOOR = [
	`SAFETY: The reader is a child aged 5 to 8. Nothing frightening, violent, sad or unsafe.`,
	`Nothing a child could copy and be hurt by. No death, no predation described in detail.`,
	`Never mention brands, politics, religion, or anything commercial.`,
	`Be factually accurate. If you are not sure a detail is true, leave it out.`,
	`OUTPUT: Reply with a single valid JSON object and nothing else.`
].join(' ');

export type FactBrief = {
	brief: string;
	topic: string;
	languages: Language[];
	/** Roughly how many screens the operator wants; the model may return fewer. */
	sectionTarget: number;
};

/**
 * Build the messages for one fact in every requested language.
 *
 * The section structure is returned ONCE, outside `content`, and each language supplies
 * only the words positionally. That is what guarantees every language shares the same
 * structure, which is what makes one shared set of images valid for all of them.
 */
export function buildFactMessages(b: FactBrief): ChatMessage[] {
	const names = b.languages.map((l) => LANGUAGE_NAMES[l]).join(' and ');
	const keys = b.languages.map((l) => `"${l}"`).join(', ');

	const system = [
		`You write short, warm, factually accurate nature and "how things work" explainers for children aged 5 to 8.`,
		`You write in ${names}. Every language must say the SAME thing — same facts, same order, same number of sections.`,
		`You always respond with a single valid JSON object and nothing else.`
	].join(' ');

	const user = [
		`Write one explainer about: ${b.brief}`,
		`TOPIC (one or two words, for filing): ${b.topic}`,
		``,
		`STRUCTURE — return exactly one "sections" array describing the shape, with ${b.sectionTarget} entries (never fewer than 1, never more than ${MAX_SECTIONS}).`,
		`Each entry is {"type": ...} where type is one of: "question", "discovery", "fun_facts", "lesson".`,
		`Open with exactly one "question". Then one or more "discovery" steps that explain it in order.`,
		`Then exactly one "fun_facts". End with exactly one "lesson".`,
		`For "question" and "discovery" entries ONLY, add "image_prompt": a short English description of a single,`,
		`calm, warm watercolour illustration for that step. No text or words inside the picture.`,
		``,
		`CONTENT — return "content" with the keys ${keys}. Each language has:`,
		`  "title" (max 8 words, a question a child would ask),`,
		`  "subtitle" (max 6 words),`,
		`  "sections": an array of the SAME length as "sections" above, matched by position.`,
		`     For a "fun_facts" position give {"items": [2 to 4 short strings]}.`,
		`     For every other position give {"text": "..."}.`,
		`  "reflection_question" (one open question, max 15 words),`,
		`  "real_world_mission" (one thing to go and do outside, max 20 words).`,
		``,
		`Also return "cover_prompt": a short English description of the cover illustration.`,
		`Image prompts are written once, in English, and shared by every language.`,
		``,
		`LANGUAGE RULES: each sentence max 12 words. Simple words. Active voice. Read-aloud friendly.`,
		`Each "discovery" step is 1 to 3 sentences.`,
		`Write each language naturally — do not translate word for word, but keep the same facts and order.`,
		``,
		LOCKED_FLOOR
	].join('\n');

	return [
		{ role: 'system', content: system },
		{ role: 'user', content: user }
	];
}

/** The image prompt actually sent, with the house style appended. */
export function buildFactImagePrompt(body: string): string {
	return [
		body,
		`Soft watercolour children's book illustration. Warm, calm, gentle colours.`,
		`No text, no letters, no words anywhere in the image.`
	].join(' ');
}
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/server/factPrompt.ts
git commit -m "feat: fact generation prompt with a locked safety floor"
```

---

## Task 7: Schema and queries

**Files:** Modify `scripts/init-db.mjs`, `src/lib/server/db.ts`

- [ ] **Step 1: Add the table**

In `scripts/init-db.mjs`, after the `themes` block and before the final `console.log`, insert:

```js
await sql`
	CREATE TABLE IF NOT EXISTS facts (
		id          text PRIMARY KEY,
		created_at  timestamptz NOT NULL DEFAULT now(),
		topic       text NOT NULL,
		status      text NOT NULL DEFAULT 'draft',
		cover_url   text NOT NULL DEFAULT '',
		fact        jsonb NOT NULL
	)
`;
await sql`CREATE INDEX IF NOT EXISTS facts_status_idx ON facts (status)`;
await sql`CREATE INDEX IF NOT EXISTS facts_created_idx ON facts (created_at DESC)`;
```

and change the final line to:

```js
console.log('✅ stories + prompt_templates + themes + facts tables ready');
```

`id` is `text`, not `uuid`: the existing fact's id is `fact-001` and the `progress` store keys completion on that exact string, so a uuid would silently un-complete it for any child who had read it.

- [ ] **Step 2: Add the queries**

In `src/lib/server/db.ts`, add `FactRecord` and `AdminFactSummary` to the type import on line 3, then append:

```ts
// --- Facts -----------------------------------------------------------------------
// One row per fact, holding every language. There is deliberately NO language column:
// language is a filter applied when flattening, not a property of the row.

export async function insertFact(fact: FactRecord): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO facts (id, topic, status, cover_url, fact)
		VALUES (${fact.id}, ${fact.topic}, ${fact.status}, ${fact.cover_image_url}, ${JSON.stringify(fact)})
	`;
}

/** Published records, newest first. The caller flattens to a language. */
export async function listFactRecords(): Promise<FactRecord[]> {
	const q = sql();
	const rows = await q`SELECT fact FROM facts WHERE status = 'published' ORDER BY created_at DESC`;
	return rows.map((r) => r.fact as FactRecord);
}

/** One published record, or null. Drafts are treated as not-found for kids. */
export async function getFactRecord(id: string): Promise<FactRecord | null> {
	const q = sql();
	const rows = await q`SELECT fact FROM facts WHERE id = ${id} AND status = 'published'`;
	return rows.length ? (rows[0].fact as FactRecord) : null;
}

/** Any status, for admin. */
export async function getFactRecordAdmin(id: string): Promise<FactRecord | null> {
	const q = sql();
	const rows = await q`SELECT fact FROM facts WHERE id = ${id}`;
	return rows.length ? (rows[0].fact as FactRecord) : null;
}

/** Every fact, any status, with what the admin list needs. */
export async function listFactsAdmin(): Promise<FactRecord[]> {
	const q = sql();
	const rows = await q`SELECT fact FROM facts ORDER BY created_at DESC`;
	return rows.map((r) => r.fact as FactRecord);
}

export async function setFactStatus(id: string, status: 'draft' | 'published'): Promise<void> {
	const q = sql();
	await q`
		UPDATE facts
		SET status = ${status},
		    fact = jsonb_set(fact, '{status}', to_jsonb(${status}::text))
		WHERE id = ${id}
	`;
}

/** Hard-delete a fact row (Blob cleanup is the caller's job). */
export async function deleteFact(id: string): Promise<void> {
	const q = sql();
	await q`DELETE FROM facts WHERE id = ${id}`;
}
```

- [ ] **Step 3: Verify and create the table**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run check`
Expected: PASS.

Run: `npm run db:init`
Expected: `✅ stories + prompt_templates + themes + facts tables ready`. If `DATABASE_URL` is unset the script says so — report that rather than inventing one.

- [ ] **Step 4: Commit**

```bash
git add scripts/init-db.mjs src/lib/server/db.ts
git commit -m "feat: facts table and queries"
```

---

## Task 8: Validating the brief

**Files:** Modify `src/lib/server/validate.ts` and `src/lib/server/validate.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/server/validate.test.ts`:

```ts
import { validateFactBrief } from './validate';

describe('validateFactBrief', () => {
	const base = {
		brief: 'why do ants walk in a line',
		topic: 'Ants',
		languages: ['en', 'te'],
		illustration: 'cover_plus',
		section_target: 4
	};

	it('accepts a good brief', () => {
		const r = validateFactBrief(base);
		expect(r.ok).toBe(true);
		if (r.ok) {
			expect(r.topic).toBe('Ants');
			expect(r.languages).toEqual(['en', 'te']);
			expect(r.illustration).toBe('cover_plus');
			expect(r.sectionTarget).toBe(4);
		}
	});

	it('rejects a blank brief or topic', () => {
		expect(validateFactBrief({ ...base, brief: '   ' }).ok).toBe(false);
		expect(validateFactBrief({ ...base, topic: '' }).ok).toBe(false);
	});

	it('sanitises the brief like other operator free text', () => {
		const r = validateFactBrief({ ...base, brief: '  why do  "ants"  walk  ' });
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.brief).toBe('why do ants walk');
	});

	it('rejects an unknown illustration level', () => {
		expect(validateFactBrief({ ...base, illustration: 'all_the_pictures' }).ok).toBe(false);
	});

	it('rejects an unknown language and an empty language list', () => {
		expect(validateFactBrief({ ...base, languages: ['en', 'fr'] }).ok).toBe(false);
		expect(validateFactBrief({ ...base, languages: [] }).ok).toBe(false);
	});

	it('rejects a section target outside 1..10', () => {
		expect(validateFactBrief({ ...base, section_target: 0 }).ok).toBe(false);
		expect(validateFactBrief({ ...base, section_target: 11 }).ok).toBe(false);
		expect(validateFactBrief({ ...base, section_target: 'four' }).ok).toBe(false);
	});

	it('rejects a null body', () => {
		expect(validateFactBrief(null).ok).toBe(false);
	});
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- validate`
Expected: FAIL — `validateFactBrief` is not exported.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/server/validate.ts`:

```ts
import { ILLUSTRATION_LEVELS, type IllustrationLevel } from './factImages';
import { MAX_SECTIONS } from './factParse';

export type FactBriefOk = {
	ok: true;
	brief: string;
	topic: string;
	languages: Language[];
	illustration: IllustrationLevel;
	sectionTarget: number;
};

const BRIEF_MAX = 300;
const TOPIC_MAX = 40;

/**
 * Validate the admin fact brief. Pure. The brief steers the topic only — the safety
 * rules and the output contract live in factPrompt.ts's locked floor and cannot be
 * reached from here.
 */
export function validateFactBrief(body: unknown): FactBriefOk | Err {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): Err => ({ ok: false, code: 'invalid_input', message });

	const brief = sanitizeText(b.brief, BRIEF_MAX);
	if (!brief) return err('Please write what the fact should explain.');

	const topic = sanitizeText(b.topic, TOPIC_MAX);
	if (!topic) return err('Please give the fact a topic.');

	const langs = Array.isArray(b.languages) ? b.languages : [];
	if (!langs.length) return err('Pick at least one language.');
	if (!langs.every((l) => LANGUAGES.includes(l as Language))) return err('Unknown language.');

	const illustration = b.illustration as IllustrationLevel;
	if (!ILLUSTRATION_LEVELS.includes(illustration)) return err('Pick how much to illustrate.');

	const sectionTarget = Number(b.section_target);
	if (!Number.isInteger(sectionTarget) || sectionTarget < 1 || sectionTarget > MAX_SECTIONS) {
		return err(`Pick between 1 and ${MAX_SECTIONS} screens.`);
	}

	return {
		ok: true,
		brief,
		topic,
		languages: langs as Language[],
		illustration,
		sectionTarget
	};
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- validate && npm run check`
Expected: PASS both.

- [ ] **Step 5: Commit**

```bash
git add src/lib/server/validate.ts src/lib/server/validate.test.ts
git commit -m "feat: validate the admin fact brief"
```

---

## Task 9: The generation endpoint

**Files:** Create `src/routes/api/admin/facts/+server.ts`

- [ ] **Step 1: Write the endpoint**

Create `src/routes/api/admin/facts/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateFactBrief } from '$lib/server/validate';
import { buildFactMessages, buildFactImagePrompt } from '$lib/server/factPrompt';
import { parseFactJson } from '$lib/server/factParse';
import { imagePlan } from '$lib/server/factImages';
import { chatJson, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { insertFact, listFactsAdmin } from '$lib/server/db';
import type { FactRecord } from '$lib/types';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// Admin fact generation has no family passcode and no daily cap, like admin stories.

// A ten-section fact illustrated throughout is eleven image calls, which runs well past
// the platform default timeout.
export const config = { maxDuration: 120 };

type ErrorCode = 'invalid_input' | 'openai_failed' | 'server_error';
function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const GET: RequestHandler = async () => {
	try {
		return json({ facts: await listFactsAdmin() });
	} catch (err) {
		console.error('admin fact list failed:', err instanceof Error ? err.message : 'unknown');
		return fail('server_error', 'Could not load facts.', 500);
	}
};

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', 'Something is off with the brief. Please try again.', 400);
	}

	const v = validateFactBrief(body);
	if (!v.ok) return fail(v.code, v.message, 400);

	try {
		// One call for every language, so the structure is shared by construction.
		const parsed = parseFactJson(
			await chatJson(
				buildFactMessages({
					brief: v.brief,
					topic: v.topic,
					languages: v.languages,
					sectionTarget: v.sectionTarget
				})
			)
		);

		const plan = imagePlan(parsed.structure, v.illustration);
		const id = crypto.randomUUID();

		// Cover first, then each planned section image — all in parallel. A failed image
		// becomes "" for that slot rather than failing the whole fact.
		const jobs: Array<{ slot: number | 'cover'; body: string }> = [
			...(plan.cover && parsed.cover_prompt ? [{ slot: 'cover' as const, body: parsed.cover_prompt }] : []),
			...plan.sectionIndices.map((i) => ({ slot: i, body: parsed.structure[i].image_prompt ?? '' }))
		];

		const results = await Promise.all(
			jobs.map((j) =>
				generateImage(buildFactImagePrompt(j.body))
					.then((bytes) => uploadImage(bytes, `fact-${id}-${j.slot}`, 'facts'))
					.catch((e) => {
						console.error(`fact image ${j.slot} failed:`, e instanceof Error ? e.message : 'unknown');
						return '';
					})
			)
		);

		let coverUrl = '';
		const sectionImages = parsed.structure.map(() => '');
		jobs.forEach((j, n) => {
			if (j.slot === 'cover') coverUrl = results[n];
			else sectionImages[j.slot] = results[n];
		});

		const fact: FactRecord = {
			id,
			type: 'nature_fact',
			topic: parsed.topic || v.topic,
			age_range: '5-8',
			status: 'draft',
			cover_image_url: coverUrl,
			cover_prompt: parsed.cover_prompt,
			section_images: sectionImages,
			structure: parsed.structure,
			content: parsed.content,
			created_at: new Date().toISOString()
		};

		await insertFact(fact);
		return json({ fact });
	} catch (err) {
		console.error('admin fact generation failed:', err instanceof Error ? err.message : 'unknown');
		return fail('openai_failed', 'The fact machine had a hiccup. Please try again.', 502);
	}
};
```

- [ ] **Step 2: Verify**

Run: `npm run check`
Expected: PASS, 0 errors.

- [ ] **Step 3: Commit**

```bash
git add src/routes/api/admin/facts/+server.ts
git commit -m "feat: generate a fact from a brief"
```

---

## Task 10: Publish, unpublish, delete

**Files:** Create `src/routes/api/admin/facts/[id]/+server.ts`

- [ ] **Step 1: Write the endpoint**

Create `src/routes/api/admin/facts/[id]/+server.ts`, mirroring the story equivalent:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecordAdmin, setFactStatus, deleteFact } from '$lib/server/db';
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
		await setFactStatus(params.id, status);
		return json({ ok: true, status });
	} catch (err) {
		console.error('setFactStatus failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not update the fact.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const fact = await getFactRecordAdmin(params.id);
		if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });

		// Recovery trail: serverless FS is read-only, so log the row before deleting.
		// Facts carry no child PII, so the whole record is safe to log.
		console.log('[admin] deleting fact backup:', JSON.stringify(fact));

		await deleteImages([fact.cover_image_url, ...fact.section_images]);
		await deleteFact(params.id);
		return json({ ok: true });
	} catch (err) {
		console.error('delete fact failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not delete the fact.' }, { status: 500 });
	}
};
```

- [ ] **Step 2: Verify and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add "src/routes/api/admin/facts/[id]/+server.ts"
git commit -m "feat: publish, unpublish and delete a fact"
```

---

## Task 11: The public read endpoints

**Files:** Create `src/routes/api/facts/+server.ts` and `src/routes/api/facts/[id]/+server.ts`

- [ ] **Step 1: The list endpoint**

Create `src/routes/api/facts/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listFactRecords } from '$lib/server/db';
import { flattenFact } from '$lib/server/factFlatten';
import type { Fact, Language } from '$lib/types';

const LANGUAGES: Language[] = ['en', 'te'];

/**
 * Published facts, flattened to one language — the same shape the bundled index.json
 * used to return, so the kid grid is unchanged. A fact with no words in this language
 * is simply absent.
 */
export const GET: RequestHandler = async ({ url }) => {
	const lang = url.searchParams.get('language') as Language | null;
	if (!lang || !LANGUAGES.includes(lang)) {
		return json({ error: 'invalid_input', message: 'Unknown language.' }, { status: 400 });
	}
	try {
		const facts = (await listFactRecords())
			.map((r) => flattenFact(r, lang))
			.filter((f): f is Fact => f !== null);
		return json({ facts });
	} catch (err) {
		console.error('list facts failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load facts.' }, { status: 500 });
	}
};
```

- [ ] **Step 2: The single-fact endpoint**

Create `src/routes/api/facts/[id]/+server.ts`:

```ts
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecord } from '$lib/server/db';
import { flattenFact } from '$lib/server/factFlatten';
import type { Language } from '$lib/types';

const LANGUAGES: Language[] = ['en', 'te'];

export const GET: RequestHandler = async ({ params, url }) => {
	const lang = url.searchParams.get('language') as Language | null;
	if (!lang || !LANGUAGES.includes(lang)) {
		return json({ error: 'invalid_input', message: 'Unknown language.' }, { status: 400 });
	}
	try {
		const record = await getFactRecord(params.id);
		const fact = record ? flattenFact(record, lang) : null;
		// Missing, unpublished, and "not in this language" are all not-found to a child.
		if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });
		return json({ fact });
	} catch (err) {
		console.error('get fact failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the fact.' }, { status: 500 });
	}
};
```

- [ ] **Step 3: Verify and commit**

Run: `npm run check`
Expected: PASS.

```bash
git add src/routes/api/facts
git commit -m "feat: public fact endpoints, flattened per language"
```

---

## Task 12: Kid-side wiring

**Files:** Modify `src/lib/data/loadContent.ts`, `src/routes/facts/+page.svelte`

- [ ] **Step 1: Point the loaders at the API**

In `src/lib/data/loadContent.ts`, replace `loadFacts` and `loadFact`. The signatures and return types are unchanged, so `/facts/[id]` needs no edit at all:

```ts
export async function loadFacts(language: Language): Promise<Fact[]> {
	const response = await fetch(`/api/facts?language=${language}`);
	if (!response.ok) throw new Error('facts load failed');
	const data = (await response.json()) as { facts: Fact[] };
	return data.facts;
}

export async function loadFact(id: string, language: Language): Promise<Fact | null> {
	const response = await fetch(`/api/facts/${id}?language=${language}`);
	if (response.status === 404) return null;
	if (!response.ok) throw new Error('fact load failed');
	const data = (await response.json()) as { fact: Fact };
	return data.fact;
}
```

Note these now **throw** on a network failure rather than returning `[]`, which is what lets the grid tell "offline" apart from "no facts yet".

- [ ] **Step 2: Give the grid a loading and a failure state**

In `src/routes/facts/+page.svelte`, replace the state and the effect:

```ts
	let facts = $state<Fact[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadFacts($language)
			.then((f) => (facts = f))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});
```

and replace the empty-state block with the same precedence the stories grid uses — first match wins, so a child never sees "no facts" while facts are still arriving:

```svelte
	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాలు వస్తున్నాయి...' : 'Loading facts...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాల కోసం వైఫై కావాలి.' : 'We need wifi to load facts.'}
		</p>
	{:else if facts.length === 0}
		<p class="text-center text-gray-400 mt-12 text-xl">No facts yet!</p>
	{/if}
```

If `te` is not already derived in that file, add `const te = $derived($language === 'te');`.

**The Telugu strings above were written by Claude and must be flagged to the user for review** — the project rule is that content and translations come from the owner. Do not invent any further Telugu.

- [ ] **Step 3: Verify and commit**

Run: `npm run check && npm test`
Expected: PASS both.

```bash
git add src/lib/data/loadContent.ts src/routes/facts/+page.svelte
git commit -m "feat: facts come from the API, with loading and offline states"
```

---

## Task 13: Admin list and create screens

**Files:** Create `src/routes/admin/facts/+page.svelte`, `+page.server.ts`, `src/routes/admin/facts/create/+page.svelte`; modify `src/routes/admin/+layout.svelte`

- [ ] **Step 1: The list page server load**

Create `src/routes/admin/facts/+page.server.ts`:

```ts
import type { PageServerLoad } from './$types';
import { listFactsAdmin } from '$lib/server/db';
import { factLanguages } from '$lib/server/factFlatten';
import type { AdminFactSummary } from '$lib/types';

export const load: PageServerLoad = async () => {
	try {
		const rows = await listFactsAdmin();
		const facts: AdminFactSummary[] = rows.map((r) => {
			const langs = factLanguages(r);
			return {
				id: r.id,
				topic: r.topic,
				// Any available language's title, for display only.
				title: langs.length ? (r.content[langs[0]]?.title ?? r.topic) : r.topic,
				cover_url: r.cover_image_url,
				status: r.status,
				languages: langs,
				section_count: r.structure.length,
				created_at: r.created_at
			};
		});
		return { facts, loadError: false };
	} catch (err) {
		console.error('admin fact list failed:', err instanceof Error ? err.message : 'unknown');
		return { facts: [] as AdminFactSummary[], loadError: true };
	}
};
```

- [ ] **Step 2: The list page**

**These two page steps are specified rather than given as code**, deliberately: both are
presentational and mirror an existing admin page almost line for line, so copying that file
and adapting it produces something consistent, whereas transcribing 200 lines of markup here
invites drift. Every piece of logic they need is already coded above.

Create `src/routes/admin/facts/+page.svelte`. **Open `src/routes/admin/+page.svelte` and
`src/lib/components/admin/StoryTable.svelte` first and mirror their structure, slate styling
and button classes.** It must show, per fact: cover thumbnail or a 🌿 placeholder, title, topic, `StatusChip`, the **languages present** (e.g. `EN · TE`, so a missing translation is visible), the section count, and buttons for Publish/Unpublish and Delete that `fetch` `/api/admin/facts/<id>` with `{action}` or `DELETE` and then `invalidateAll()`. Include a "New fact" link to `/admin/facts/create` and an amber banner when `data.loadError`.

Delete must ask for confirmation **inline** — a disclosure that swaps the button for "Really delete?" / "Cancel" — **not** `confirm()`. A native dialog blocks the automation used to verify this page.

- [ ] **Step 3: The create page**

Create `src/routes/admin/facts/create/+page.svelte`:

- Textarea for the brief; text input for the topic.
- Checkboxes for languages, English and Telugu both checked by default.
- A number input for screens, 1 to 10, default 4.
- Radio buttons for illustration: `cover`, `cover_plus` (default), `every`.
- **A live cost line** above the button. This is the error-prone part, so here it is in full — it mirrors `imagePlan`, and the `− 2` accounts for the `fun_facts` and `lesson` sections the prompt always asks for and which never carry pictures:

```ts
	import { RUPEES_PER_IMAGE } from '$lib/server/factImages';

	let screens = $state(4);
	let illustration = $state<'cover' | 'cover_plus' | 'every'>('cover_plus');

	// Sections that CAN hold a picture: everything except the fun_facts and lesson
	// the prompt always appends.
	const illustratable = $derived(Math.max(0, screens - 2));
	const pictureCount = $derived(
		illustration === 'cover' ? 0 : illustration === 'cover_plus' ? Math.min(2, illustratable) : illustratable
	);
	const rupees = $derived((1 + pictureCount) * RUPEES_PER_IMAGE);
```

and render it as, for example, `About ₹{rupees} — 1 cover + {pictureCount} pictures (estimate)`. It is an estimate because the model chooses the final structure.
- On submit, POST to `/api/admin/facts`, show a busy state (generation takes up to two minutes), then `goto('/admin/facts')` on success or show the returned message on failure.

- [ ] **Step 4: Nav link**

In `src/routes/admin/+layout.svelte`, add `Sprout` to the lucide import and a link after the Themes one:

```svelte
		<a
			href="/admin/facts"
			class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
			onclick={() => (drawerOpen = false)}
		>
			<Sprout size={18} strokeWidth={1.5} /> Facts
		</a>
```

- [ ] **Step 5: Verify**

Run: `npm run check && npm test && npm run build`
Expected: PASS all three.

Then confirm the routes are gated:

```bash
source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm run dev > /tmp/ck-facts.log 2>&1 &
# wait for boot, then:
curl -s -o /dev/null -w '%{http_code}\n' localhost:5173/admin/facts
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:5173/api/admin/facts
curl -s -o /dev/null -w '%{http_code}\n' "localhost:5173/api/facts?language=en"
```
Expected: `303`, `401`, `200`. A 200 on either admin route means the gate is not covering it — report that loudly. Kill the server afterwards (`pkill -f "vite dev"`).

- [ ] **Step 6: Commit**

```bash
git add src/routes/admin/facts src/routes/admin/+layout.svelte
git commit -m "feat: admin facts list and create screens"
```

---

## Task 14: Import the existing fact, document, verify

**Files:** Create `scripts/import-facts.mjs`; modify `CLAUDE.md`

- [ ] **Step 1: The import script**

Create `scripts/import-facts.mjs`. It reads `static/content/facts/en/index.json`, converts each bundled fact to a `FactRecord` — English block only, `structure` derived from the section types, `section_images` all `''`, `status: 'published'` (these are live today and must stay live), `created_at: new Date().toISOString()` — and upserts with `ON CONFLICT (id) DO NOTHING` so re-running is safe. Follow the style of `scripts/init-db.mjs`, including the `DATABASE_URL` check and a summary line at the end.

Run it: `node --env-file=.env scripts/import-facts.mjs`
Expected: a line reporting how many facts were imported and how many were already present. Run it **twice** and confirm the second run imports zero — that proves idempotency.

The bundled JSON files stay in place and in git history; they simply stop being read.

- [ ] **Step 2: Update CLAUDE.md**

- Change pillar 1 in Mission: nature facts are **server-driven as of 2026-10-18**, not bundled.
- Amend the Always rule "Keep facts and curated stories fully offline" — facts are now DB-backed; offline support is deferred to the cache increment. Curated stories are unaffected.
- Add a dated scope note covering: one row per fact holding every language, images shared across languages, structure outside `content`, 1–10 sections, operator-chosen illustration level, draft/publish, and **re-run `npm run db:init`**.
- Add `/api/facts`, `/api/facts/[id]`, `/api/admin/facts`, `/api/admin/facts/[id]` to the backend list, and `/admin/facts` to the folder structure along with the new `src/lib/server/fact*.ts` modules.
- Note that the generated-content translation exception now covers facts too.

- [ ] **Step 3: Full verification**

Run: `source ~/.nvm/nvm.sh && nvm use 22.23.1 && npm test && npm run check && npm run build`
Expected: all pass. Test count should be 189 + 42 new = **231** across 15 files
(factParse 14, factFlatten 12, factImages 9, validate +7).

- [ ] **Step 4: Commit**

```bash
git add scripts/import-facts.mjs CLAUDE.md
git commit -m "feat: import the bundled fact and document the facts pipeline"
```

---

## Notes for the implementer

- **`npm run db:init` must be re-run** before anything can be saved — there is a new `facts` table.
- **Never invent Telugu.** Task 12 adds two Telugu strings that are already written out; flag them for the owner's review and write no others. The project rule is that content and translations come from the owner.
- **The kid `Fact` type and both kid routes must not change shape.** If something tempts you to alter `FactCard` or `SectionRenderer`, the flattening is wrong — fix `factFlatten.ts` instead.
- **A fact with only one language is valid and publishable.** It appears in that language's list and is absent from the others. The imported ants fact is exactly this case.
- **Do not add per-fact editing.** That is increment A2 and explicitly out of scope here.
- **Do not use `confirm()` anywhere** — a native dialog blocks the browser automation used to verify these pages.
