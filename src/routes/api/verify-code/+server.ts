import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { checkPasscode } from '$lib/server/passcode';

/**
 * Lightweight check so the create screen can validate the family code at unlock
 * time (instant feedback) instead of after the child builds a whole story. The
 * real cost guard is still the same check inside /api/generate-story — never
 * trust the client. Returns { ok } and 200/401.
 */
export const POST: RequestHandler = async ({ request }) => {
	let code: string | null = null;
	try {
		const body = (await request.json()) as { code?: unknown };
		code = typeof body.code === 'string' ? body.code : null;
	} catch {
		code = null;
	}

	if (!checkPasscode(code)) {
		return json({ ok: false }, { status: 401 });
	}
	return json({ ok: true });
};
