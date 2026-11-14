import type { Language } from '$lib/types';

/**
 * Save every published item for offline reading. A list page calls this after it loads:
 * each item (and its pictures) is fetched quietly in the background, and the service
 * worker keeps the responses. Fetching is all it takes — the service worker does the
 * saving, so nothing here touches storage.
 */

const warmed = new Set<string>();
const PARALLEL = 3;

/** True once a service worker controls the page, so fetches are actually saved. */
async function swReady(): Promise<boolean> {
	if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !navigator.onLine) return false;
	await navigator.serviceWorker.ready;
	if (navigator.serviceWorker.controller) return true;
	// First visit: the worker claims the page right after it installs.
	return new Promise((resolve) => {
		const t = setTimeout(() => resolve(false), 5000);
		navigator.serviceWorker.addEventListener(
			'controllerchange',
			() => {
				clearTimeout(t);
				resolve(true);
			},
			{ once: true }
		);
	});
}

function pictures(value: unknown, out: Set<string>) {
	if (typeof value === 'string') {
		if (/^https:\/\//.test(value) && /\.(png|jpe?g|webp|gif)(\?|$)/i.test(value)) out.add(value);
	} else if (Array.isArray(value)) value.forEach((v) => pictures(v, out));
	else if (value && typeof value === 'object') Object.values(value).forEach((v) => pictures(v, out));
}

async function warm(key: string, listUrl: string, itemUrls: string[]) {
	if (warmed.has(key)) return;
	warmed.add(key);
	if (!(await swReady())) {
		warmed.delete(key);
		return;
	}
	// On the very first visit the list itself loaded before the worker took over.
	const queue = [listUrl, ...itemUrls];
	const work = async () => {
		for (let url = queue.shift(); url; url = queue.shift()) {
			try {
				const res = await fetch(url);
				if (!res.ok || url === listUrl) continue;
				const found = new Set<string>();
				pictures(await res.json(), found);
				for (const src of found) new Image().src = src;
			} catch {
				// Offline mid-way or one bad item: the rest still get saved.
			}
		}
	};
	await Promise.all(Array.from({ length: PARALLEL }, work));
}

export function warmFacts(ids: string[], language: Language) {
	void warm(
		`facts:${language}`,
		`/api/facts?language=${language}`,
		ids.map((id) => `/api/facts/${encodeURIComponent(id)}?language=${language}`)
	);
}

export function warmStories(ids: string[], language: Language) {
	void warm(
		`stories:${language}`,
		`/api/stories?language=${language}`,
		ids.map((id) => `/api/stories/${encodeURIComponent(id)}`)
	);
}
