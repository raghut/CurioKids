import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStoryAdmin } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	let story;
	try {
		story = await getStoryAdmin(params.id);
	} catch (err) {
		console.error('story edit load failed:', err instanceof Error ? err.message : 'unknown');
		throw error(500, 'Could not load the story.');
	}
	if (!story) throw error(404, 'Story not found.');
	return { story };
};
