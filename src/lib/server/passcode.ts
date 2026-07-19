import { env } from '$env/dynamic/private';
import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Shared family passcode gate for story creation. This is NOT authentication:
 * there are no accounts, no user identity, no database of codes — just one
 * shared secret (CREATE_PASSCODE), like a door code, that must be present to
 * spend money on generation. The browser side is UX only; this server check is
 * the real cost guard.
 *
 * Open-when-unset: if CREATE_PASSCODE is empty/unset the gate is disabled and
 * creation is open (keeps local dev frictionless). Set CREATE_PASSCODE in the
 * deployment env to turn protection on.
 */

/** Constant-time string equality via sha256 (no length or timing leak). */
export function constantTimeEqual(a: string, b: string): boolean {
	const ha = createHash('sha256').update(a).digest();
	const hb = createHash('sha256').update(b).digest();
	return timingSafeEqual(ha, hb);
}

/**
 * Pure decision: given the configured secret and the provided code, is creation
 * allowed? Empty/whitespace secret means the gate is disabled (open).
 */
export function decidePasscode(secret: string, provided: string | null | undefined): boolean {
	const s = (secret ?? '').trim();
	if (!s) return true; // gate disabled → open
	if (!provided || !provided.trim()) return false;
	return constantTimeEqual(provided.trim(), s);
}

/** Whether a non-empty CREATE_PASSCODE is configured (gate active). */
export function isGateEnabled(): boolean {
	return (env.CREATE_PASSCODE ?? '').trim().length > 0;
}

/** Check a client-provided code against the configured CREATE_PASSCODE. */
export function checkPasscode(provided: string | null | undefined): boolean {
	return decidePasscode(env.CREATE_PASSCODE ?? '', provided);
}
