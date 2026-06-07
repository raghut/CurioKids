import { writable } from 'svelte/store';
import type { Language } from '$lib/types';

function createLanguageStore() {
	const stored =
		typeof window !== 'undefined' ? (localStorage.getItem('curiokids_language') as Language | null) : null;
	const { subscribe, set } = writable<Language | null>(stored);

	return {
		subscribe,
		set(value: Language) {
			if (typeof window !== 'undefined') {
				localStorage.setItem('curiokids_language', value);
			}
			set(value);
		},
		reset() {
			if (typeof window !== 'undefined') {
				localStorage.removeItem('curiokids_language');
			}
			set(null);
		}
	};
}

export const language = createLanguageStore();
