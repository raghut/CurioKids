/**
 * Pure validation for the admin per-page edit endpoint. Index -1 addresses the cover;
 * 0..pageCount-1 address pages.
 */

export const COVER_INDEX = -1;
export const PAGE_TEXT_MAX = 2000;
export const PAGE_PROMPT_MAX = 2000;

export type PageEdit =
	| { ok: true; index: number; action: 'text'; text: string }
	| { ok: true; index: number; action: 'image'; prompt: string };

export type PageEditError = { ok: false; message: string };

export function validatePageEdit(body: unknown, pageCount: number): PageEdit | PageEditError {
	const b = (body ?? {}) as Record<string, unknown>;
	const err = (message: string): PageEditError => ({ ok: false, message });

	if (typeof b.index !== 'number' || !Number.isInteger(b.index)) return err('Which page?');
	const index = b.index;
	if (index < COVER_INDEX || index >= pageCount) return err('That page does not exist.');

	if (b.action === 'text') {
		// The cover has no text of its own — its words are the story title.
		if (index === COVER_INDEX) return err('The cover has no text to edit.');
		const text = typeof b.text === 'string' ? b.text.trim() : '';
		if (!text) return err('The page text cannot be empty.');
		if (text.length > PAGE_TEXT_MAX) return err(`Keep the text under ${PAGE_TEXT_MAX} characters.`);
		return { ok: true, index, action: 'text', text };
	}

	if (b.action === 'image') {
		const prompt = typeof b.prompt === 'string' ? b.prompt.trim() : '';
		if (!prompt) return err('Describe the picture you want before regenerating.');
		if (prompt.length > PAGE_PROMPT_MAX) return err(`Keep the prompt under ${PAGE_PROMPT_MAX} characters.`);
		return { ok: true, index, action: 'image', prompt };
	}

	return err('Unknown action.');
}
