import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { COOKIE_NAME, SESSION_TTL_MS, checkAdminPasscode, freshCookieValue } from '$lib/server/adminAuth';

const FAIL_DELAY_MS = 500;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await request.formData();
		const passcode = String(form.get('passcode') ?? '');

		if (!checkAdminPasscode(passcode)) {
			await sleep(FAIL_DELAY_MS); // stateless throttle against rapid guessing
			return fail(401, { error: 'Wrong passcode.' });
		}

		cookies.set(COOKIE_NAME, freshCookieValue(), {
			path: '/',
			httpOnly: true,
			secure: true,
			// 'lax' still blocks the cross-site POST/DELETE that CSRF needs, but lets a
			// valid session survive a top-level entry (bookmark / typed URL / external link).
			sameSite: 'lax',
			maxAge: Math.floor(SESSION_TTL_MS / 1000)
		});
		throw redirect(303, '/admin');
	},

	logout: async ({ cookies }) => {
		cookies.delete(COOKIE_NAME, { path: '/' });
		throw redirect(303, '/admin/login');
	}
};
