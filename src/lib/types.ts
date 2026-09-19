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
	pages: Array<{ text: string; image_url: string }>;
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

export type ThemeId = 'be_brave' | 'help_friend' | 'find_lost' | 'learn_new';

export type Theme = {
	id: ThemeId;
	label_en: string;
	label_te: string;
	goal_hint: string;
};
