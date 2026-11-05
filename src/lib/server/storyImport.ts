import type { AgeBand, GeneratedStory, Language, StoryScene, Theme } from '$lib/types';
import { characters } from '$lib/data/characters';
import { AGE_BANDS } from '$lib/data/filterStories';
import { SCENE_CATALOG, isKnownScene } from '$lib/scenes/catalog';

/**
 * Import a hand-written (or Claude-written) story without calling OpenAI.
 *
 * One file may carry several languages, but the stories table holds one language per row
 * (the gallery filters by language), so each language becomes its own row. They share one
 * scene and one page count, so the pictures line up page for page in every language.
 *
 * Pure: no I/O. The route checks id collisions and does the inserts.
 */

const ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,56}$/;
const LANGUAGES: Language[] = ['en', 'te'];
/** Four is the shortest arc that still has a start, a problem, a turn and an end. */
export const MIN_PAGES = 4;
export const MAX_PAGES = 10;

const LIMITS = { title: 80, page: 600, moral: 200, reflection: 200 } as const;

export type StoryImportOk = { ok: true; stories: GeneratedStory[] };
export type StoryImportErr = { ok: false; message: string };

/**
 * stories.id is a Postgres uuid, so a readable id like "story-carrot-share-en" cannot be
 * stored as-is. Hash it into a name-based (v5-style) uuid instead: the same name always
 * gives the same uuid, so re-importing a file still hits the no-overwrite guard.
 */
