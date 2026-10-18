import { put, del } from '@vercel/blob';
import { env } from '$env/dynamic/private';

/**
 * Upload JPEG bytes to Vercel Blob and return the public URL.
 * `key` is a human-readable prefix (e.g. "story-<id>-cover"); a random suffix
 * is added to avoid collisions. `folder` separates content types in the bucket.
 */
export async function uploadImage(bytes: Buffer, key: string, folder = 'stories'): Promise<string> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const { url } = await put(`${folder}/${key}.jpg`, bytes, {
		access: 'public',
		contentType: 'image/jpeg',
		token: env.BLOB_READ_WRITE_TOKEN,
		addRandomSuffix: true
	});
	return url;
}

/**
 * Delete images from Vercel Blob by URL. Ignores empty strings and non-Blob
 * URLs. A failed delete is logged but never throws (best-effort cleanup).
 */
export async function deleteImages(urls: Array<string | null | undefined>): Promise<void> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const targets = [...new Set(urls.filter((u): u is string => !!u && u.includes('blob.vercel-storage.com')))];
	if (!targets.length) return;
	try {
		await del(targets, { token: env.BLOB_READ_WRITE_TOKEN });
	} catch (e) {
		console.error('blob delete failed:', e instanceof Error ? e.message : 'unknown');
	}
}
