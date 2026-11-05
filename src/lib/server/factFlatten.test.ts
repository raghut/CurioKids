import { describe, it, expect } from 'vitest';
import type { FactRecord } from '$lib/types';
import { flattenFact, factLanguages } from './factFlatten';

function record(over: Partial<FactRecord> = {}): FactRecord {
	return {
		id: 'fact-001',
		type: 'nature_fact',
		topic: 'Ants',
		age_range: '5-8',
		status: 'published',
		cover_image_url: 'https://blob/cover.jpg',
		section_images: ['https://blob/s0.jpg', '', ''],
		structure: [{ type: 'question' }, { type: 'fun_facts' }, { type: 'lesson' }],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [{ text: 'Have you seen them?' }, { items: ['One', 'Two'] }, { text: 'Together is easier.' }],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Go and look.'
			},
			te: {
				title: 'చీమలు ఎందుకు వరుసగా నడుస్తాయి?',
				sections: [{ text: 'చూశావా?' }, { items: ['ఒకటి', 'రెండు'] }, { text: 'కలిసి సులభం.' }],
				reflection_question: 'చీమతో ఏమి చెబుతావు?',
				real_world_mission: 'వెళ్ళి చూడు.'
			}
		},
		created_at: '2026-10-18T00:00:00.000Z',
		...over
	};
}

describe('flattenFact', () => {
	it('produces the kid-facing Fact shape for a language', () => {
		const f = flattenFact(record(), 'en')!;
		expect(f.id).toBe('fact-001');
		expect(f.language).toBe('en');
		expect(f.title).toBe('Why do ants walk in a line?');
		expect(f.cover_image).toBe('https://blob/cover.jpg');
		expect(f.reflection_question).toBe('What would you say to an ant?');
		expect(f.real_world_mission).toBe('Go and look.');
	});

	// audio is required on the kid Fact type and facts have none yet.
	it('always sets audio to an empty string', () => {
		expect(flattenFact(record(), 'en')!.audio).toBe('');
	});

	// Still-image facts must reach the child exactly as before the scene field existed.
	it('adds no scene key to a fact without one', () => {
		expect('scene' in flattenFact(record(), 'en')!).toBe(false);
	});

	it('passes a scene through unchanged for every language', () => {
		const scene = { id: 'water-cycle', section_layers: [['rain'], [], []] };
		expect(flattenFact(record({ scene }), 'en')!.scene).toEqual(scene);
		expect(flattenFact(record({ scene }), 'te')!.scene).toEqual(scene);
	});

	it('merges shared images into the right sections by index', () => {
		const f = flattenFact(record(), 'en')!;
		const first = f.sections[0];
		expect(first.type).toBe('question');
		if (first.type === 'question') expect(first.image).toBe('https://blob/s0.jpg');
	});

	it('gives a section with no image an empty string', () => {
		const f = flattenFact(record({ section_images: ['', '', ''] }), 'en')!;
		const first = f.sections[0];
		if (first.type === 'question') expect(first.image).toBe('');
	});

	it('tolerates a section_images array shorter than the structure', () => {
		const f = flattenFact(record({ section_images: [] }), 'en')!;
		const first = f.sections[0];
		if (first.type === 'question') expect(first.image).toBe('');
	});

	it('carries fun_facts items through', () => {
		const f = flattenFact(record(), 'en')!;
		const second = f.sections[1];
		expect(second.type).toBe('fun_facts');
		if (second.type === 'fun_facts') expect(second.items).toEqual(['One', 'Two']);
	});

	it('serves the other language from the same record and the same images', () => {
		const te = flattenFact(record(), 'te')!;
		expect(te.title).toBe('చీమలు ఎందుకు వరుసగా నడుస్తాయి?');
		expect(te.cover_image).toBe('https://blob/cover.jpg');
		const first = te.sections[0];
		if (first.type === 'question') expect(first.image).toBe('https://blob/s0.jpg');
	});

	it('never leaks another language into the result', () => {
		expect(JSON.stringify(flattenFact(record(), 'en'))).not.toContain('చీమలు');
	});

	it('returns null for a language the record does not have', () => {
		const enOnly = record();
		delete enOnly.content.te;
		expect(flattenFact(enOnly, 'te')).toBeNull();
	});

	it('omits subtitle when that language has none', () => {
		expect(flattenFact(record(), 'te')!.subtitle).toBeUndefined();
	});
});

describe('factLanguages', () => {
	it('lists the languages present', () => {
		expect(factLanguages(record()).sort()).toEqual(['en', 'te']);
	});

	it('is empty for a record with no content', () => {
		expect(factLanguages(record({ content: {} }))).toEqual([]);
	});
});
