import { describe, it, expect } from 'vitest';
import { cacheRule } from './cacheRules';

const origin = 'https://curio.example';
const opts = { origin, shellPaths: new Set(['/_app/immutable/start.js', '/content/stories/en/index.json']) };
const get = (path: string, extra: { mode?: string; destination?: string; method?: string } = {}) =>
	cacheRule({ method: extra.method ?? 'GET', url: path.startsWith('http') ? path : origin + path, ...extra }, opts);

describe('cacheRule', () => {
	it('serves the deploy files from the shell cache', () => {
		expect(get('/_app/immutable/start.js')).toBe('shell');
		expect(get('/content/stories/en/index.json')).toBe('shell');
	});

	it('treats the kid content APIs as data, with or without a language query', () => {
		expect(get('/api/facts?language=te')).toBe('data');
		expect(get('/api/facts/fact-water-cycle?language=en')).toBe('data');
		expect(get('/api/stories?language=en')).toBe('data');
		expect(get('/api/stories/0b3c5c8e-1111-5222-8333-444455556666')).toBe('data');
		expect(get('/api/themes')).toBe('data');
	});

	it('never caches the admin dashboard, its APIs, or story generation', () => {
		expect(get('/admin', { mode: 'navigate' })).toBe('skip');
		expect(get('/admin/stories/abc/preview', { mode: 'navigate' })).toBe('skip');
		expect(get('/api/admin/facts')).toBe('skip');
		expect(get('/api/generate-story', { method: 'POST' })).toBe('skip');
		expect(get('/api/verify-code')).toBe('skip');
	});

	it('caches kid page loads, and nothing that is not a GET', () => {
		expect(get('/facts/fact-001', { mode: 'navigate' })).toBe('page');
		expect(get('/', { mode: 'navigate' })).toBe('page');
		expect(get('/api/facts', { method: 'POST' })).toBe('skip');
	});

	it('caches pictures, including Vercel Blob ones on another origin', () => {
		expect(get('https://abc.public.blob.vercel-storage.com/cover.jpg', { destination: 'image' })).toBe('image');
		expect(get('https://abc.public.blob.vercel-storage.com/cover.jpg')).toBe('skip');
		expect(get('http://insecure.example/x.png', { destination: 'image' })).toBe('skip');
	});
});
