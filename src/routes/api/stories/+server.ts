import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listStories } from '$lib/server/db';

export const GET: RequestHandler = async ({ url }) => {
	const language = url.searchParams.get('language') ?? undefined;
	try {
		const stories = await listStories(language);
		return json({ stories });
	} catch (err) {
		console.error('list stories failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load stories.' }, { status: 500 });
	}
};
