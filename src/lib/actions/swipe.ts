export type SwipeDirection = 'left' | 'right' | null;

/**
 * Pure decision: given the horizontal (dx) and vertical (dy) deltas of a drag,
 * return 'left', 'right', or null. A horizontal swipe must exceed `threshold`
 * pixels AND dominate the vertical movement (so vertical scrolls are ignored).
 */
export function resolveSwipe(dx: number, dy: number, threshold = 50): SwipeDirection {
	if (Math.abs(dx) < threshold) return null;
	if (Math.abs(dx) <= Math.abs(dy)) return null;
	return dx < 0 ? 'left' : 'right';
}

export type SwipeOptions = {
	onLeft?: () => void;
	onRight?: () => void;
	threshold?: number;
};

/** Svelte action: fires onLeft/onRight on a horizontal touch or pointer swipe. */
export function swipe(node: HTMLElement, options: SwipeOptions = {}) {
	let opts = options;
	let startX = 0;
	let startY = 0;
	let tracking = false;

	function down(e: PointerEvent) {
		tracking = true;
		startX = e.clientX;
		startY = e.clientY;
	}

	function up(e: PointerEvent) {
		if (!tracking) return;
		tracking = false;
		const dir = resolveSwipe(e.clientX - startX, e.clientY - startY, opts.threshold ?? 50);
		if (dir === 'left') opts.onLeft?.();
		else if (dir === 'right') opts.onRight?.();
	}

	node.addEventListener('pointerdown', down);
	node.addEventListener('pointerup', up);

	return {
		update(newOptions: SwipeOptions) {
			opts = newOptions;
		},
		destroy() {
			node.removeEventListener('pointerdown', down);
			node.removeEventListener('pointerup', up);
		}
	};
}
