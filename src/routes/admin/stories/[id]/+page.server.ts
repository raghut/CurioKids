import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getStoryAdmin } from '$lib/server/db';
import { activeThemes, toThemeOptions } from '$lib/server/themes';

export const load: PageServerLoad = async ({ params }) => {
	let story;
	try {
		story = await getStoryAdmin(params.id);
	} catch (err) {
		console.error('story edit load failed:', err instanceof Error ? err.message : 'unknown');
		throw error(500, 'Could not load the story.');
	}
	if (!story) throw error(404, 'Story not found.');

	// Labels only — goal_hint is prompt-internal and this payload is serialised
	// into the page's HTML.
	let themes: ReturnType<typeof toThemeOptions> = [];
	try {
		themes = toThemeOptions(await activeThemes());
	} catch (err) {
		// Don't lose the whole edit page just because the theme list is unavailable.
		console.error('retag themes load failed:', err instanceof Error ? err.message : 'unknown');
	}

	return { story, themes };
};
