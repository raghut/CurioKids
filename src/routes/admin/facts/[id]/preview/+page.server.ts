import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getFactRecordAdmin } from '$lib/server/db';
import { factLanguages, flattenFact } from '$lib/server/factFlatten';
import type { Fact, Language } from '$lib/types';

export const load: PageServerLoad = async ({ params }) => {
	let record;
	try {
		record = await getFactRecordAdmin(params.id);
	} catch (err) {
		console.error('fact preview load failed:', err instanceof Error ? err.message : 'unknown');
		throw error(500, 'Could not load the fact.');
	}
	if (!record) throw error(404, 'Fact not found.');

	// Flatten here, through the same pure helper /api/facts uses, so the preview reads the
	// record exactly the way a child's screen does — one language at a time, with the shared
	// images folded in. A language the fact has no words for is simply absent.
	const languages = factLanguages(record);
	const facts: Partial<Record<Language, Fact>> = {};
	for (const lang of languages) {
		const flat = flattenFact(record, lang);
		if (flat) facts[lang] = flat;
	}

	return {
		id: record.id,
		topic: record.topic,
		status: record.status,
		languages,
		facts
	};
};
