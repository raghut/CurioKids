import type { PageServerLoad } from './$types';
import { listFactsAdmin } from '$lib/server/db';
import { factLanguages } from '$lib/server/factFlatten';
import type { AdminFactSummary } from '$lib/types';

export const load: PageServerLoad = async () => {
	try {
		const rows = await listFactsAdmin();
		const facts: AdminFactSummary[] = rows.map((r) => {
			const langs = factLanguages(r);
			return {
				id: r.id,
				topic: r.topic,
				// Any available language's title, for display only.
				title: langs.length ? (r.content[langs[0]]?.title ?? r.topic) : r.topic,
				cover_url: r.cover_image_url,
				status: r.status,
				languages: langs,
				section_count: r.structure.length,
				created_at: r.created_at
			};
		});
		return { facts, loadError: false };
	} catch (err) {
		console.error('admin fact list failed:', err instanceof Error ? err.message : 'unknown');
		return { facts: [] as AdminFactSummary[], loadError: true };
	}
};
