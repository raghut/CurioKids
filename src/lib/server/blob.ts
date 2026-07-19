import { put } from '@vercel/blob';
import { env } from '$env/dynamic/private';

/**
 * Upload JPEG bytes to Vercel Blob and return the public URL.
 * `key` is a human-readable prefix (e.g. "story-<id>-cover"); a random suffix
 * is added to avoid collisions.
 */
export async function uploadImage(bytes: Buffer, key: string): Promise<string> {
	if (!env.BLOB_READ_WRITE_TOKEN) throw new Error('BLOB_READ_WRITE_TOKEN not configured');
	const { url } = await put(`stories/${key}.jpg`, bytes, {
		access: 'public',
		contentType: 'image/jpeg',
		token: env.BLOB_READ_WRITE_TOKEN,
		addRandomSuffix: true
	});
	return url;
}
