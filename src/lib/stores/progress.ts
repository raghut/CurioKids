import { writable } from 'svelte/store';

function createProgressStore() {
	const stored =
		typeof window !== 'undefined'
			? JSON.parse(localStorage.getItem('curiokids_progress') || '[]')
			: [];
	const { subscribe, update } = writable<string[]>(stored);

	function save(ids: string[]) {
		if (typeof window !== 'undefined') {
			localStorage.setItem('curiokids_progress', JSON.stringify(ids));
		}
	}

	return {
		subscribe,
		markComplete(id: string) {
			update((ids) => {
				if (!ids.includes(id)) {
					const next = [...ids, id];
					save(next);
					return next;
				}
				return ids;
			});
		},
		isComplete(ids: string[], id: string): boolean {
			return ids.includes(id);
		}
	};
}

export const progress = createProgressStore();
