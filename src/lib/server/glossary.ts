/**
 * The operator's Telugu word list for one fact.
 *
 * Measured against live gpt-4o-mini and gpt-4o, no wording of the fact prompt produced
 * trustworthy Telugu on its own: both models transliterated English into Telugu script
 * ("స్నేల్", "షెల్", "వెబ్", and gpt-4o's "రాంబో" for a rainbow) or invented words
 * outright ("జాలకోణం" for a spider's web, "బల్లులు" — lizards — for frogs). The knowledge
 * is simply not there to prompt for. Handed the right words, both models used them: 6 of 6
 * test facts clean on mini, where the same prompt without a glossary managed 1 of 6.
 *
 * So the words come from the operator, who speaks Telugu, and this module only has to
 * get them to the model safely. Terms outside the list are still the model's guess —
 * which is why the create screen says so and the side-by-side editor exists.
 */

export type GlossaryTerm = { en: string; te: string };

/** A fact is about one thing; a list this long is a sign something else went in the box. */
export const MAX_TERMS = 20;
const EN_MAX = 40;
const TE_MAX = 60;

/** Same hygiene as the brief and a theme's goal_hint: this text reaches the model. */
function clean(value: string, max: number): string {
	return value
		.replace(/["`]/g, '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, max);
}

/**
 * Parse the operator's free text into terms. One pair per line or per comma, written
 * `english = తెలుగు`. Anything unparseable is dropped rather than rejected: a stray
 * blank line or trailing comma should not cost a generation.
 *
 * Deliberately lenient about which side is which — it splits on the separator and keeps
 * the order written, so `snail = నత్త` means "say నత్త where the English says snail".
 */
export function parseGlossary(raw: unknown): GlossaryTerm[] {
	if (typeof raw !== 'string' || !raw.trim()) return [];

	const terms: GlossaryTerm[] = [];
	const seen = new Set<string>();

	for (const piece of raw.split(/[\n,;]+/)) {
		// Accept =, :, or an en dash between the pair; operators type all three.
		const parts = piece.split(/\s*[=:–—]\s*/);
		if (parts.length < 2) continue;

		const en = clean(parts[0], EN_MAX);
		const te = clean(parts.slice(1).join(' '), TE_MAX);
		if (!en || !te) continue;

		const key = en.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);

		terms.push({ en, te });
		if (terms.length >= MAX_TERMS) break;
	}

	return terms;
}
