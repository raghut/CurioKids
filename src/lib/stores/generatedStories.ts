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

	/**
	 * Persist to localStorage. Generated covers are large base64 images, so we
	 * can hit the ~5MB quota. If saving fails, drop the oldest stories one at a
	 * time (keeping the newest, which the user just made) until it fits.
	 * Returns the state that was actually saved.
	 */
	function save(state: StoreState): StoreState {
		if (typeof window === 'undefined') return state;

		let toSave = state;
		while (true) {
			try {
				localStorage.setItem('curiokids_generated', JSON.stringify(toSave));
				return toSave;
			} catch {
				if (toSave.stories.length <= 1) {
					// Can't even fit one story — give up on persisting, keep in memory.
					return toSave;
				}
				toSave = { ...toSave, stories: toSave.stories.slice(0, -1) };
			}
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
				// Persist (may evict oldest to fit quota) and keep the in-memory
				// store consistent with what was actually saved.
				return save(next);
			});
		},
		canGenerate(state: StoreState): boolean {
			if (state.generationDate !== todayStr()) return true;
			return state.generationsToday < 3;
		}
	};
}

export const generatedStories = createGeneratedStoriesStore();
