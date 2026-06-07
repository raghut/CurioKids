import { writable } from 'svelte/store';
import type { GeneratedStory } from '$lib/types';

type StoreState = {
	stories: GeneratedStory[];
	generationsToday: number;
	generationDate: string;
};

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function createGeneratedStoriesStore() {
	const initial: StoreState =
		typeof window !== 'undefined'
			? JSON.parse(
					localStorage.getItem('curiokids_generated') ||
						'{"stories":[],"generationsToday":0,"generationDate":""}'
				)
			: { stories: [], generationsToday: 0, generationDate: '' };

	// Reset daily count if date changed
	if (initial.generationDate !== todayStr()) {
		initial.generationsToday = 0;
		initial.generationDate = todayStr();
	}

	const { subscribe, update } = writable<StoreState>(initial);

	function save(state: StoreState) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('curiokids_generated', JSON.stringify(state));
		}
	}

	return {
		subscribe,
		addStory(story: GeneratedStory) {
			update((state) => {
				const next = {
					stories: [story, ...state.stories],
					generationsToday: state.generationsToday + 1,
					generationDate: todayStr()
				};
				save(next);
				return next;
			});
		},
		canGenerate(state: StoreState): boolean {
			if (state.generationDate !== todayStr()) return true;
			return state.generationsToday < 3;
		}
	};
}

export const generatedStories = createGeneratedStoriesStore();
