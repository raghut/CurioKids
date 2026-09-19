import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/add-status-column.mjs');
	process.exit(1);
}

const sql = neon(url);

await sql`ALTER TABLE stories ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft'`;
await sql`CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status)`;

const rows = await sql`SELECT status, count(*)::int AS n FROM stories GROUP BY status`;
console.log('✅ status column ready. Current counts:', rows.length ? rows : '(no rows)');
