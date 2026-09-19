import { describe, it, expect } from 'vitest';
import { signSession, verifySession, decideAdminPasscode } from './adminAuth';

const SECRET = 'test-secret-1234567890';

describe('adminAuth session cookie', () => {
	it('signs and verifies a fresh session', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		expect(verifySession(value, SECRET, now)).toBe(true);
	});

	it('rejects an expired session', () => {
		const now = 1_000_000;
		const value = signSession(now - 1, SECRET);
		expect(verifySession(value, SECRET, now)).toBe(false);
	});

	it('rejects a tampered mac', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		const tampered = value.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'));
		expect(verifySession(tampered, SECRET, now)).toBe(false);
	});

	it('rejects the wrong secret', () => {
		const now = 1_000_000;
		const value = signSession(now + 10_000, SECRET);
		expect(verifySession(value, 'other-secret', now)).toBe(false);
	});

	it('rejects malformed / empty values', () => {
		const now = 1_000_000;
		expect(verifySession('', SECRET, now)).toBe(false);
		expect(verifySession('nodot', SECRET, now)).toBe(false);
		expect(verifySession(undefined, SECRET, now)).toBe(false);
		expect(verifySession(signSession(now + 1, SECRET), '', now)).toBe(false);
	});
});

describe('decideAdminPasscode', () => {
	it('accepts the exact passcode', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', 'hunter2hunter2hunter2')).toBe(true);
	});
	it('trims the provided value', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', '  hunter2hunter2hunter2  ')).toBe(true);
	});
	it('rejects a wrong passcode', () => {
		expect(decideAdminPasscode('hunter2hunter2hunter2', 'nope')).toBe(false);
	});
	it('rejects when the expected passcode is unset (admin disabled)', () => {
		expect(decideAdminPasscode('', 'anything')).toBe(false);
		expect(decideAdminPasscode('   ', 'anything')).toBe(false);
	});
	it('rejects empty input', () => {
		expect(decideAdminPasscode('secretsecretsecret', '')).toBe(false);
		expect(decideAdminPasscode('secretsecretsecret', null)).toBe(false);
	});
});
