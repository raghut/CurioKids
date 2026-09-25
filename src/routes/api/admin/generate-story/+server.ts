import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAdminBrief } from '$lib/server/validate';
import { buildAdminStoryMessages, buildAdminCoverPrompt, buildAdminPageImagePrompt } from '$lib/server/storyPrompt';
import { generateStoryText, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { assembleStory } from '$lib/server/assembleStory';
import { insertStory } from '$lib/server/db';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// Admin generation has NO family passcode and NO daily cap. 5-6 and 7-8 get a cover
// image only; the 2-4 band is a board book, so it illustrates every page too (6 images).

// A 2-4 story generates 6 images, which takes well past the platform's default
// function timeout — give this route room.
export const config = { maxDuration: 120 };

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

		// The 2-4 band always illustrates every page — the band itself is the switch,
		// deliberately not GENERATE_PAGE_IMAGES (that flag is for the kid flow).
		const withPageImages = v.ageBand === '2-4';
		const imagePrompts = [
			buildAdminCoverPrompt(heroDescriptor, text.scene),
			...(withPageImages
				? text.pages.map((pg) => buildAdminPageImagePrompt(heroDescriptor, pg.image_prompt))
				: [])
		];

		// Generate in parallel; a failed image becomes "" for that slot rather than
		// failing the whole story.
		const imageResults = await Promise.all(
			imagePrompts.map((prompt, i) =>
				generateImage(prompt)
					.then((bytes) => uploadImage(bytes, i === 0 ? 'admin-cover' : `admin-page-${i}`))
					.catch((e) => {
						console.error(`admin image ${i} failed:`, e instanceof Error ? e.message : 'unknown');
						return '';
					})
			)
		);

		const coverUrl = imageResults[0] ?? '';
		const pageUrls = withPageImages ? imageResults.slice(1) : [];

		const story = assembleStory({
			id: crypto.randomUUID(),
			text,
			language: v.language,
			character_id: v.character ? v.character.id : (v.customCharacter as string),
			theme_id: v.theme.id,
			childName: null,
			coverUrl,
			pageUrls,
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
