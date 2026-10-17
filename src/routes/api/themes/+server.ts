import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { activeThemes, toThemeOptions } from '$lib/server/themes';

/**
 * The active theme list for the kid create screen and the stories filter chips.
 * Public and read-only, like /api/stories. goal_hint is withheld — it is
 * prompt-internal and the client has no use for it.
 */
export const GET: RequestHandler = async () => {
	try {
		return json({ themes: toThemeOptions(await activeThemes()) });
	} catch (err) {
		console.error('list themes failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load themes.' }, { status: 500 });
	}
};
