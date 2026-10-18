import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFactRecordAdmin } from '$lib/server/db';

export const load: PageServerLoad = async ({ params }) => {
	let fact;
	try {
		fact = await getFactRecordAdmin(params.id);
	} catch (err) {
		console.error('fact edit load failed:', err instanceof Error ? err.message : 'unknown');
		throw error(500, 'Could not load the fact.');
	}
	if (!fact) throw error(404, 'Fact not found.');

	return { fact };
};
