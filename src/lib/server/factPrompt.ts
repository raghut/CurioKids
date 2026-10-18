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
