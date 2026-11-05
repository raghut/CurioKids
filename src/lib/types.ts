export type Language = 'en' | 'te';

export type FactSection =
	| { type: 'question'; text: string; image: string }
	| { type: 'discovery'; text: string; image: string }
	| { type: 'fun_facts'; items: string[] }
	| { type: 'lesson'; text: string };

export type Fact = {
	id: string;
	type: 'nature_fact';
	language: Language;
	topic: string;
	age_range: '5-8';
	title: string;
	subtitle?: string; // optional 1-line card description
	cover_image: string;
	audio: string;
	sections: FactSection[];
	reflection_question: string;
	real_world_mission: string;
	/** Optional animated scene. See FactScene. Absent = the fact uses still images. */
	scene?: FactScene;
};

/**
 * An animated SVG scene that stays on screen while the child steps through a fact.
 * `id` names a reviewed Svelte component in src/lib/scenes/ — scenes are code in the
 * repo, never markup stored in the database. `section_layers[i]` lists which of that
 * scene's layers are visible on section i; the closing screen reuses the last entry.
 * Language-neutral, like section_images: English and Telugu share one scene.
 */
export type FactScene = {
	id: string;
	section_layers: string[][];
};

export type Story = {
	id: string;
	type: 'story';
	source: 'curated';
	language: Language;
	age_range: '5-8';
	theme: string;
	title: string;
	cover_image: string;
	audio: string;
	pages: Array<{ text: string; image: string }>;
	moral: string;
	reflection_question: string;
};

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
	/**
	 * The rendered prompt that produced cover_image_url. Stored so the admin edit
	 * screen can show and re-run it. Absent on stories made before page editing.
	 */
	cover_prompt?: string;
	/** image_prompt is the rendered prompt behind image_url — same reason as above. */
	pages: Array<{ text: string; image_url: string; image_prompt?: string }>;
	moral: string;
	reflection_question: string;
	created_at: string;
	status: 'draft' | 'published';
	/** Optional animated scene. Absent = the story uses its image URLs (or none). */
	scene?: StoryScene;
};

/**
 * A story's animated SVG scene: the same reviewed components as FactScene, stepped by
 * page instead of by section. `page_layers[i]` lists the layers visible on page i.
 */
export type StoryScene = {
	id: string;
	page_layers: string[][];
};

export type StorySummary = {
	id: string;
	title: string;
	cover_url: string;
	age_tag: string;
	language: string;
	created_at: string;
	/**
	 * Extracted from the JSONB blob for the stories filter chips. Null on a row whose
	 * blob predates theme_id, and on a story whose theme has since been archived —
	 * both simply match no chip.
	 */
	theme_id: string | null;
	/** From the JSONB blob, so a scene story's tile can draw its scene. Null when absent. */
	scene?: StoryScene | null;
};

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
	/** Scene id when the story uses an animated scene, so admin can draw its thumbnail. */
	scene_id?: string | null;
};

export type CharacterId = 'rabbit' | 'peacock' | 'elephant' | 'monkey' | 'tortoise' | 'parrot';

export type Character = {
	id: CharacterId;
	name_en: string;
	name_te: string;
	avatar: string;
	prompt_descriptor: string;
	personality_hint: string;
};

/**
 * Themes are operator-managed data (see /admin/themes), so this is a plain string
 * validated at runtime rather than a compile-time union. The runtime guard in
 * validate.ts is what replaces the old type safety.
 */
export type ThemeId = string;

export type Theme = {
	id: ThemeId;
	label_en: string;
	label_te: string;
	/** One-line goal fed to the story prompt. Operator-written, so sanitised + capped. */
	goal_hint: string;
	/** Display order in pickers and filter chips. Lower first. */
	sort_order: number;
	/** Hidden from pickers and chips, but still resolves by id so old stories keep their label. */
	archived: boolean;
};

/** What GET /api/themes returns. goal_hint is withheld — it is prompt-internal. */
export type ThemeOption = Pick<Theme, 'id' | 'label_en' | 'label_te'>;

export type AgeBand = '2-4' | '5-6' | '7-8';
export type Tone = 'gentle' | 'funny' | 'adventurous';

/** The four admin-editable prompt templates. One set per age band. */
export type PromptKind = 'story_system' | 'story_user' | 'image_cover' | 'image_page';

/** A saved override of a default template. Absent = that band/kind uses the code default. */
export type PromptOverride = {
	age_band: AgeBand;
	kind: PromptKind;
	body: string;
	updated_at: string;
};

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
	/** Optional animated scene, index-aligned with `structure` like section_images. */
	scene?: FactScene;
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
	/** Scene id when the fact uses an animated scene, so admin can draw its thumbnail. */
	scene_id?: string | null;
};
