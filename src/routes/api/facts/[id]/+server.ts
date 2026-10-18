import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecord } from '$lib/server/db';
import { flattenFact } from '$lib/server/factFlatten';
import type { Language } from '$lib/types';

const LANGUAGES: Language[] = ['en', 'te'];

export const GET: RequestHandler = async ({ params, url }) => {
	const lang = url.searchParams.get('language') as Language | null;
	if (!lang || !LANGUAGES.includes(lang)) {
		return json({ error: 'invalid_input', message: 'Unknown language.' }, { status: 400 });
	}
	try {
		const record = await getFactRecord(params.id);
		const fact = record ? flattenFact(record, lang) : null;
		// Missing, unpublished, and "not in this language" are all not-found to a child.
		if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });
		return json({ fact });
	} catch (err) {
		console.error('get fact failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the fact.' }, { status: 500 });
	}
};
