import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStoryAdmin, setStoryStatus, deleteStory } from '$lib/server/db';
import { deleteImages } from '$lib/server/blob';

// Auth is enforced in hooks.server.ts (all /api/admin/* require a valid cookie).

export const GET: RequestHandler = async ({ params, url }) => {
	if (url.searchParams.get('preview') !== '1') {
		return json({ error: 'invalid_input', message: 'Unsupported.' }, { status: 400 });
	}
	try {
		const story = await getStoryAdmin(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });
		return json({ story });
	} catch (err) {
		console.error('admin preview failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the story.' }, { status: 500 });
	}
};

export const POST: RequestHandler = async ({ params, request }) => {
	let body: { action?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	if (body.action !== 'publish' && body.action !== 'unpublish') {
		return json({ error: 'invalid_input', message: 'Unknown action.' }, { status: 400 });
	}

	const status = body.action === 'publish' ? 'published' : 'draft';
	try {
		await setStoryStatus(params.id, status);
		return json({ ok: true, status });
	} catch (err) {
		console.error('setStoryStatus failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not update the story.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const story = await getStoryAdmin(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });

		// Recovery trail: serverless FS is read-only, so log the full row before deleting.
		console.log('[admin] deleting story backup:', JSON.stringify(story));

		const urls = [story.cover_image_url, ...story.pages.map((p) => p.image_url)];
		await deleteImages(urls);
		await deleteStory(params.id);
		return json({ ok: true });
	} catch (err) {
		console.error('delete story failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not delete the story.' }, { status: 500 });
	}
};
