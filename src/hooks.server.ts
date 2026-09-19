import { redirect, json } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';
import { COOKIE_NAME, verifyAdminCookie, isAdminConfigured } from '$lib/server/adminAuth';

const LOGIN_PATH = '/admin/login';

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdminArea = pathname.startsWith('/admin') || pathname.startsWith('/api/admin');

	if (isAdminArea) {
		// Admin must be explicitly enabled; never silently open.
		if (!isAdminConfigured()) {
			return json(
				{ error: 'not_configured', message: 'Admin is not set up on this deployment.' },
				{ status: 503 }
			);
		}

		const authed = verifyAdminCookie(event.cookies.get(COOKIE_NAME));
		event.locals.admin = authed;

		const isLogin = pathname === LOGIN_PATH || pathname.startsWith('/admin/login');
		if (!authed && !isLogin) {
			if (pathname.startsWith('/api/admin')) {
				return json({ error: 'unauthorized', message: 'Please log in.' }, { status: 401 });
			}
			throw redirect(303, LOGIN_PATH);
		}
		// Already logged in and visiting the login page → send to dashboard.
		if (authed && isLogin) {
			throw redirect(303, '/admin');
		}
	}

	return resolve(event);
};
