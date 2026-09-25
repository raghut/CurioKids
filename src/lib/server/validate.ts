import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';
import type { AgeBand, Character, Language, Theme, Tone } from '$lib/types';

type Ok = {
	ok: true;
	character: Character;
	theme: Theme;
	language: Language;
	childName: string | null;
	extra: string | null;
};
type Err = { ok: false; code: 'invalid_input'; message: string };

const LANGUAGES: Language[] = ['en', 'te'];

/** Max length of the child's free-text "extra wishes" hint (chars). */
const EXTRA_MAX = 200;

/**
 * Sanitize the optional free-text "extra requirements" field. This is untrusted
 * input, so we treat it as CONTENT ONLY (never as prompt instructions — see
 * storyPrompt.ts): collapse whitespace, drop quote/backtick delimiters, and cap
 * length. Empty becomes null.
 */
/**
 * Sanitize an untrusted free-text field: strip quote/backtick delimiters, collapse
 * whitespace, trim, and cap length. Empty becomes null. Used for all admin brief
 * free-text and the kid "extra wishes" hint.
 */
function sanitizeText(value: unknown, max: number): string | null {
	if (typeof value !== 'string') return null;
	const cleaned = value
		.replace(/["`]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
	return cleaned ? cleaned : null;
}

function sanitizeExtra(value: unknown): string | null {
	return sanitizeText(value, EXTRA_MAX);
}

/**
 * Validate the generate-story request body against the locked enums. Pure — no
 * I/O. child_name is trimmed and capped; empty becomes null. extra is a
 * sanitized, length-capped content hint (never an instruction).
 */
export function validateGenerateRequest(body: unknown): Ok | Err {
	const { character_id, theme_id, child_name, language, extra } = (body ?? {}) as Record<
		string,
		unknown
	>;

	const character = characters.find((c) => c.id === character_id);
	if (!character) return { ok: false, code: 'invalid_input', message: 'Please pick a character first.' };

	const theme = themes.find((t) => t.id === theme_id);
	if (!theme) return { ok: false, code: 'invalid_input', message: 'Please pick a story kind first.' };

	if (!LANGUAGES.includes(language as Language)) {
		return { ok: false, code: 'invalid_input', message: "Something's not right. Let's go back and try again." };
	}

	const childName =
		typeof child_name === 'string' && child_name.trim() ? child_name.trim().slice(0, 40) : null;

	return {
		ok: true,
		character,
		theme,
		language: language as Language,
		childName,
		extra: sanitizeExtra(extra)
	};
}

export type AdminBriefOk = {
	ok: true;
	storyIdea: string;
	character: Character | null;
	customCharacter: string | null;
	supportingCharacter: string | null;
	theme: Theme;
	ageBand: AgeBand;
	language: Language;
	tone: Tone;
	setting: string | null;
	moralFocus: string | null;
	extra: string | null;
};

const AGE_BANDS: AgeBand[] = ['5-6', '7-8'];
const TONES: Tone[] = ['gentle', 'funny', 'adventurous'];
const STORY_IDEA_MAX = 500;
const FIELD_MAX = 120;

/**
 * Validate the admin create-from-brief body. Pure. story_idea is required. Exactly
 * one of character_id (locked animal) / custom_character (free text) must be given.
 * Free-text fields are sanitized + capped. tone defaults to gentle.
 */
export function validateAdminBrief(body: unknown): AdminBriefOk | Err {
	const b = (body ?? {}) as Record<string, unknown>;
	const err = (message: string): Err => ({ ok: false, code: 'invalid_input', message });

	const storyIdea = sanitizeText(b.story_idea, STORY_IDEA_MAX);
	if (!storyIdea) return err('Please write a story idea first.');

	const character = characters.find((c) => c.id === b.character_id) ?? null;
	const customCharacter = sanitizeText(b.custom_character, FIELD_MAX);
	if (!character && !customCharacter) return err('Please pick a character or describe one.');
	if (character && customCharacter) return err('Pick a character OR describe a custom one, not both.');

	const theme = themes.find((t) => t.id === b.theme_id);
	if (!theme) return err('Please pick a story kind first.');

	if (!AGE_BANDS.includes(b.age_band as AgeBand)) return err('Please choose an age band.');
	if (!LANGUAGES.includes(b.language as Language)) {
		return err("Something's not right. Let's go back and try again.");
	}

	const tone: Tone = TONES.includes(b.tone as Tone) ? (b.tone as Tone) : 'gentle';

	return {
		ok: true,
		storyIdea,
		character,
		customCharacter,
		supportingCharacter: sanitizeText(b.supporting_character, FIELD_MAX),
		theme,
		ageBand: b.age_band as AgeBand,
		language: b.language as Language,
		tone,
		setting: sanitizeText(b.setting, FIELD_MAX),
		moralFocus: sanitizeText(b.moral_focus, FIELD_MAX),
		extra: sanitizeExtra(b.extra)
	};
}
