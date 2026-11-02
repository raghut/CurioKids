import type { ChatMessage } from './storyPrompt';
import type { FactContent, FactStructureSection, Language } from '$lib/types';
import { MIN_SECTIONS } from './factParse';
import type { GlossaryTerm } from './glossary';

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

/**
 * Telugu wording rules, plus the operator's glossary when there is one.
 *
 * The rules alone barely moved the needle (1 of 6 test facts clean, the same as no rules
 * at all) — both gpt-4o-mini and gpt-4o still transliterated and invented words. They earn
 * their place by holding the register steady once the glossary has fixed the key nouns,
 * which together scored 6 of 6. Shared with the translate prompt, which writes Telugu too.
 */
function teWordRules(languages: Language[], glossary: GlossaryTerm[]): string[] {
	if (!languages.includes('te')) return [];
	return [
		``,
		`WORDS (Telugu) — this matters more than style:`,
		`Name every thing by the ordinary word a Telugu-speaking family says at home.`,
		`NEVER spell an English word in Telugu letters. "స్నేల్", "షెల్", "వెబ్" are all wrong.`,
		`NEVER invent a word. If you are not certain of the Telugu word for something, say it`,
		`a simpler way using words you are sure of, or describe it in a few plain words.`,
		`Prefer the everyday spoken word over a literary or Sanskrit one: తేనె, not మధు.`,
		`A six-year-old must recognise every noun you use.`,
		`Re-read your Telugu before answering and replace any word a child would not hear at home.`,
		...(glossary.length
			? [
					``,
					`GLOSSARY (Telugu) — the correct word for each thing, given by a Telugu speaker.`,
					`Use these exact words wherever the thing is mentioned. Do not substitute them,`,
					`do not translate them again, do not spell the English word in Telugu letters.`,
					...glossary.map((t) => `  ${t.en} = ${t.te}`)
				]
			: [])
	];
}

export type FactBrief = {
	brief: string;
	topic: string;
	languages: Language[];
	/**
	 * Exactly how many screens the operator wants. Honoured, not approximated: the
	 * prompt decomposes it into the required section types and shows an example of that
	 * length. Asking for N entries without saying how N splits into one question, some
	 * discoveries, one fun_facts and one lesson left the model to pick its own count
	 * (asked 8, returned 5), which made the create screen's cost estimate wrong.
	 */
	sectionTarget: number;
	/**
	 * The operator's Telugu words for this fact. Empty is allowed and means the model
	 * guesses its own vocabulary, which it does badly — see glossary.ts for the numbers.
	 */
	glossary?: GlossaryTerm[];
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
	const contentSkeleton = b.languages.map((l) => `"${l}": <the words in ${LANGUAGE_NAMES[l]}>`).join(', ');

	// 1 question + 1 fun_facts + 1 lesson are fixed, so the discoveries carry the rest of
	// the requested length. MIN_SECTIONS keeps this at 1 or more even if a caller slips
	// past validateFactBrief's floor.
	const discoveries = Math.max(1, b.sectionTarget - (MIN_SECTIONS - 1));
	const picture = '<short English picture description>';

	const teWords = teWordRules(b.languages, b.glossary ?? []);
	const shapeExample = [
		`  [{"type": "question", "image_prompt": ${picture}},`,
		...Array.from(
			{ length: discoveries },
			() => `   {"type": "discovery", "image_prompt": ${picture}},`
		),
		`   {"type": "fun_facts"},`,
		`   {"type": "lesson"}]`
	];

	const system = [
		`You write short, warm, factually accurate nature and "how things work" explainers for children aged 5 to 8.`,
		`You write in ${names}. Every language must say the SAME thing — same facts, same order, same number of sections.`,
		`You always respond with a single valid JSON object and nothing else.`
	].join(' ');

	const user = [
		`Write one explainer about: ${b.brief}`,
		``,
		// The shape is shown, not just described. An earlier version described the fields in
		// prose and labelled the topic as an input; gpt-4o-mini then omitted "topic" entirely
		// and folded the shared structure into each language's "sections", so every single
		// generation failed to parse. Two arrays that must stay separate cannot share a name.
		//
		// Placeholders are angle-bracketed descriptions, never a bare "...": shown a literal
		// `"cover_prompt": "..."` the model copied the ellipsis through as the value.
		`OUTPUT SHAPE — return exactly this JSON object, with exactly these four top-level keys:`,
		`{`,
		`  "topic": "${b.topic}",`,
		`  "cover_prompt": <short English description of the cover illustration>,`,
		`  "structure": <the shared shape, described below>,`,
		`  "content": { ${contentSkeleton} }`,
		`}`,
		`Replace every <...> with real content. Never output the angle brackets or the words inside them.`,
		`Echo "topic" back exactly as given above. It is used for filing, not shown to the child.`,
		``,
		`"structure" — the shared shape of the explainer, written ONCE and never per language.`,
		`It has EXACTLY ${b.sectionTarget} entries, in this order:`,
		`  1 "question", then ${discoveries} "discovery", then 1 "fun_facts", then 1 "lesson".`,
		`  1 + ${discoveries} + 1 + 1 = ${b.sectionTarget}. Count your entries before you answer.`,
		`So "structure" is exactly this, with ${discoveries} discovery ${discoveries === 1 ? 'entry' : 'entries'}:`,
		...shapeExample,
		`The "question" opens the explainer. The ${discoveries} "discovery" ${discoveries === 1 ? 'entry explains' : 'entries explain'} it, in order.`,
		`"question" and "discovery" entries MUST each carry an "image_prompt": one calm, warm`,
		`watercolour scene for that step, described in English. No text or words inside the picture.`,
		`"fun_facts" and "lesson" entries carry no "image_prompt".`,
		`A "structure" entry holds only those two keys — never any words of the explainer itself.`,
		``,
		`"content" — one key per language (${keys}). Each language has:`,
		`  "title" (max 8 words, a question a child would ask),`,
		`  "subtitle" (max 6 words),`,
		`  "sections": an array of the SAME length as "structure", matched by position.`,
		`     For a "fun_facts" position give {"items": [2 to 4 short strings]}.`,
		`     For every other position give {"text": <the sentence or sentences for that step>}.`,
		`     Give ONLY the words here — no "type", no "image_prompt". Those belong to "structure".`,
		`  "reflection_question" (one open question, max 15 words),`,
		`  "real_world_mission" (one thing to go and do outside, max 20 words).`,
		``,
		...teWords,
		`LANGUAGE RULES: each sentence max 12 words. Simple words. Active voice. Read-aloud friendly.`,
		`Each "discovery" step is 1 to 3 sentences.`,
		`Phrasing may differ between languages. The facts, the order and the NAME of every thing must not.`,
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
		`You write natural ${LANGUAGE_NAMES[to]} - not word-for-word - keeping the same facts, the same order and the same number of sections.`,
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
		...teWordRules([to], []),
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
