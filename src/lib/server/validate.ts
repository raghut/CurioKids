import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';
import type { Character, Language, Theme } from '$lib/types';

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
function sanitizeExtra(value: unknown): string | null {
	if (typeof value !== 'string') return null;
	const cleaned = value
		.replace(/["`]/g, '') // strip delimiters that could confuse the prompt fence
		.replace(/\s+/g, ' ') // collapse newlines/tabs/runs into single spaces
		.trim()
		.slice(0, EXTRA_MAX);
	return cleaned ? cleaned : null;
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
