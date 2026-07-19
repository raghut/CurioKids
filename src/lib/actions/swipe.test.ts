import { describe, it, expect } from 'vitest';
import { resolveSwipe } from './swipe';

describe('resolveSwipe', () => {
	it('returns null when horizontal movement is below the threshold', () => {
		expect(resolveSwipe(30, 0, 50)).toBe(null);
	});

	it('returns "left" for a leftward swipe past the threshold', () => {
		expect(resolveSwipe(-80, 10, 50)).toBe('left');
	});

	it('returns "right" for a rightward swipe past the threshold', () => {
		expect(resolveSwipe(80, 10, 50)).toBe('right');
	});

	it('returns null when vertical movement dominates (a scroll, not a swipe)', () => {
		expect(resolveSwipe(-60, 90, 50)).toBe(null);
	});
});
