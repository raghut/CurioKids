/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { build, files, version } from '$service-worker';
import { cacheRule } from '$lib/offline/cacheRules';

/**
 * Offline support. The app's files are saved per deploy; facts, stories and pictures are
 * saved as they are fetched (the list pages also fetch every item in the background, see
 * warmCache.ts), so a child can keep reading without wifi.
 *
 * Uses the Cache Storage API, not localStorage, so the localStorage rule in CLAUDE.md
 * (language + generation count only) is untouched.
 */
const sw = self as unknown as ServiceWorkerGlobalScope;

// Pages reference this deploy's hashed JS, so they live and die with the shell cache.
const SHELL = `shell-${version}`;
// Content and pictures outlive deploys: a new deploy must not wipe what a child saved.
const DATA = 'data-v1';
const IMAGES = 'images-v1';

const SHELL_FILES = [...build, ...files];
const shellPaths = new Set(SHELL_FILES);
const START_PAGES = ['/', '/facts', '/stories'];
/**
 * The fact and story viewers are client-rendered (ssr = false), so their HTML is the same
 * boot shell for every id. One saved copy, under an id that never exists, opens any of
 * them offline, including ones the child only ever reached by tapping inside the app.
 */
const VIEWER_SHELL = '/facts/_offline';
/** Online but slow: show the saved copy rather than keep a child waiting. */
const NETWORK_TIMEOUT_MS = 4000;

sw.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			const cache = await caches.open(SHELL);
			await cache.addAll(SHELL_FILES);
			// Best effort: a page that fails to load must not stop the install.
			await Promise.allSettled([...START_PAGES, VIEWER_SHELL].map((p) => cache.add(p)));
			await sw.skipWaiting();
		})()
	);
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			const keep = new Set([SHELL, DATA, IMAGES]);
			for (const key of await caches.keys()) if (!keep.has(key)) await caches.delete(key);
			await sw.clients.claim();
		})()
	);
});

sw.addEventListener('fetch', (event) => {
	const rule = cacheRule(event.request, { origin: sw.location.origin, shellPaths });
	if (rule === 'shell') event.respondWith(cacheFirst(event.request, SHELL));
	else if (rule === 'image') event.respondWith(cacheFirst(event.request, IMAGES));
	else if (rule === 'data') event.respondWith(networkFirst(event.request, DATA));
	else if (rule === 'page') event.respondWith(page(event.request));
});

async function cacheFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const hit = await cache.match(req);
	if (hit) return hit;
	const res = await fetch(req);
	// Cross-origin pictures come back opaque (status 0); they still display, so keep them.
	if (res.ok || res.type === 'opaque') await cache.put(req, res.clone());
	return res;
}

/**
 * Fresh from the network when it answers in time; otherwise the saved copy. A 404 is a
 * real answer (the story was deleted) and is passed on; a server error falls back.
 */
async function networkFirst(req: Request, cacheName: string): Promise<Response> {
	const cache = await caches.open(cacheName);
	const network = fetch(req).then(async (res) => {
		if (res.ok) await cache.put(req, res.clone());
		return res;
	});
	const saved = await cache.match(req);
	if (!saved) return network;
	const fallback = saved.clone();
	const timeout = new Promise<Response>((resolve) => setTimeout(() => resolve(saved), NETWORK_TIMEOUT_MS));
	return Promise.race([
		network.then((res) => (res.ok || res.status === 404 ? res : fallback)).catch(() => fallback),
		timeout
	]);
}

/** A page opened from scratch: fresh if possible, else the saved page, else home. */
async function page(req: Request): Promise<Response> {
	const cache = await caches.open(SHELL);
	try {
		const res = await fetch(req);
		if (res.ok) await cache.put(req, res.clone());
		return res;
	} catch {
		const path = new URL(req.url).pathname;
		const viewer = /^\/(facts|stories)\/[^/]+$/.test(path) ? await cache.match(VIEWER_SHELL) : undefined;
		return (
			(await cache.match(req, { ignoreSearch: true })) ??
			viewer ??
			(await cache.match('/')) ??
			new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } })
		);
	}
}
