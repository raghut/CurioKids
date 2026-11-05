import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { parseStoryImport, uuidFromName } from '$lib/server/storyImport';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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

		// A file's readable id ("story-carrot-share-en") becomes a stable uuid, because
		// stories.id is a uuid column. Random ids are already uuids.
		for (const s of r.stories) {
			if (!UUID.test(s.id)) s.id = await uuidFromName(s.id);
		}

		// Refuse rather than overwrite, and refuse the whole file if any language clashes,
		// so a re-import never leaves English replaced and Telugu stale.
		const clash = await existingStoryIds(r.stories.map((s) => s.id));
		if (clash.length) {
			return json(
				{ error: 'conflict', message: 'This story was already imported. Delete it first to import it again.' },
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
