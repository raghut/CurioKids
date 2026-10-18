import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecordAdmin, updateFact } from '$lib/server/db';
import { deleteImages, uploadImage } from '$lib/server/blob';
import { generateImage } from '$lib/server/openaiClient';
import { buildFactImagePrompt } from '$lib/server/factPrompt';
import { validateImageEdit, applyImageEdit, COVER_SLOT } from '$lib/server/factEdit';

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

	let fact;
	try {
		fact = await getFactRecordAdmin(params.id);
	} catch (err) {
		console.error('fact image edit load failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the fact.' }, { status: 500 });
	}
	if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });

	const edit = validateImageEdit(body, fact);
	if (!edit.ok) return json({ error: 'invalid_input', message: edit.message }, { status: 400 });

	const previousUrl = edit.slot === COVER_SLOT ? fact.cover_image_url : fact.section_images[edit.slot];

	let newUrl: string;
	try {
		const bytes = await generateImage(buildFactImagePrompt(edit.prompt));
		newUrl = await uploadImage(bytes, `fact-${params.id}-${edit.slot}`, 'facts');
	} catch (err) {
		console.error('fact regenerate image failed:', err instanceof Error ? err.message : 'unknown');
		return json(
			{ error: 'openai_failed', message: 'The picture machine had a hiccup. Please try again.' },
			{ status: 502 }
		);
	}

	const updated = applyImageEdit(fact, edit.slot, newUrl, edit.prompt);

	try {
		await updateFact(updated);
	} catch (err) {
		// The image exists but the row didn't move — say so rather than claim success.
		// Never delete the previous Blob here: if the save failed, the old picture is
		// still the one the operator (and every reader) sees, and must not be lost.
		console.error('fact image save failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Made the picture but could not save it.' }, { status: 500 });
	}

	// Best-effort cleanup only after the new URL is safely stored.
	if (previousUrl && previousUrl !== newUrl) await deleteImages([previousUrl]);

	return json({ ok: true, slot: edit.slot, url: newUrl, prompt: edit.prompt });
};
