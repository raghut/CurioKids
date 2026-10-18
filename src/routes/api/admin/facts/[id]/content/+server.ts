import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecordAdmin, updateFact } from '$lib/server/db';
import { validateContentEdit, applyContentEdit } from '$lib/server/factEdit';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// A plain save: no model call, no cost.

export const POST: RequestHandler = async ({ params, request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	let fact;
	try {
		fact = await getFactRecordAdmin(params.id);
	} catch (err) {
		console.error('fact content edit load failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the fact.' }, { status: 500 });
	}
	if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });

	const edit = validateContentEdit(body, fact);
	if (!edit.ok) return json({ error: 'invalid_input', message: edit.message }, { status: 400 });

	const updated = applyContentEdit(fact, edit);
	try {
		await updateFact(updated);
	} catch (err) {
		console.error('fact content save failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not save the words.' }, { status: 500 });
	}

	return json({ ok: true, language: edit.language, content: edit.content });
};
