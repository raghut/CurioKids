import type { PageServerLoad } from './$types';
import { listStoriesAdmin } from '$lib/server/db';

export const load: PageServerLoad = async () => {
	try {
		const stories = await listStoriesAdmin();
		return { stories };
	} catch (err) {
		console.error('admin list failed:', err instanceof Error ? err.message : 'unknown');
		return { stories: [], loadError: true };
	}
};
