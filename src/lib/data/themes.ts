import type { Theme } from '$lib/types';

/**
 * The baseline theme set. Rows in the Postgres `themes` table override or extend
 * these (see src/lib/server/themes.ts), so "reset to default" is a DELETE and a
 * later deploy can still improve the baseline.
 *
 * The three archived entries are retired themes kept here on purpose: stories
 * generated under them store their id, so keeping the definition means an old
 * story's label still resolves offline with no DB round-trip and no migration.
 */
export const themes: Theme[] = [
	{
		id: 'sharing',
		label_en: 'Sharing',
		label_te: 'పంచుకోవడం',
		goal_hint: 'sharing something precious with others',
		sort_order: 10,
		archived: false
	},
	{
		id: 'friendship',
		label_en: 'Friendship',
		label_te: 'స్నేహం',
		goal_hint: 'making or keeping a friend',
		sort_order: 20,
		archived: false
	},
	{
		id: 'be_brave',
		label_en: 'Brave',
		label_te: 'ధైర్యంగా ఉండు',
		goal_hint: 'facing something scary',
		sort_order: 30,
		archived: false
	},
	{
		id: 'good_habits',
		label_en: 'Good Habits',
		label_te: 'మంచి అలవాట్లు',
		goal_hint: 'learning a good everyday habit',
		sort_order: 40,
		archived: false
	},
	// --- Retired 2026-10-17. Kept so existing stories still resolve a label. ---
	{
		id: 'help_friend',
		label_en: 'Help a Friend',
		label_te: 'స్నేహితుడికి సహాయం',
		goal_hint: 'helping someone in trouble',
		sort_order: 900,
		archived: true
	},
	{
		id: 'find_lost',
		label_en: 'Find the Lost',
		label_te: 'పోయినది కనుగొను',
		goal_hint: 'searching for something missing',
		sort_order: 910,
		archived: true
	},
	{
		id: 'learn_new',
		label_en: 'Learn Something New',
		label_te: 'కొత్తది నేర్చుకో',
		goal_hint: 'discovering something new about the world',
		sort_order: 920,
		archived: true
	}
];

/** The bundled active list — used as the offline/fetch-failure fallback on the client. */
export const seedActiveThemes: Theme[] = themes.filter((t) => !t.archived);
