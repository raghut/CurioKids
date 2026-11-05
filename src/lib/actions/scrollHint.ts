/**
 * For a text box that scrolls when a page is too long for the phone. A child reading alone
 * won't guess there is more, so the bottom edge fades out while more is hidden below. And
 * the box is reused from page to page, so new words start back at the top.
 */
export function scrollHint(node: HTMLElement) {
	const update = () => {
		const more = node.scrollTop + node.clientHeight < node.scrollHeight - 2;
		const mask = more ? 'linear-gradient(to bottom, black calc(100% - 3rem), transparent)' : '';
		node.style.maskImage = mask;
		node.style.webkitMaskImage = mask;
	};

	const resized = new ResizeObserver(update);
	resized.observe(node);
	const changed = new MutationObserver(() => {
		node.scrollTop = 0;
		update();
	});
	changed.observe(node, { childList: true, subtree: true, characterData: true });
	node.addEventListener('scroll', update, { passive: true });
	update();

	return {
		destroy() {
			resized.disconnect();
			changed.disconnect();
			node.removeEventListener('scroll', update);
		}
	};
}
