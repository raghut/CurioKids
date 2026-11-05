import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseStoryImport } from '$lib/server/storyImport';
import { existingStoryIds, insertStory } from '$lib/server/db';
import { resolveThemes } from '$lib/server/themes';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// No OpenAI call and no Blob upload: the story arrives fully written, and its pictures
// are an animated scene (code in the repo).

/** A story in two languages is a few kilobytes; anything far larger is a mistake. */
const MAX_BYTES = 200_000;

export const POST: RequestHandler = async ({ request }) => {
	const raw = await request.text();
	if (!raw.trim()) {
		return json({ error: 'invalid_input', message: 'Paste the story JSON first.' }, { status: 400 });
	}
	if (raw.length > MAX_BYTES) {
		return json({ error: 'invalid_input', message: 'That is far too long for one story.' }, { status: 400 });
	}

	try {
		const r = parseStoryImport(raw, {
			themes: await resolveThemes(),
			newId: () => crypto.randomUUID(),
			now: () => new Date().toISOString()
		});
		if (!r.ok) return json({ error: 'invalid_input', message: r.message }, { status: 400 });

		// Refuse rather than overwrite, and refuse the whole file if any language clashes,
		// so a re-import never leaves English replaced and Telugu stale.
		const clash = await existingStoryIds(r.stories.map((s) => s.id));
		if (clash.length) {
			return json(
				{ error: 'conflict', message: `A story with the id "${clash[0]}" already exists.` },
				{ status: 409 }
			);
		}
		for (const s of r.stories) await insertStory(s);
		return json({ stories: r.stories.map((s) => ({ id: s.id, language: s.language, title: s.title })) });
	} catch (err) {
		console.error('story import failed:', err instanceof Error ? err.message : 'unknown');
		return json({ error: 'server_error', message: 'Could not save the story. Try again.' }, { status: 500 });
	}
};