export async function uuidFromName(name: string): Promise<string> {
	const bytes = new TextEncoder().encode(`curiokids-story:${name}`);
	const h = new Uint8Array(await crypto.subtle.digest('SHA-1', bytes)).slice(0, 16);
	h[6] = (h[6] & 0x0f) | 0x50;
	h[8] = (h[8] & 0x3f) | 0x80;
	const hex = [...h].map((b) => b.toString(16).padStart(2, '0')).join('');
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function text(v: unknown): string {
	return typeof v === 'string' ? v.trim() : '';
}

export function parseStoryImport(
	raw: string,
	opts: { themes: Theme[]; newId: () => string; now: () => string }
): StoryImportOk | StoryImportErr {
	const err = (message: string): StoryImportErr => ({ ok: false, message });

	let obj: Record<string, unknown>;
	try {
		const parsed = JSON.parse(raw);
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			return err('The JSON must be one object, starting with {.');
		}
		obj = parsed as Record<string, unknown>;
	} catch {
		return err('That is not valid JSON. Check for a missing comma or quote.');
	}

	const characterId = text(obj.character_id);
	if (!characters.some((c) => c.id === characterId)) {
		return err(`Unknown character "${characterId}". Characters: ${characters.map((c) => c.id).join(', ')}.`);
	}

	// Same rule as retag: active themes only, so the story is reachable by a filter chip.
	const themeId = text(obj.theme_id);
	const active = opts.themes.filter((t) => !t.archived);
	if (!active.some((t) => t.id === themeId)) {
		return err(`Unknown or archived theme "${themeId}". Active themes: ${active.map((t) => t.id).join(', ')}.`);
	}

	const ageTag = text(obj.age_tag);
	if (!AGE_BANDS.includes(ageTag as AgeBand)) {
		return err(`Pick an age band for "age_tag": ${AGE_BANDS.join(', ')}.`);
	}

	let baseId: string | null = null;
	if (obj.id !== undefined && obj.id !== '') {
		baseId = String(obj.id).trim();
		if (!ID_PATTERN.test(baseId)) {
			return err('The id may use only lowercase letters, numbers and dashes (3 to 57 characters).');
		}
	}

	const content = obj.content as Record<string, unknown> | undefined;
	if (!content || typeof content !== 'object' || Array.isArray(content)) {
		return err('The story needs a "content" object with at least one language, e.g. "en".');
	}
	const unknownLang = Object.keys(content).find((k) => !LANGUAGES.includes(k as Language));
	if (unknownLang) return err(`Unknown language "${unknownLang}". Languages: ${LANGUAGES.join(', ')}.`);
	const langs = LANGUAGES.filter((l) => content[l] !== undefined);
	if (langs.length === 0) return err('The story needs at least one language in "content".');

	type Words = { title: string; pages: string[]; moral: string; reflection_question: string };
	const words: Partial<Record<Language, Words>> = {};
	let pageCount = -1;

	for (const lang of langs) {
		const c = content[lang] as Record<string, unknown> | null;
		if (!c || typeof c !== 'object') return err(`content.${lang} must be an object.`);
		const title = text(c.title);
		const moral = text(c.moral);
		const reflection = text(c.reflection_question);
		if (!title) return err(`content.${lang} needs a title.`);
		if (title.length > LIMITS.title) return err(`content.${lang}: the title is too long (max ${LIMITS.title} characters).`);
		if (!moral) return err(`content.${lang} needs a moral.`);
		if (moral.length > LIMITS.moral) return err(`content.${lang}: the moral is too long.`);
		if (!reflection) return err(`content.${lang} needs a reflection_question.`);
		if (reflection.length > LIMITS.reflection) return err(`content.${lang}: the reflection question is too long.`);

		if (!Array.isArray(c.pages)) return err(`content.${lang} needs a "pages" list.`);
		const pages = c.pages.map((p) => text((p as { text?: unknown } | null)?.text));
		if (pages.length < MIN_PAGES || pages.length > MAX_PAGES) {
			return err(`content.${lang} has ${pages.length} pages; a story needs ${MIN_PAGES} to ${MAX_PAGES}.`);
		}
		const blank = pages.findIndex((p) => !p);
		if (blank !== -1) return err(`content.${lang}: page ${blank + 1} has no text.`);
		const long = pages.findIndex((p) => p.length > LIMITS.page);
		if (long !== -1) return err(`content.${lang}: page ${long + 1} is too long (max ${LIMITS.page} characters).`);

		// Every language shares one scene, indexed by page, so the counts must agree.
		if (pageCount === -1) pageCount = pages.length;
		else if (pages.length !== pageCount) {
			return err(`Every language needs the same number of pages: ${langs[0]} has ${pageCount}, ${lang} has ${pages.length}.`);
		}
		words[lang] = { title, pages, moral, reflection_question: reflection };
	}

	let scene: StoryScene | undefined;
	if (obj.scene !== undefined && obj.scene !== null) {
		const s = obj.scene as { id?: unknown; page_layers?: unknown };
		const sceneId = text(s?.id);
		if (!isKnownScene(sceneId)) {
			return err(`Unknown scene "${sceneId}". Scenes that exist: ${Object.keys(SCENE_CATALOG).join(', ')}.`);
		}
		const allowed = SCENE_CATALOG[sceneId].layers;
		const layers = s.page_layers;
		if (!Array.isArray(layers) || layers.length !== pageCount) {
			return err(
				`The scene needs one layer list per page: ${pageCount} expected, ` +
					`${Array.isArray(layers) ? layers.length : 0} given.`
			);
		}
		const pageLayers: string[][] = [];
		for (let i = 0; i < layers.length; i++) {
			const row = layers[i];
			if (!Array.isArray(row)) return err(`Scene layers for page ${i + 1} must be a list.`);
			const names = row.map((x) => String(x).trim()).filter(Boolean);
			const bad = names.find((n) => !allowed.includes(n));
			if (bad) {
				return err(`Page ${i + 1} uses layer "${bad}", which ${sceneId} does not have. Layers: ${allowed.join(', ')}.`);
			}
			pageLayers.push([...new Set(names)]);
		}
		scene = { id: sceneId, page_layers: pageLayers };
	}

	const createdAt = opts.now();
	const stories: GeneratedStory[] = langs.map((lang) => {
		const w = words[lang]!;
		return {
			id: baseId ? `${baseId}-${lang}` : opts.newId(),
			type: 'story',
			source: 'generated',
			language: lang,
			age_range: '5-8',
			age_tag: ageTag,
			character_id: characterId,
			theme_id: themeId,
			child_name: null,
			title: w.title,
			cover_image_url: '',
			pages: w.pages.map((t) => ({ text: t, image_url: '' })),
			moral: w.moral,
			reflection_question: w.reflection_question,
			created_at: createdAt,
			// Always a draft: read it in the preview and publish from /admin like any
			// admin-made story, so nothing reaches a child unread.
			status: 'draft',
			...(scene ? { scene } : {})
		};
	});

	return { ok: true, stories };
}
