import { env } from '$env/dynamic/private';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

/**
 * Admin auth core. NOT the family passcode — this is a separate, stronger door
 * code (ADMIN_PASSCODE) plus a stateless, HMAC-signed session cookie. No session
 * store: any serverless instance can verify any cookie from the secret alone.
 * Pure functions here are unit-tested; the env-reading wrappers are thin.
 */

export const COOKIE_NAME = 'ck_admin';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // ~7 days

/** Constant-time equality via sha256 (no length or timing leak). */
export function constantTimeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/** Cookie value = "<expiryEpochMs>.<hex hmac(expiry, secret)>". */
export function signSession(expiryMs: number, secret: string): string {
	const mac = createHmac('sha256', secret).update(String(expiryMs)).digest('hex');
	return `${expiryMs}.${mac}`;
}

/** Verify signature + expiry. `now` is epoch ms. */
export function verifySession(value: string | null | undefined, secret: string, now: number): boolean {
	if (!value || !secret) return false;
	const dot = value.indexOf('.');
	if (dot <= 0) return false;
	const expiryStr = value.slice(0, dot);
	const mac = value.slice(dot + 1);
	const expiry = Number(expiryStr);
	if (!Number.isFinite(expiry) || expiry <= now) return false;
	const expected = createHmac('sha256', secret).update(expiryStr).digest('hex');
	return constantTimeEqual(mac, expected);
}

/** Pure passcode decision. Empty/whitespace expected → admin disabled → reject. */
export function decideAdminPasscode(expected: string, provided: string | null | undefined): boolean {
	const e = (expected ?? '').trim();
	if (!e) return false; // admin not configured → closed
	if (!provided || !provided.trim()) return false;
	return constantTimeEqual(provided.trim(), e);
}

// --- Env wrappers (thin; not unit-tested) ---

/** The HMAC signing secret: ADMIN_SESSION_SECRET, or ADMIN_PASSCODE as fallback. */
export function adminSessionSecret(): string {
	const s = (env.ADMIN_SESSION_SECRET ?? '').trim();
	return s || (env.ADMIN_PASSCODE ?? '').trim();
}

/** Whether admin is configured at all (ADMIN_PASSCODE set). */
export function isAdminConfigured(): boolean {
	return (env.ADMIN_PASSCODE ?? '').trim().length > 0;
}

/** Check a login attempt against ADMIN_PASSCODE. */
export function checkAdminPasscode(provided: string | null | undefined): boolean {
	return decideAdminPasscode(env.ADMIN_PASSCODE ?? '', provided);
}

/** Verify the cookie value against the configured secret. */
export function verifyAdminCookie(value: string | null | undefined): boolean {
	return verifySession(value, adminSessionSecret(), Date.now());
}

/** Build a fresh signed cookie value for a successful login. */
export function freshCookieValue(): string {
	return signSession(Date.now() + SESSION_TTL_MS, adminSessionSecret());
}
