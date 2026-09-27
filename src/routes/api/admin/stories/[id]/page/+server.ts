import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStoryAdmin, updateStory } from '$lib/server/db';
import { deleteImages, uploadImage } from '$lib/server/blob';
import { generateImage } from '$lib/server/openaiClient';
import { validatePageEdit, COVER_INDEX } from '$lib/server/pageEdit';
import { renderWithFloor } from '$lib/server/promptTemplates';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// One image at most, so this needs far less headroom than a full generation.
export const config = { maxDuration: 60 };

export const POST: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	let story;
	try {
		story = await getStoryAdmin(params.id);
	} catch (err) {
		console.error('page edit load failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the story.' }, { status: 500 });
	}
	if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });

	const edit = validatePageEdit(body, story.pages.length);
	if (!edit.ok) return json({ error: 'invalid_input', message: edit.message }, { status: 400 });

	// --- Text: a plain save, no model call and no cost. ---
	if (edit.action === 'text') {
		story.pages[edit.index] = { ...story.pages[edit.index], text: edit.text };
		try {
			await updateStory(story);
		} catch (err) {
			console.error('page text save failed:', err instanceof Error ? err.message : 'unknown');
			return json({ error: 'server_error', message: 'Could not save the text.' }, { status: 500 });
		}
		return json({ ok: true, text: edit.text });
	}

	// --- Image: re-render through the locked floor, regenerate, swap, clean up. ---
	const isCover = edit.index === COVER_INDEX;
	const kind = isCover ? 'image_cover' : 'image_page';

	// The stored prompt is the already-rendered BODY, so the operator is editing plain
	// text with no placeholders left in it. Applying the floor here — exactly once —
	// keeps the no-text and safety rules on a hand-written prompt.
	const finalPrompt = renderWithFloor(kind, edit.prompt, {});

	const previousUrl = isCover ? story.cover_image_url : story.pages[edit.index].image_url;

	let newUrl: string;
	try {
		const bytes = await generateImage(finalPrompt);
		newUrl = await uploadImage(bytes, isCover ? 'admin-cover' : `admin-page-${edit.index + 1}`);
	} catch (err) {
		console.error('regenerate image failed:', err instanceof Error ? err.message : 'unknown');
		return json(
			{ error: 'openai_failed', message: 'The picture machine had a hiccup. Please try again.' },
			{ status: 502 }
		);
	}

	if (isCover) {
		story.cover_image_url = newUrl;
		story.cover_prompt = edit.prompt;
	} else {
		story.pages[edit.index] = {
			...story.pages[edit.index],
			image_url: newUrl,
			image_prompt: edit.prompt
		};
	}

	try {
		await updateStory(story);
	} catch (err) {
		// The image exists but the row didn't move — say so rather than claim success.
		console.error('page image save failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Made the picture but could not save it.' }, { status: 500 });
	}

	// Best-effort cleanup only after the new URL is safely stored.
	if (previousUrl && previousUrl !== newUrl) await deleteImages([previousUrl]);

	return json({ ok: true, image_url: newUrl, image_prompt: edit.prompt });
};
