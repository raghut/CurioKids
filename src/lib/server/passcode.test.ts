import { describe, it, expect } from 'vitest';
import { decidePasscode, constantTimeEqual } from './passcode';

describe('constantTimeEqual', () => {
	it('is true for identical strings', () => {
		expect(constantTimeEqual('mishti42', 'mishti42')).toBe(true);
	});
	it('is false for different strings of the same length', () => {
		expect(constantTimeEqual('abcd', 'abce')).toBe(false);
	});
	it('is false for different-length strings (no crash)', () => {
		expect(constantTimeEqual('short', 'a-much-longer-code')).toBe(false);
	});
});

describe('decidePasscode', () => {
	it('is OPEN when no secret is configured (gate disabled)', () => {
		expect(decidePasscode('', 'anything')).toBe(true);
		expect(decidePasscode('   ', null)).toBe(true);
	});
	it('rejects a missing code when the gate is enabled', () => {
		expect(decidePasscode('mishti42', null)).toBe(false);
		expect(decidePasscode('mishti42', '')).toBe(false);
		expect(decidePasscode('mishti42', '   ')).toBe(false);
	});
	it('accepts the correct code', () => {
		expect(decidePasscode('mishti42', 'mishti42')).toBe(true);
	});
	it('trims surrounding whitespace on both sides before comparing', () => {
		expect(decidePasscode('  mishti42  ', '  mishti42  ')).toBe(true);
	});
	it('rejects a wrong code', () => {
		expect(decidePasscode('mishti42', 'guess')).toBe(false);
	});
});
