import type { Character, Theme, Language } from '$lib/types';

export type ChatMessage = { role: 'system' | 'user'; content: string };

/**
 * Builds the chat messages for story-text generation. All length and style
 * constraints from CLAUDE.md are encoded here. The model is instructed to
 * self-reject and rewrite if it exceeds any limit.
 *
 * The prompt is built entirely server-side. We never accept arbitrary prompt
 * text from the client — only the validated character/theme/name/language.
 */
export function buildStoryMessages(opts: {
	character: Character;
	theme: Theme;
	childName: string | null;
	language: Language;
}): ChatMessage[] {
	const { character, theme, childName, language } = opts;

	const languageName = language === 'te' ? 'Telugu (తెలుగు script)' : 'English';
	const heroName = language === 'te' ? character.name_te : character.name_en;

	const nameLine = childName
		? `The child reading this is named "${childName}". Weave their name in naturally once or twice as a friend of ${heroName}. Do not overuse it.`
		: `Do not invent a child character or use any real child name.`;

	const system = [
		`You are a gentle children's story writer for kids aged 5-8.`,
		`You write calm, warm, curiosity-sparking stories. Never scary, never violent, never sad endings.`,
		`You write in ${languageName} ONLY. Every field of your output must be in ${languageName}.`,
		`You always respond with a single valid JSON object and nothing else.`
	].join(' ');

	const user = [
		`Write a picture-book story.`,
		``,
		`HERO: ${heroName}, a ${character.id}. Personality: ${character.personality_hint}.`,
		`The hero is a ${character.id}. Every page must keep ${heroName} a ${character.id} — never turn the hero into any other animal, and use the correct word for a ${character.id} in ${languageName}.`,
		`THEME: ${theme.goal_hint}.`,
		nameLine,
		``,
		`HARD RULES. Before you finish, silently count the words on every page and fix any that break these:`,
		`- Exactly 5 pages.`,
		`- Each page MUST be between 30 and 50 words. Pages under 30 words are WRONG — add another gentle sentence of action or sensory detail until each page reaches 30 to 50 words.`,
		`- Total story body (all 5 pages) MUST be between 150 and 250 words.`,
		`- Title: max 8 words.`,
		`- Moral: exactly 1 sentence, max 15 words.`,
		`- Reflection question: 1 open-ended question, max 15 words.`,
		`- Sentences: max 12 words each. Active voice. No subordinate clauses.`,
		`- Simple, read-aloud-friendly words a 6-year-old knows.`,
		`- Warm, calm tone. A happy or hopeful ending.`,
		``,
		`Return ONLY this JSON shape (all text in ${languageName}):`,
		`{`,
		`  "title": string,`,
		`  "pages": [ { "text": string }, { "text": string }, { "text": string }, { "text": string }, { "text": string } ],`,
		`  "moral": string,`,
		`  "reflection_question": string,`,
		`  "scene": string  // a short English visual description of the opening scene, for illustration`,
		`}`
	].join('\n');

	return [
		{ role: 'system', content: system },
		{ role: 'user', content: user }
	];
}

/**
 * Builds the DALL-E prompt for the cover image. Uses the character's LOCKED
 * prompt_descriptor (for visual consistency across generations) plus the
 * opening scene the text model produced. Always in English — DALL-E prompt
 * language does not affect the rendered image.
 */
export function buildCoverImagePrompt(character: Character, scene: string): string {
	return [
		`Children's picture-book cover illustration.`,
		character.prompt_descriptor + '.',
		`Scene: ${scene}.`,
		`Soft watercolor style, warm gentle colors, calm mood, no text, no words, no letters.`
	].join(' ');
}
