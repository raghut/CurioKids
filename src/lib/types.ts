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
