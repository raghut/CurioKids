import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';
import type { GeneratedStory, StorySummary, AdminStorySummary, AgeBand, PromptKind, PromptOverride } from '$lib/types';

function sql() {
	if (!env.DATABASE_URL) throw new Error('DATABASE_URL not configured');
	return neon(env.DATABASE_URL);
}

/** Insert a fully-assembled story. The whole object is stored in the jsonb column. */
export async function insertStory(story: GeneratedStory): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO stories (id, language, title, cover_url, age_tag, status, story)
		VALUES (${story.id}, ${story.language}, ${story.title}, ${story.cover_image_url}, ${story.age_tag}, ${story.status}, ${JSON.stringify(story)})
	`;
}

/** Lightweight gallery list (published only) from promoted columns. */
export async function listStories(language?: string): Promise<StorySummary[]> {
	const q = sql();
	const rows = language
		? await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' AND language = ${language} ORDER BY created_at DESC`
		: await q`SELECT id, title, cover_url, age_tag, language, created_at FROM stories WHERE status = 'published' ORDER BY created_at DESC`;
	return rows as StorySummary[];
}

/** Full published story by id, or null. Drafts are treated as not-found for kids. */
export async function getStory(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id} AND status = 'published'`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}

/** Count of stories created since midnight (server time) — for the global daily cap. */
export async function countStoriesToday(): Promise<number> {
	const q = sql();
	const rows = await q`SELECT count(*)::int AS n FROM stories WHERE created_at >= date_trunc('day', now())`;
	return (rows[0]?.n as number) ?? 0;
}

/** All stories (any status) with the fields the admin list needs. */
export async function listStoriesAdmin(): Promise<AdminStorySummary[]> {
	const q = sql();
	const rows = await q`
		SELECT id, title, cover_url, age_tag, language, created_at, status,
		       story->>'character_id' AS character_id,
		       story->>'theme_id' AS theme_id
		FROM stories
		ORDER BY created_at DESC
	`;
	return rows as AdminStorySummary[];
}

/** Full story (any status) for admin preview, or null. */
export async function getStoryAdmin(id: string): Promise<GeneratedStory | null> {
	const q = sql();
	const rows = await q`SELECT story FROM stories WHERE id = ${id}`;
	return rows.length ? (rows[0].story as GeneratedStory) : null;
}

/** Publish/unpublish: update the promoted column and mirror into the jsonb blob. */
export async function setStoryStatus(id: string, status: 'draft' | 'published'): Promise<void> {
	const q = sql();
	await q`
		UPDATE stories
		SET status = ${status},
		    story = jsonb_set(story, '{status}', to_jsonb(${status}::text))
		WHERE id = ${id}
	`;
}

/** Hard-delete a story row (Blob deletion is handled by the caller). */
export async function deleteStory(id: string): Promise<void> {
	const q = sql();
	await q`DELETE FROM stories WHERE id = ${id}`;
}

// --- Prompt templates ------------------------------------------------------------
// Only OVERRIDES are stored. A band/kind with no row uses the code default in
// promptTemplates.ts, which is why resetting a template is a plain DELETE.

/** Every saved override. Callers layer these over the defaults via resolveTemplates. */
export async function listPromptOverrides(): Promise<PromptOverride[]> {
	const q = sql();
	const rows = await q`SELECT age_band, kind, body, updated_at FROM prompt_templates`;
	return rows as PromptOverride[];
}

/** Overrides for one band, shaped for resolveTemplates. */
export async function getPromptOverrides(
	band: AgeBand
): Promise<Partial<Record<PromptKind, string>>> {
	const q = sql();
	const rows = await q`SELECT kind, body FROM prompt_templates WHERE age_band = ${band}`;
	const out: Partial<Record<PromptKind, string>> = {};
	for (const r of rows as Array<{ kind: PromptKind; body: string }>) out[r.kind] = r.body;
	return out;
}

/** Save (or replace) one override. */
export async function upsertPromptTemplate(
	band: AgeBand,
	kind: PromptKind,
	body: string
): Promise<void> {
	const q = sql();
	await q`
		INSERT INTO prompt_templates (age_band, kind, body, updated_at)
		VALUES (${band}, ${kind}, ${body}, now())
		ON CONFLICT (age_band, kind) DO UPDATE SET body = ${body}, updated_at = now()
	`;
}

/** Reset one template back to the code default by removing its override. */
export async function deletePromptTemplate(band: AgeBand, kind: PromptKind): Promise<void> {
	const q = sql();
	await q`DELETE FROM prompt_templates WHERE age_band = ${band} AND kind = ${kind}`;
}
