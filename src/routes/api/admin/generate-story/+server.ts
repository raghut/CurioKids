import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAdminBrief } from '$lib/server/validate';
import { buildAdminStoryMessages, buildAdminCoverPrompt } from '$lib/server/storyPrompt';
import { generateStoryText, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { assembleStory } from '$lib/server/assembleStory';
import { insertStory } from '$lib/server/db';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// Admin generation has NO family passcode and NO daily cap. Cover image only.

type ErrorCode = 'invalid_input' | 'openai_failed' | 'server_error';
function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', 'Something is off with the brief. Please try again.', 400);
	}

	const v = validateAdminBrief(body);
	if (!v.ok) return fail(v.code, v.message, 400);

	try {
		const messages = buildAdminStoryMessages({
			storyIdea: v.storyIdea,
			character: v.character,
			customCharacter: v.customCharacter,
			supportingCharacter: v.supportingCharacter,
			theme: v.theme,
			ageBand: v.ageBand,
			language: v.language,
			tone: v.tone,
			setting: v.setting,
			moralFocus: v.moralFocus,
			extra: v.extra
		});
		const text = await generateStoryText(messages);

		const heroDescriptor = v.character ? v.character.prompt_descriptor : (v.customCharacter as string);
		let coverUrl = '';
		try {
			const bytes = await generateImage(buildAdminCoverPrompt(heroDescriptor, text.scene));
			coverUrl = await uploadImage(bytes, 'admin-cover');
		} catch (e) {
			console.error('admin cover image failed:', e instanceof Error ? e.message : 'unknown');
			coverUrl = '';
		}

		const story = assembleStory({
			id: crypto.randomUUID(),
			text,
			language: v.language,
			character_id: v.character ? v.character.id : (v.customCharacter as string),
			theme_id: v.theme.id,
			childName: null,
			coverUrl,
			pageUrls: [],
			createdAt: new Date().toISOString(),
			status: 'draft',
			age_tag: v.ageBand
		});

		await insertStory(story);
		return json({ story });
	} catch (err) {
		console.error('admin generate-story failed:', err instanceof Error ? err.message : 'unknown');
		return fail('openai_failed', 'The story machine had a hiccup. Please try again.', 502);
	}
};
