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
		status text NOT NULL DEFAULT 'draft',
		story jsonb NOT NULL
	)
`;
await sql`CREATE INDEX IF NOT EXISTS stories_lang_created_idx ON stories (language, created_at DESC)`;
await sql`CREATE INDEX IF NOT EXISTS stories_age_idx ON stories (age_tag)`;
await sql`CREATE INDEX IF NOT EXISTS stories_status_idx ON stories (status)`;

await sql`
	CREATE TABLE IF NOT EXISTS prompt_templates (
		age_band   text NOT NULL,
		kind       text NOT NULL,
		body       text NOT NULL,
		updated_at timestamptz NOT NULL DEFAULT now(),
		PRIMARY KEY (age_band, kind)
	)
`;

await sql`
	CREATE TABLE IF NOT EXISTS themes (
		id          text PRIMARY KEY,
		label_en    text NOT NULL,
		label_te    text NOT NULL,
		goal_hint   text NOT NULL,
		sort_order  int  NOT NULL DEFAULT 100,
		archived    boolean NOT NULL DEFAULT false,
		updated_at  timestamptz NOT NULL DEFAULT now()
	)
`;

console.log('✅ stories + prompt_templates + themes tables ready');
