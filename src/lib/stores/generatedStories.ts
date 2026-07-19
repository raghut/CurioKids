import { writable } from 'svelte/store';
import { env as publicEnv } from '$env/dynamic/public';
import type { GeneratedStory, Language, StorySummary } from '$lib/types';

/**
 * Per-device daily generation limit (client-side, UX only). Defaults to 20 to
 * match the server-side global DAILY_GENERATION_CAP. Override with the public
 * env var PUBLIC_MAX_STORIES_PER_DAY. The real cost guard is server-side.
 */
const MAX_STORIES_PER_DAY = Number(publicEnv.PUBLIC_MAX_STORIES_PER_DAY ?? 20);

/** Client-side daily generation count (UX only; the real cost guard is server-side). */
type RateState = { generationsToday: number; generationDate: string };

function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}

function createGeneratedStoriesStore() {
	const initial: RateState =
		typeof window !== 'undefined'
			? JSON.parse(localStorage.getItem('curiokids_gen_rate') || '{"generationsToday":0,"generationDate":""}')
			: { generationsToday: 0, generationDate: '' };

	if (initial.generationDate !== todayStr()) {
		initial.generationsToday = 0;
		initial.generationDate = todayStr();
	}

	const { subscribe, update } = writable<RateState>(initial);

	function saveRate(state: RateState) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('curiokids_gen_rate', JSON.stringify(state));
		}
	}

	return {
		subscribe,
		/** Fetch the shared gallery list for a language. */
		async loadGallery(language: Language): Promise<StorySummary[]> {
			const res = await fetch(`/api/stories?language=${language}`);
			if (!res.ok) throw new Error('gallery load failed');
			const data = (await res.json()) as { stories: StorySummary[] };
			return data.stories;
		},
		/** Fetch one full story by id (null if not found). */
		async getStory(id: string): Promise<GeneratedStory | null> {
			const res = await fetch(`/api/stories/${id}`);
			if (res.status === 404) return null;
			if (!res.ok) throw new Error('story load failed');
			const data = (await res.json()) as { story: GeneratedStory };
			return data.story;
		},
		/** Record one successful generation for the client-side daily UX counter. */
		recordGeneration() {
			update((state) => {
				const next =
					state.generationDate === todayStr()
						? { generationsToday: state.generationsToday + 1, generationDate: todayStr() }
						: { generationsToday: 1, generationDate: todayStr() };
				saveRate(next);
				return next;
			});
		},
		/** Client-side per-device daily limit check for instant UX. */
		canGenerate(state: RateState): boolean {
			if (state.generationDate !== todayStr()) return true;
			return state.generationsToday < MAX_STORIES_PER_DAY;
		}
	};
}

export const generatedStories = createGeneratedStoriesStore();
