import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { themes as defaults } from '$lib/data/themes';
import { resolveThemes } from '$lib/server/themes';
import {
	validateThemeInput,
	decideDelete,
	SOFT_ACTIVE_LIMIT,
	GOAL_HINT_MAX
} from '$lib/server/themeRules';
import {
	listThemeRows,
	upsertThemeRow,
	deleteThemeRow,
	countStoriesUsingTheme
} from '$lib/server/db';

const defaultIds = new Set(defaults.map((d) => d.id));

export const load: PageServerLoad = async () => {
	const all = await resolveThemes();

	// Which themes have a saved row — i.e. which can be "reset".
	let rowIds = new Set<string>();
	let loadError = false;
	try {
		rowIds = new Set((await listThemeRows()).map((r) => r.id));
	} catch (err) {
		console.error('theme rows load failed:', err instanceof Error ? err.message : 'unknown');
		loadError = true;
	}

	const rows = await Promise.all(
		all.map(async (t) => ({
			...t,
			hasDefault: defaultIds.has(t.id),
			isEdited: rowIds.has(t.id),
			storyCount: await countStoriesUsingTheme(t.id).catch(() => 0)
		}))
	);

	return {
		rows,
		loadError,
		activeCount: all.filter((t) => !t.archived).length,
		softLimit: SOFT_ACTIVE_LIMIT,
		goalHintMax: GOAL_HINT_MAX
	};
};

/** Every known id, for collision checks — defaults, rows and archived alike. */
async function knownIds(): Promise<string[]> {
	return (await resolveThemes()).map((t) => t.id);
}

export const actions: Actions = {
	// Edit an existing theme. Its own id is excluded from the collision set.
	save: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const colliding = (await knownIds()).filter((k) => k !== id);

		const check = validateThemeInput(
			{
				id,
				label_en: form.get('label_en'),
				label_te: form.get('label_te'),
				goal_hint: form.get('goal_hint'),
				sort_order: form.get('sort_order'),
				archived: form.get('archived') === 'on'
			},
			colliding
		);
		if (!check.ok) return fail(400, { error: check.message, id });

		// The id is immutable: keep whatever was submitted as the row key, never the
		// re-slugged label, or renaming a theme would orphan its stories.
		if (check.theme.id !== id) return fail(400, { error: 'A theme id cannot change.', id });

		try {
			await upsertThemeRow(check.theme);
		} catch (err) {
			console.error('theme save failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save. Has npm run db:init been run?', id });
		}
		return { saved: id };
	},

	// Add a brand-new theme. Collides against every known id, archived included.
	create: async ({ request }) => {
		const form = await request.formData();
		const labelEn = String(form.get('label_en') ?? '');
		// Blank id field -> slug it from the English label.
		const rawId = String(form.get('id') ?? '').trim() || labelEn;

		const check = validateThemeInput(
			{
				id: rawId,
				label_en: labelEn,
				label_te: form.get('label_te'),
				goal_hint: form.get('goal_hint'),
				sort_order: form.get('sort_order') || '100',
				archived: false
			},
			await knownIds()
		);
		if (!check.ok) return fail(400, { error: check.message, creating: true });

		try {
			await upsertThemeRow(check.theme);
		} catch (err) {
			console.error('theme create failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save. Has npm run db:init been run?', creating: true });
		}
		return { created: check.theme.id };
	},

	// Archive / unarchive. Writes a row even for a code default — that row IS the
	// archive flag, and "reset" removes it again.
	archive: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');
		const archived = form.get('archived') === 'true';

		const current = (await resolveThemes()).find((t) => t.id === id);
		if (!current) return fail(400, { error: 'Unknown theme.', id });

		try {
			await upsertThemeRow({ ...current, archived });
		} catch (err) {
			console.error('theme archive failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save.', id });
		}
		return { saved: id };
	},

	// Reset a code default, or hard-delete an admin-added theme nothing references.
	remove: async ({ request }) => {
		const form = await request.formData();
		const id = String(form.get('id') ?? '');

		let count = 0;
		try {
			count = await countStoriesUsingTheme(id);
		} catch (err) {
			console.error('theme story count failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not check which stories use this theme.', id });
		}

		const decision = decideDelete(defaultIds.has(id), count);
		if (decision === 'refuse') {
			return fail(409, {
				error: `${count} ${count === 1 ? 'story uses' : 'stories use'} this theme, so it cannot be deleted. Archive it instead.`,
				id
			});
		}

		try {
			await deleteThemeRow(id);
		} catch (err) {
			console.error('theme delete failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not delete.', id });
		}
		return decision === 'reset' ? { reset: id } : { deleted: id };
	}
};
