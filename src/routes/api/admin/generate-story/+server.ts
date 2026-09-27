import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateAdminBrief } from '$lib/server/validate';
import {
	adminTemplateVars,
	buildAdminStoryMessages,
	buildAdminCoverPrompt,
	buildAdminPageImagePrompt
} from '$lib/server/storyPrompt';
import { resolveTemplates } from '$lib/server/promptTemplates';
import { generateStoryText, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { assembleStory } from '$lib/server/assembleStory';
import { insertStory, getPromptOverrides } from '$lib/server/db';

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

	// Operator-edited templates for this band, falling back to the code defaults —
	// including when the prompt_templates table doesn't exist yet (pre-db:init).
	let overrides = {};
	try {
		overrides = await getPromptOverrides(v.ageBand);
	} catch (e) {
		console.error('prompt overrides unavailable, using defaults:', e instanceof Error ? e.message : 'unknown');
	}
	const templates = resolveTemplates(v.ageBand, overrides);

	try {
		const vars = adminTemplateVars({
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
		const text = await generateStoryText(buildAdminStoryMessages(templates, vars));

		// A locked animal keeps its locked descriptor (consistent across every story).
		// A custom character has no descriptor of its own, so we use the one the story
		// model derived from the story it just wrote — without this, the illustrator only
		// ever saw the raw free-text and drew whatever it liked.
		const heroDescriptor = v.character
			? v.character.prompt_descriptor
			: (text.hero_descriptor?.trim() || (v.customCharacter as string));

		// The 2-4 band always illustrates every page — the band itself is the switch,
		// deliberately not GENERATE_PAGE_IMAGES (that flag is for the kid flow).
		const withPageImages = v.ageBand === '2-4';

		// The supporting character gets its own descriptor, added only to the pages the
		// model says it actually appears on — so it looks the same wherever it shows up
		// without wandering into scenes the text never puts it in.
		const supporting = text.supporting_descriptor?.trim() ?? '';
		const imagePrompts = [
			buildAdminCoverPrompt(templates.image_cover, heroDescriptor, text.scene, supporting),
			...(withPageImages
				? text.pages.map((pg) =>
						buildAdminPageImagePrompt(
							templates.image_page,
							heroDescriptor,
							pg.image_prompt,
							pg.has_supporting ? supporting : ''
						)
					)
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
			// Keep the prompts that produced these images so they can be edited later.
			coverPrompt: imagePrompts[0],
			pagePrompts: withPageImages ? imagePrompts.slice(1) : [],
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
