import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getFactRecordAdmin, setFactStatus, deleteFact } from '$lib/server/db';
import { deleteImages } from '$lib/server/blob';

// Auth is enforced in hooks.server.ts (all /api/admin/* require a valid cookie).

export const POST: RequestHandler = async ({ params, request }) => {
	let body: { action?: string };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'invalid_input', message: 'Bad request.' }, { status: 400 });
	}

	if (body.action !== 'publish' && body.action !== 'unpublish') {
		return json({ error: 'invalid_input', message: 'Unknown action.' }, { status: 400 });
	}

	const status = body.action === 'publish' ? 'published' : 'draft';
	try {
		await setFactStatus(params.id, status);
		return json({ ok: true, status });
	} catch (err) {
		console.error('setFactStatus failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not update the fact.' }, { status: 500 });
	}
};

export const DELETE: RequestHandler = async ({ params }) => {
	try {
		const fact = await getFactRecordAdmin(params.id);
		if (!fact) return json({ error: 'not_found', message: 'Fact not found.' }, { status: 404 });

		// Recovery trail: serverless FS is read-only, so log the row before deleting.
		// Facts carry no child PII, so the whole record is safe to log.
		console.log('[admin] deleting fact backup:', JSON.stringify(fact));

		await deleteImages([fact.cover_image_url, ...fact.section_images]);
		await deleteFact(params.id);
		return json({ ok: true });
	} catch (err) {
		console.error('delete fact failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not delete the fact.' }, { status: 500 });
	}
};
