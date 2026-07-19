import { json } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { RequestHandler } from './$types';
import { validateGenerateRequest } from '$lib/server/validate';
import { buildStoryMessages, buildImagePrompts } from '$lib/server/storyPrompt';
import { generateStoryText, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { assembleStory } from '$lib/server/assembleStory';
import { insertStory, countStoriesToday } from '$lib/server/db';
import { checkPasscode } from '$lib/server/passcode';

type ErrorCode = 'invalid_input' | 'unauthorized' | 'rate_limit' | 'openai_failed' | 'server_error';

function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	// --- Family passcode gate (real cost guard; no-op if CREATE_PASSCODE unset) ---
	if (!checkPasscode(request.headers.get('x-create-code'))) {
		return fail('unauthorized', 'Ask a grown-up for the family code.', 401);
	}

	// --- Parse + validate ---
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', "Something's not right. Let's go back and try again.", 400);
	}

	const v = validateGenerateRequest(body);
	if (!v.ok) return fail(v.code, v.message, 400);
	const { character, theme, language, childName, extra } = v;

	// --- Global daily cost guard ---
	const cap = parseInt(env.DAILY_GENERATION_CAP ?? '20', 10);
	try {
		if ((await countStoriesToday()) >= cap) {
			return fail('rate_limit', "We've made lots of stories today. Let's make more tomorrow!", 429);
		}
	} catch (err) {
		console.error('daily cap check failed:', err instanceof Error ? err.message : 'unknown');
		return fail('server_error', "Let's try again after wifi comes back!", 500);
	}

	const withPageImages = (env.GENERATE_PAGE_IMAGES ?? 'false').trim().toLowerCase() === 'true';

	// --- Generate ---
	try {
		const messages = buildStoryMessages({ character, theme, childName, language, extra });
		const text = await generateStoryText(messages);

		// Build prompts: [cover, page1..pageN]. If page images are off, only the cover.
		const imagePrompts = withPageImages
			? buildImagePrompts(character, text.scene, text.pages)
			: buildImagePrompts(character, text.scene, []); // cover only

		// Generate all images in parallel; a failed image becomes "" (no image for that slot).
		const imageResults = await Promise.all(
			imagePrompts.map((p, i) =>
				generateImage(p)
					.then((bytes) => uploadImage(bytes, `img-${i}`))
					.catch((e) => {
						console.error(`image ${i} failed:`, e instanceof Error ? e.message : 'unknown');
						return '';
					})
			)
		);

		const coverUrl = imageResults[0] ?? '';
		// When page images are disabled, there are no page URLs — assembler fills "".
		const pageUrls = withPageImages ? imageResults.slice(1) : [];

		const story = assembleStory({
			id: crypto.randomUUID(),
			text,
			language,
			character_id: character.id,
			theme_id: theme.id,
			childName,
			coverUrl,
			pageUrls,
			createdAt: new Date().toISOString()
		});

		await insertStory(story);
		return json({ story });
	} catch (err) {
		console.error('generate-story failed:', err instanceof Error ? err.message : 'unknown error');
		return fail('openai_failed', "Let's try again after wifi comes back!", 502);
	}
};
