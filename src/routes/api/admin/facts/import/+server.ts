import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseFactImport } from '$lib/server/factImport';
import { getFactRecordAdmin, insertFact } from '$lib/server/db';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// No OpenAI call and no Blob upload: the fact arrives fully written, and any picture is
// either an animated scene (code in the repo) or added later from the edit page.

/** A pasted fact is a few kilobytes; anything far larger is a mistake, not a fact. */
const MAX_BYTES = 200_000;

export const POST: RequestHandler = async ({ request }) => {
	const raw = await request.text();
	if (!raw.trim()) {
		return json({ error: 'invalid_input', message: 'Paste the fact JSON first.' }, { status: 400 });
	}
	if (raw.length > MAX_BYTES) {
		return json({ error: 'invalid_input', message: 'That is far too long for one fact.' }, { status: 400 });
	}

	const r = parseFactImport(raw, {
		newId: () => crypto.randomUUID(),
		now: () => new Date().toISOString()
	});
	if (!r.ok) return json({ error: 'invalid_input', message: r.message }, { status: 400 });

	try {
		// Refuse rather than overwrite: an import must never silently replace a fact that
		// may already be published and edited. Delete it first if a re-import is meant.
		if (await getFactRecordAdmin(r.fact.id)) {
			return json(
				{ error: 'conflict', message: `A fact with the id "${r.fact.id}" already exists.` },
				{ status: 409 }
			);
		}
		await insertFact(r.fact);
		return json({ fact: r.fact });
	} catch (err) {
		console.error('fact import failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not save the fact. Try again.' }, { status: 500 });
	}
};
