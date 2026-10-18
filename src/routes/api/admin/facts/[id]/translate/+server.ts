import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { Language } from '$lib/types';
import { getFactRecordAdmin, updateFact } from '$lib/server/db';
import { chatJson } from '$lib/server/openaiClient';
import { buildFactTranslateMessages } from '$lib/server/factPrompt';
import { validateContentEdit, applyContentEdit } from '$lib/server/factEdit';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// Text only (~₹0.5): one chat completion, no image call.
export const config = { maxDuration: 60 };

const LANGUAGES: Language[] = ['en', 'te'];

export const POST: RequestHandler = async ({ params, request }) => {
	let body: { language?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	const language = body.language as Language;
	if (!LANGUAGES.includes(language)) {
		return json({ error: 'invalid_input', message: 'Unknown language.' }, { status: 400 });
	}

	let fact;
	try {
		fact = await getFactRecordAdmin(params.id);
	} catch (err) {
		console.error('fact translate load failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not load the fact.' }, { status: 500 });
	}
	if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });

	if (fact.content[language]) {
		return json({ error: 'invalid_input', message: 'This fact already has that language.' }, { status: 400 });
	}

	const from = LANGUAGES.find((l) => l !== language && fact!.content[l]);
	if (!from) {
		return json({ error: 'invalid_input', message: 'This fact has no language to translate from.' }, { status: 400 });
	}
	const source = fact.content[from]!;

	let parsed: unknown;
	try {
		const raw = await chatJson(buildFactTranslateMessages(source, fact.structure, from, language));
		parsed = JSON.parse(raw);
	} catch (err) {
		console.error('fact translate generation failed:', err instanceof Error ? err.message : 'unknown');
		return json(
			{ error: 'openai_failed', message: 'The writer had a hiccup. Please try again.' },
			{ status: 502 }
		);
	}

	const edit = validateContentEdit({ ...(parsed as Record<string, unknown>), language }, fact);
	if (!edit.ok) return json({ error: 'invalid_input', message: edit.message }, { status: 400 });

	const updated = applyContentEdit(fact, edit);
	try {
		await updateFact(updated);
	} catch (err) {
		console.error('fact translate save failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Made the translation but could not save it.' }, { status: 500 });
	}

	return json({ ok: true, language: edit.language, content: edit.content });
};
