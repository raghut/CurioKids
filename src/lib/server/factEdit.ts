import type { FactContent, FactContentSection, FactRecord, Language } from '$lib/types';

/** The cover is addressed as -1, the way pageEdit.ts addresses a story cover. */
export const COVER_SLOT = -1;

const LANGUAGES: Language[] = ['en', 'te'];
const IMAGE_TYPES = ['question', 'discovery'];

export type ContentEditOk = { ok: true; language: Language; content: FactContent };
export type ImageEditOk = { ok: true; slot: number; prompt: string };
export type EditErr = { ok: false; message: string };

/**
 * Validate an operator's edit to one language's words.
 *
 * The section COUNT is checked against the structure, not against the language's
 * current sections: a language being added for the first time has none yet, and every
 * language must line up with the shared `section_images` array by position.
 * Nothing here may add, remove or reorder sections.
 */
export function validateContentEdit(body: unknown, record: FactRecord): ContentEditOk | EditErr {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): EditErr => ({ ok: false, message });

	const language = b.language as Language;
	if (!LANGUAGES.includes(language)) return err('Unknown language.');

	const title = String(b.title ?? '').trim();
	if (!title) return err('The title cannot be empty.');

	const reflection = String(b.reflection_question ?? '').trim();
	if (!reflection) return err('The reflection question cannot be empty.');

	const mission = String(b.real_world_mission ?? '').trim();
	if (!mission) return err('The real-world mission cannot be empty.');

	const raw = b.sections;
	if (!Array.isArray(raw) || raw.length !== record.structure.length) {
		return err(`This fact has ${record.structure.length} sections; the edit had ${Array.isArray(raw) ? raw.length : 0}.`);
	}

	const sections: FactContentSection[] = [];
	for (let i = 0; i < raw.length; i++) {
		const s = (raw[i] ?? {}) as { text?: unknown; items?: unknown };
		if (record.structure[i].type === 'fun_facts') {
			const items = Array.isArray(s.items) ? s.items.map((x) => String(x).trim()).filter(Boolean) : [];
			if (!items.length) return err(`The fun facts list at ${i + 1} cannot be empty.`);
			sections.push({ items });
		} else {
			const text = String(s.text ?? '').trim();
			if (!text) return err(`Section ${i + 1} cannot be empty.`);
			sections.push({ text });
		}
	}

	const subtitle = String(b.subtitle ?? '').trim();
	return {
		ok: true,
		language,
		content: {
			title,
			...(subtitle ? { subtitle } : {}),
			sections,
			reflection_question: reflection,
			real_world_mission: mission
		}
	};
}

/** Returns a new record; never mutates the one it was given. */
export function applyContentEdit(record: FactRecord, edit: ContentEditOk): FactRecord {
	return { ...record, content: { ...record.content, [edit.language]: edit.content } };
}

/**
 * Validate a request to regenerate one picture. Only the cover and sections whose type
 * can hold an image are addressable — fun_facts and lesson have nowhere to put one.
 */
export function validateImageEdit(body: unknown, record: FactRecord): ImageEditOk | EditErr {
	const b = (body !== null && typeof body === 'object' ? body : {}) as Record<string, unknown>;
	const err = (message: string): EditErr => ({ ok: false, message });

	const slot = Number(b.slot);
	if (!Number.isInteger(slot) || slot < COVER_SLOT || slot >= record.structure.length) {
		return err('That picture is not part of this fact.');
	}
	if (slot !== COVER_SLOT && !IMAGE_TYPES.includes(record.structure[slot].type)) {
		return err('That section does not have a picture.');
	}

	const prompt = String(b.prompt ?? '').trim();
	if (!prompt) return err('The picture prompt cannot be empty.');

	return { ok: true, slot, prompt };
}

/** Returns a new record; never mutates the one it was given. */
export function applyImageEdit(
	record: FactRecord,
	slot: number,
	url: string,
	prompt: string
): FactRecord {
	if (slot === COVER_SLOT) {
		return { ...record, cover_image_url: url, cover_prompt: prompt };
	}
	const section_images = [...record.section_images];
	while (section_images.length < record.structure.length) section_images.push('');
	section_images[slot] = url;

	const structure = record.structure.map((s, i) => (i === slot ? { ...s, image_prompt: prompt } : s));
	return { ...record, section_images, structure };
}
