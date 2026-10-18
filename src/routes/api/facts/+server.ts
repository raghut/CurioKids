import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { listFactRecords } from '$lib/server/db';
import { flattenFact } from '$lib/server/factFlatten';
import type { Fact, Language } from '$lib/types';

const LANGUAGES: Language[] = ['en', 'te'];

/**
 * Published facts, flattened to one language — the same shape the bundled index.json
 * used to return, so the kid grid is unchanged. A fact with no words in this language
 * is simply absent.
 */
export const GET: RequestHandler = async ({ url }) => {
	const lang = url.searchParams.get('language') as Language | null;
	if (!lang || !LANGUAGES.includes(lang)) {
		return json({ error: 'invalid_input', message: 'Unknown language.' }, { status: 400 });
	}
	try {
		const facts = (await listFactRecords())
			.map((r) => flattenFact(r, lang))
			.filter((f): f is Fact => f !== null);
		return json({ facts });
	} catch (err) {
		console.error('list facts failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load facts.' }, { status: 500 });
	}
};
