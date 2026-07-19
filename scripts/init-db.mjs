import { neon } from '@neondatabase/serverless';

const url = process.env.DATABASE_URL;
if (!url) {
	console.error('DATABASE_URL not set. Run with: node --env-file=.env scripts/init-db.mjs');
	process.exit(1);
}

const sql = neon(url);

await sql`
	CREATE TABLE IF NOT EXISTS stories (
		id uuid PRIMARY KEY,
		created_at timestamptz NOT NULL DEFAULT now(),
		language text NOT NULL,
		title text NOT NULL,
		cover_url text NOT NULL DEFAULT '',
		age_tag text NOT NULL DEFAULT '5-8',
		story jsonb NOT NULL
	)
`;
await sql`CREATE INDEX IF NOT EXISTS stories_lang_created_idx ON stories (language, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS stories_age_idx ON stories (age_tag)`;

console.log('✅ stories table ready');
