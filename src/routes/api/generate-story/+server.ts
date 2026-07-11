import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';
import { buildStoryMessages, buildCoverImagePrompt } from '$lib/server/storyPrompt';
import { generateStoryText, generateCoverImage } from '$lib/server/openaiClient';
import type { CharacterId, GeneratedStory, Language, ThemeId } from '$lib/types';

const CHARACTER_IDS: CharacterId[] = ['rabbit', 'peacock', 'elephant', 'monkey', 'tortoise', 'parrot'];
const THEME_IDS: ThemeId[] = ['be_brave', 'help_friend', 'find_lost', 'learn_new'];
const LANGUAGES: Language[] = ['en', 'te'];

type ErrorCode = 'invalid_input' | 'openai_failed' | 'server_error';

function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	// --- Parse + validate input (never trust the client) ---
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', "Something's not right. Let's go back and try again.", 400);
	}

	const { character_id, theme_id, child_name, language } = (body ?? {}) as Record<string, unknown>;

	if (!CHARACTER_IDS.includes(character_id as CharacterId)) {
		return fail('invalid_input', 'Please pick a character first.', 400);
	}
	if (!THEME_IDS.includes(theme_id as ThemeId)) {
		return fail('invalid_input', 'Please pick a story kind first.', 400);
	}
	if (!LANGUAGES.includes(language as Language)) {
		return fail('invalid_input', "Something's not right. Let's go back and try again.", 400);
	}

	// child_name is optional; used only to build the prompt, then discarded. Never logged.
	const childName =
		typeof child_name === 'string' && child_name.trim() ? child_name.trim().slice(0, 40) : null;

	const character = characters.find((c) => c.id === character_id)!;
	const theme = themes.find((t) => t.id === theme_id)!;
	const lang = language as Language;

	// --- Generate ---
	try {
		const messages = buildStoryMessages({ character, theme, childName, language: lang });
		const text = await generateStoryText(messages);

		const imagePrompt = buildCoverImagePrompt(character, text.scene);
		// gpt-image-1 returns base64 directly, so we get the offline-safe data URI
		// in one call. There is no separate hosted URL to store.
		const coverDataUri = await generateCoverImage(imagePrompt);

		const story: GeneratedStory = {
			id: crypto.randomUUID(),
			type: 'story',
			source: 'generated',
			language: lang,
			age_range: '5-8',
			character_id: character.id,
			theme_id: theme.id,
			child_name: childName,
			title: text.title,
			cover_image_url: '', // gpt-image-1 has no hosted URL; we render from the data URI
			cover_image_data_uri: coverDataUri,
			pages: text.pages.map((p) => ({ text: p.text })),
			moral: text.moral,
			reflection_question: text.reflection_question,
			created_at: new Date().toISOString()
		};

		return json({ story });
	} catch (err) {
		// Do not log child_name or prompt contents.
		console.error('generate-story failed:', err instanceof Error ? err.message : 'unknown error');
		return fail('openai_failed', "Let's try again after wifi comes back!", 502);
	}
};
