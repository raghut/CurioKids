import { describe, it, expect } from 'vitest';
import type { FactRecord } from '$lib/types';
import {
	validateContentEdit,
	validateImageEdit,
	applyContentEdit,
	applyImageEdit,
	COVER_SLOT
} from './factEdit';

function record(over: Partial<FactRecord> = {}): FactRecord {
	return {
		id: 'f1',
		type: 'nature_fact',
		topic: 'Ants',
		age_range: '5-8',
		status: 'draft',
		cover_image_url: 'https://blob/cover.jpg',
		cover_prompt: 'ants on a path',
		section_images: ['https://blob/s0.jpg', '', ''],
		structure: [
			{ type: 'question', image_prompt: 'a child watching ants' },
			{ type: 'fun_facts' },
			{ type: 'lesson' }
		],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [{ text: 'Have you seen them?' }, { items: ['One', 'Two'] }, { text: 'Together is easier.' }],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Go and look.'
			}
		},
		created_at: '2026-10-18T00:00:00.000Z',
		...over
	};
}

const goodContent = {
	language: 'en',
	title: 'New title',
	subtitle: 'New subtitle',
	sections: [{ text: 'New opener.' }, { items: ['A', 'B'] }, { text: 'New lesson.' }],
	reflection_question: 'New question?',
	real_world_mission: 'New mission.'
};

describe('validateContentEdit', () => {
	it('accepts a well-formed edit', () => {
		const r = validateContentEdit(goodContent, record());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.language).toBe('en');
	});

	it('accepts an edit for a language the record does not have yet', () => {
		expect(validateContentEdit({ ...goodContent, language: 'te' }, record()).ok).toBe(true);
	});

	it('rejects an unknown language', () => {
		expect(validateContentEdit({ ...goodContent, language: 'fr' }, record()).ok).toBe(false);
	});

	// Section count is what keeps every language aligned with the shared image array.
	it('rejects a section count that differs from the structure', () => {
		const short = { ...goodContent, sections: goodContent.sections.slice(0, 2) };
		const r = validateContentEdit(short, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/sections/i);
	});

	it('rejects empty text on a text section', () => {
		const bad = { ...goodContent, sections: [{ text: '  ' }, { items: ['A'] }, { text: 'x' }] };
		expect(validateContentEdit(bad, record()).ok).toBe(false);
	});

	it('rejects an empty fun_facts list', () => {
		const bad = { ...goodContent, sections: [{ text: 'x' }, { items: [] }, { text: 'y' }] };
		const r = validateContentEdit(bad, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/fun facts|fun_facts/i);
	});

	it('rejects a blank title, reflection question or mission', () => {
		expect(validateContentEdit({ ...goodContent, title: '' }, record()).ok).toBe(false);
		expect(validateContentEdit({ ...goodContent, reflection_question: ' ' }, record()).ok).toBe(false);
		expect(validateContentEdit({ ...goodContent, real_world_mission: '' }, record()).ok).toBe(false);
	});

	it('treats a blank subtitle as absent rather than an error', () => {
		const r = validateContentEdit({ ...goodContent, subtitle: '   ' }, record());
		expect(r.ok).toBe(true);
		if (r.ok) expect(r.content.subtitle).toBeUndefined();
	});

	it('trims the words it keeps', () => {
		const r = validateContentEdit({ ...goodContent, title: '  Spaced  ' }, record());
		if (r.ok) expect(r.content.title).toBe('Spaced');
	});
});

describe('applyContentEdit', () => {
	it('replaces only that language and leaves images and structure alone', () => {
		const before = record();
		const r = validateContentEdit(goodContent, before);
		if (!r.ok) throw new Error('expected ok');
		const after = applyContentEdit(before, r);
		expect(after.content.en?.title).toBe('New title');
		expect(after.section_images).toEqual(before.section_images);
		expect(after.structure).toEqual(before.structure);
	});

	it('adds a language that was missing without touching the existing one', () => {
		const before = record();
		const r = validateContentEdit({ ...goodContent, language: 'te', title: 'తెలుగు' }, before);
		if (!r.ok) throw new Error('expected ok');
		const after = applyContentEdit(before, r);
		expect(after.content.te?.title).toBe('తెలుగు');
		expect(after.content.en?.title).toBe('Why do ants walk in a line?');
	});

	it('does not mutate the record it was given', () => {
		const before = record();
		const r = validateContentEdit(goodContent, before);
		if (!r.ok) throw new Error('expected ok');
		applyContentEdit(before, r);
		expect(before.content.en?.title).toBe('Why do ants walk in a line?');
	});
});

describe('validateImageEdit', () => {
	it('accepts the cover', () => {
		const r = validateImageEdit({ slot: COVER_SLOT, prompt: 'new cover' }, record());
		expect(r.ok).toBe(true);
	});

	it('accepts an image-capable section', () => {
		expect(validateImageEdit({ slot: 0, prompt: 'new picture' }, record()).ok).toBe(true);
	});

	it('rejects a section that cannot hold a picture', () => {
		const r = validateImageEdit({ slot: 1, prompt: 'nope' }, record());
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.message).toMatch(/picture/i);
	});

	it('rejects an out-of-range slot', () => {
		expect(validateImageEdit({ slot: 9, prompt: 'x' }, record()).ok).toBe(false);
		expect(validateImageEdit({ slot: -2, prompt: 'x' }, record()).ok).toBe(false);
	});

	it('rejects a blank prompt', () => {
		expect(validateImageEdit({ slot: 0, prompt: '   ' }, record()).ok).toBe(false);
	});
});

describe('applyImageEdit', () => {
	it('swaps the cover url and prompt', () => {
		const after = applyImageEdit(record(), COVER_SLOT, 'https://blob/new.jpg', 'new cover');
		expect(after.cover_image_url).toBe('https://blob/new.jpg');
		expect(after.cover_prompt).toBe('new cover');
	});

	it('swaps one section image and its prompt, leaving the others alone', () => {
		const before = record();
		const after = applyImageEdit(before, 0, 'https://blob/new.jpg', 'new picture');
		expect(after.section_images[0]).toBe('https://blob/new.jpg');
		expect(after.section_images[1]).toBe('');
		expect(after.structure[0].image_prompt).toBe('new picture');
		expect(after.structure[1].image_prompt).toBeUndefined();
	});

	it('does not mutate the record it was given', () => {
		const before = record();
		applyImageEdit(before, 0, 'https://blob/new.jpg', 'p');
		expect(before.section_images[0]).toBe('https://blob/s0.jpg');
	});
});
