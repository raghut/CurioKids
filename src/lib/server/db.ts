import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import type { GeneratedStory, StorySummary } from '$lib/types';

function sql() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
	return neon(env.DATABASE_URL);
}

/** Insert a fully-assembled story. The whole object is stored in the jsonb column. */
export async function insertStory(story: GeneratedStory): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO stories (id, language, title, cover_url, age_tag, story)
		VALUES (${story.id}, ${story.language}, ${story.title}, ${story.cover_image_url}, ${story.age_tag}, ${JSON.stringify(story)})
	`;
}

/** Lightweight gallery list from promoted columns only (no jsonb parse). */
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories ORDER BY created_at DESC`;
	return rows as StorySummary[];
}

/** Full story (jsonb blob) by id, or null if not found. */
export async function getStory(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id}`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}

/** Count of stories created since midnight (server time) — for the global daily cap. */
export async function countStoriesToday(): Promise<number> {
	const q = sql();
	const rows = await q`SELECT count(*)::int AS n FROM stories WHERE created_at >= date_trunc('day', now())`;
	return (rows[0]?.n as number) ?? 0;
}
