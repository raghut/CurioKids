import { AGE_BANDS } from '$lib/data/filterStories';
import type { AgeBand, Theme } from '$lib/types';

/**
 * Validate an admin request to re-tag an existing story's theme and age band.
 *
 * Pure — the caller resolves the theme list and passes it in, the same way
 * validate.ts takes it, so this module needs no DB access.
 *
 * Re-tagging exists so an operator can move a story OFF a retired theme, which is
 * why only ACTIVE themes are accepted: allowing an archived one would recreate the
 * problem it is meant to fix. The legacy '5-8' age value is rejected for the same
 * reason — it is not one of the real bands the filter chips offer.
 */
export type RetagOk = { ok: true; themeId: string; ageTag: AgeBand };
export type RetagErr = { ok: false; message: string };

export function validateRetag(body: unknown, themes: Theme[]): RetagOk | RetagErr {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): RetagErr => ({ ok: false, message });

	const themeId = b.theme_id;
	if (typeof themeId !== 'string' || !themes.some((t) => t.id === themeId && !t.archived)) {
		return err('Pick an active theme.');
	}

	const ageTag = b.age_tag;
	if (typeof ageTag !== 'string' || !AGE_BANDS.includes(ageTag as AgeBand)) {
		return err(`Pick an age band: ${AGE_BANDS.join(', ')}.`);
	}

	return { ok: true, themeId, ageTag: ageTag as AgeBand };
}
