import { describe, it, expect } from 'vitest';
import { parseFactJson, MAX_SECTIONS } from './factParse';

function payload(over: Record<string, unknown> = {}) {
	return JSON.stringify({
		topic: 'Ants',
		cover_prompt: 'a line of friendly cartoon ants on a path, watercolour',
		sections: [
			{ type: 'question', image_prompt: 'a child watching ants' },
			{ type: 'discovery', image_prompt: 'ants following a scent trail' },
			{ type: 'fun_facts' },
			{ type: 'lesson' }
		],
		content: {
			en: {
				title: 'Why do ants walk in a line?',
				subtitle: 'How tiny insects talk',
				sections: [
					{ text: 'Have you seen ants walking one behind another?' },
					{ text: 'Ants leave a smell on the ground called a scent trail.' },
					{ items: ['Ants can carry 50 times their weight.', 'There are 10,000 kinds of ants.'] },
					{ text: 'Working together makes hard things easy.' }
				],
				reflection_question: 'What would you say to an ant?',
				real_world_mission: 'Find a line of ants and watch where it goes.'
			}
		},
		...over
	});
}

describe('parseFactJson', () => {
	it('accepts a well-formed payload', () => {
		const f = parseFactJson(payload());
		expect(f.topic).toBe('Ants');
		expect(f.structure).toHaveLength(4);
		expect(f.content.en?.sections).toHaveLength(4);
		expect(f.structure[0].image_prompt).toBeTruthy();
	});

	it('rejects invalid JSON', () => {
		expect(() => parseFactJson('not json')).toThrow(/invalid JSON/i);
	});

	it('accepts the minimum of one section', () => {
		const one = payload({
			sections: [{ type: 'lesson' }],
			content: {
				en: {
					title: 'T',
					sections: [{ text: 'One lesson.' }],
					reflection_question: 'Q?',
					real_world_mission: 'Go look.'
				}
			}
		});
		expect(parseFactJson(one).structure).toHaveLength(1);
	});

	it(`accepts the maximum of ${MAX_SECTIONS} sections`, () => {
		const many = payload({
			sections: Array.from({ length: MAX_SECTIONS }, () => ({ type: 'discovery' })),
			content: {
				en: {
					title: 'T',
					sections: Array.from({ length: MAX_SECTIONS }, (_, i) => ({ text: `Step ${i + 1}.` })),
					reflection_question: 'Q?',
					real_world_mission: 'Go look.'
				}
			}
		});
		expect(parseFactJson(many).structure).toHaveLength(MAX_SECTIONS);
	});

	it('rejects zero sections', () => {
		expect(() =>
			parseFactJson(payload({ sections: [], content: { en: { title: 'T', sections: [], reflection_question: 'Q', real_world_mission: 'M' } } }))
		).toThrow(/between 1 and/i);
	});

	it(`rejects more than ${MAX_SECTIONS} sections`, () => {
		const tooMany = payload({
			sections: Array.from({ length: MAX_SECTIONS + 1 }, () => ({ type: 'discovery' })),
			content: {
				en: {
					title: 'T',
					sections: Array.from({ length: MAX_SECTIONS + 1 }, () => ({ text: 'x' })),
					reflection_question: 'Q?',
					real_world_mission: 'M'
				}
			}
		});
		expect(() => parseFactJson(tooMany)).toThrow(/between 1 and/i);
	});

	it('rejects an unknown section type', () => {
		expect(() => parseFactJson(payload({ sections: [{ type: 'riddle' }] }))).toThrow(/section type/i);
	});

	// The shared section_images array is indexed by structure position, so a language
	// with a different length would misalign every picture after the gap.
	it('rejects a language whose section count differs from the structure', () => {
		const short = JSON.parse(payload());
		short.content.en.sections = short.content.en.sections.slice(0, 2);
		expect(() => parseFactJson(JSON.stringify(short))).toThrow(/sections/i);
	});

	it('rejects a fun_facts section with no items', () => {
		const bad = JSON.parse(payload());
		bad.content.en.sections[2] = { items: [] };
		expect(() => parseFactJson(JSON.stringify(bad))).toThrow(/fun_facts/i);
	});

	it('rejects a text section with empty text', () => {
		const bad = JSON.parse(payload());
		bad.content.en.sections[1] = { text: '   ' };
		expect(() => parseFactJson(JSON.stringify(bad))).toThrow(/empty/i);
	});

	it('rejects a language missing a title or mission', () => {
		const noTitle = JSON.parse(payload());
		noTitle.content.en.title = '';
		expect(() => parseFactJson(JSON.stringify(noTitle))).toThrow(/title/i);

		const noMission = JSON.parse(payload());
		noMission.content.en.real_world_mission = '';
		expect(() => parseFactJson(JSON.stringify(noMission))).toThrow(/mission/i);
	});

	it('rejects a payload with no languages at all', () => {
		expect(() => parseFactJson(payload({ content: {} }))).toThrow(/language/i);
	});

	it('keeps multiple languages and shares one structure between them', () => {
		const two = JSON.parse(payload());
		two.content.te = { ...two.content.en, title: 'చీమలు ఎందుకు వరుసగా నడుస్తాయి?' };
		const f = parseFactJson(JSON.stringify(two));
		expect(Object.keys(f.content).sort()).toEqual(['en', 'te']);
		expect(f.content.te?.sections).toHaveLength(f.structure.length);
	});

	it('drops an image_prompt on a section type that cannot have a picture', () => {
		const f = parseFactJson(payload({
			sections: [
				{ type: 'question', image_prompt: 'keep me' },
				{ type: 'discovery', image_prompt: 'keep me too' },
				{ type: 'fun_facts', image_prompt: 'drop me' },
				{ type: 'lesson', image_prompt: 'drop me too' }
			]
		}));
		expect(f.structure[2].image_prompt).toBeUndefined();
		expect(f.structure[3].image_prompt).toBeUndefined();
		expect(f.structure[0].image_prompt).toBe('keep me');
	});
});
