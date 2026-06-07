import type { Theme } from '$lib/types';

export const themes: Theme[] = [
	{
		id: 'be_brave',
		label_en: 'Be Brave',
		label_te: 'ధైర్యంగా ఉండు',
		goal_hint: 'facing something scary'
	},
	{
		id: 'help_friend',
		label_en: 'Help a Friend',
		label_te: 'స్నేహితుడికి సహాయం',
		goal_hint: 'helping someone in trouble'
	},
	{
		id: 'find_lost',
		label_en: 'Find the Lost',
		label_te: 'పోయినది కనుగొను',
		goal_hint: 'searching for something missing'
	},
	{
		id: 'learn_new',
		label_en: 'Learn Something New',
		label_te: 'కొత్తది నేర్చుకో',
		goal_hint: 'discovering something new about the world'
	}
];
