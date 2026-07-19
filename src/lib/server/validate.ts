import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';
import type { Character, Language, Theme } from '$lib/types';

type Ok = { ok: true; character: Character; theme: Theme; language: Language; childName: string | null };
type Err = { ok: false; code: 'invalid_input'; message: string };

const LANGUAGES: Language[] = ['en', 'te'];

/**
 * Validate the generate-story request body against the locked enums. Pure — no
 * I/O. child_name is trimmed and capped; empty becomes null.
 */
export function validateGenerateRequest(body: unknown): Ok | Err {
	const { character_id, theme_id, child_name, language } = (body ?? {}) as Record<string, unknown>;

	const character = characters.find((c) => c.id === character_id);
	if (!character) return { ok: false, code: 'invalid_input', message: 'Please pick a character first.' };

	const theme = themes.find((t) => t.id === theme_id);
	if (!theme) return { ok: false, code: 'invalid_input', message: 'Please pick a story kind first.' };

	if (!LANGUAGES.includes(language as Language)) {
		return { ok: false, code: 'invalid_input', message: "Something's not right. Let's go back and try again." };
	}

	const childName =
		typeof child_name === 'string' && child_name.trim() ? child_name.trim().slice(0, 40) : null;

	return { ok: true, character, theme, language: language as Language, childName };
}
