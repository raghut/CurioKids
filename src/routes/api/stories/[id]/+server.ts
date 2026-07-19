import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStory } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
	try {
		const story = await getStory(params.id);
		if (!story) return json({ error: 'not_found', message: 'Story not found.' }, { status: 404 });
		return json({ story });
	} catch (err) {
		console.error('get story failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the story.' }, { status: 500 });
	}
};
