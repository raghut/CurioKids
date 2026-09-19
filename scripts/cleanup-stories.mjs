import { neon } from '@neondatabase/serverless';
import { del } from '@vercel/blob';

const url = process.env.DATABASE_URL;
const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/cleanup-stories.mjs');
	process.exit(1);
}
if (!blobToken) {
	console.error('BLOB_READ_WRITE_TOKEN not set.');
	process.exit(1);
}

const sql = neon(url);

// Pull every story so we can harvest all Blob image URLs (cover + per-page).
const rows = await sql`SELECT id, story FROM stories`;
console.log(`Found ${rows.length} stories to delete.\n`);

const blobUrls = [];
for (const r of rows) {
	const s = r.story;
	if (s?.cover_image_url) blobUrls.push(s.cover_image_url);
	for (const p of s?.pages ?? []) {
		if (p?.image_url) blobUrls.push(p.image_url);
	}
}
// Only real Vercel Blob URLs (skip "" and any non-blob values).
const toDelete = [...new Set(blobUrls.filter((u) => typeof u === 'string' && u.includes('blob.vercel-storage.com')))];
console.log(`Blob images to delete: ${toDelete.length}`);

if (toDelete.length) {
	await del(toDelete, { token: blobToken });
	console.log('✅ Blob images deleted.');
}

const result = await sql`DELETE FROM stories`;
console.log(`✅ Deleted all rows from stories table.`);

const remaining = await sql`SELECT count(*)::int AS n FROM stories`;
console.log(`\nRemaining stories: ${remaining[0].n}`);
