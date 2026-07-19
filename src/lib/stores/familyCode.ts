import { writable } from 'svelte/store';

/**
 * The family passcode saved on THIS device (UX only). Persisted to localStorage
 * so the child unlocks once and is never asked again. This is not auth — the
 * real gate is server-side in /api/generate-story. The value rides along as the
 * `x-create-code` header on generation requests.
 */
const KEY = 'curiokids_family_code';

function createFamilyCodeStore() {
	const stored = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
	const { subscribe, set } = writable<string | null>(stored);

	return {
		subscribe,
		/** Save an unlocked code for this device. */
		set(value: string) {
			if (typeof window !== 'undefined') localStorage.setItem(KEY, value);
			set(value);
		},
		/** Forget the code (e.g. after the server rejects it as stale). */
		clear() {
			if (typeof window !== 'undefined') localStorage.removeItem(KEY);
			set(null);
		},
		/** Read the current code synchronously (for building request headers). */
		get(): string | null {
			return typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
		}
	};
}

export const familyCode = createFamilyCodeStore();
