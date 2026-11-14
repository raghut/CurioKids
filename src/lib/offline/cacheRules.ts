/**
 * Which caching rule the service worker applies to a request. Pure, so it is unit-tested
 * without a browser; service-worker.ts does the actual caching.
 *
 * - shell: the app's own files for this deploy (JS, CSS, fonts, bundled curated stories).
 *   Cache first: they never change within a deploy.
 * - data:  the kid-facing content APIs. Network first, so a newly published fact shows up
 *   at once when online; the saved copy when offline or the network is too slow.
 * - page:  a kid page being opened (a full load, e.g. from the home-screen icon).
 *   Network first, falling back to the saved page.
 * - image: pictures (Vercel Blob covers, page images). Cache first: a Blob URL never
 *   changes, so a saved copy is always right.
 * - skip:  everything else, above all the admin dashboard, which must never be served
 *   from a stale copy.
 */
export type CacheRule = 'shell' | 'data' | 'page' | 'image' | 'skip';

const DATA_PATHS = [/^\/api\/facts(\/[^/]+)?$/, /^\/api\/stories(\/[^/]+)?$/, /^\/api\/themes$/];

export function cacheRule(
	req: { method: string; url: string; mode?: string; destination?: string },
	opts: { origin: string; shellPaths: ReadonlySet<string> }
): CacheRule {
	if (req.method !== 'GET') return 'skip';
	const url = new URL(req.url);
	const sameOrigin = url.origin === opts.origin;

	if (sameOrigin) {
		if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/admin')) return 'skip';
		if (opts.shellPaths.has(url.pathname)) return 'shell';
		if (DATA_PATHS.some((re) => re.test(url.pathname))) return 'data';
		if (url.pathname.startsWith('/api/')) return 'skip';
		if (req.mode === 'navigate') return 'page';
	}

	if (req.destination === 'image' && (url.protocol === 'https:' || sameOrigin)) return 'image';
	return 'skip';
}
