import { describe, it, expect } from 'vitest';
import { buildFactMessages } from './factPrompt';
import { parseFactJson, MIN_SECTIONS } from './factParse';

const brief = {
	brief: 'Why do ants walk in a line?',
	topic: 'Ants',
	languages: ['en', 'te'] as const,
	sectionTarget: 4
};

function userPrompt(over: Partial<typeof brief> = {}) {
	const msgs = buildFactMessages({ ...brief, ...over, languages: [...(over.languages ?? brief.languages)] });
	return msgs.find((m) => m.role === 'user')!.content;
}

/**
 * These are contract tests, not wording tests: every top-level key parseFactJson
 * demands must be asked for as OUTPUT. The first version of this prompt labelled the
 * topic as an input ("TOPIC (for filing): Ants") and never asked for it back, so
 * gpt-4o-mini omitted it and every single generation failed on "missing a topic"
 * while the parser's own hand-written fixtures stayed green.
 */
describe('buildFactMessages output contract', () => {
	it('asks for a top-level "topic" field in the output shape', () => {
		expect(userPrompt()).toMatch(/"topic"/);
	});

	it('names the shared structure array by a key distinct from a language\'s "sections"', () => {
		const user = userPrompt();
		expect(user).toMatch(/"structure"/);
	});

	it('asks for cover_prompt and a content key per requested language', () => {
		const user = userPrompt();
		expect(user).toMatch(/"cover_prompt"/);
		expect(user).toContain('"en"');
		expect(user).toContain('"te"');
	});

	it('asks for image_prompt as part of a structure entry', () => {
		// The structure entries carry the picture prompts; the shared section_images array
		// is indexed by their position. A prompt that forbids "anything else" in structure
		// loses them, and every planned illustration is then generated from an empty body.
		// Asserted against the SHOWN entry shape, not a passing mention: the model only
		// reliably emitted image_prompt once the example entry carried it.
		expect(userPrompt()).toMatch(/\{"type": "question", "image_prompt":/);
	});

	it('shows no bare "..." placeholder that the model could echo as a value', () => {
		// gpt-4o-mini copied a literal `"cover_prompt": "..."` straight out of an earlier
		// skeleton, which would have spent ~Rs.4 rendering a picture of nothing.
		expect(userPrompt()).not.toMatch(/"\.\.\."/);
	});

	// The model was asked for 8 entries and returned 5, because "give it 8 entries" never
	// said how 8 splits into the required types. The create screen prices the fact from
	// that number (screens - 2 illustratable), so a count it cannot honour mis-quotes the
	// operator — asking for 1 screen quoted Rs.4 and would have spent Rs.12.
	describe('section count', () => {
		it('spells out the decomposition and shows an example of exactly that length', () => {
			const user = userPrompt({ sectionTarget: 8 });
			expect(user).toContain('EXACTLY 8 entries');
			expect(user).toContain('1 "question", then 5 "discovery", then 1 "fun_facts", then 1 "lesson"');
			expect(user).toContain('1 + 5 + 1 + 1 = 8');
			// One example entry per requested section, so the shape cannot be miscounted.
			expect(user.match(/\{"type": "discovery"/g)).toHaveLength(5);
		});

		it('keeps at least one discovery at the shortest allowed length', () => {
			const user = userPrompt({ sectionTarget: MIN_SECTIONS });
			expect(user).toContain(`EXACTLY ${MIN_SECTIONS} entries`);
			expect(user.match(/\{"type": "discovery"/g)).toHaveLength(1);
			expect(user).toContain('1 discovery entry');
		});
	});

	it('describes a shape parseFactJson actually accepts', () => {
		// Mirror of the skeleton the prompt shows, built from the same key names.
		const payload = JSON.stringify({
			topic: 'Ants',
			cover_prompt: 'a line of ants on a path',
			structure: [
				{ type: 'question', image_prompt: 'a child watching ants' },
				{ type: 'discovery', image_prompt: 'ants on a scent trail' },
				{ type: 'fun_facts' },
				{ type: 'lesson' }
			],
			content: {
				en: {
					title: 'Why do ants walk in a line?',
					subtitle: 'How tiny insects talk',
					sections: [
						{ text: 'Have you seen ants in a row?' },
						{ text: 'Ants leave a smell on the ground.' },
						{ items: ['Ants lift 50 times their weight.'] },
						{ text: 'Working together makes hard things easy.' }
					],
					reflection_question: 'What would you say to an ant?',
					real_world_mission: 'Find a line of ants outside.'
				}
			}
		});
		const parsed = parseFactJson(payload);
		expect(parsed.topic).toBe('Ants');
		expect(parsed.structure).toHaveLength(4);
		expect(parsed.content.en?.sections).toHaveLength(4);
	});
});
