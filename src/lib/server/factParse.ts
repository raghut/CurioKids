import type { FactContent, FactStructureSection, Language } from '$lib/types';

/** A fact can run to a ten-screen "how things work" explainer. */
export const MAX_SECTIONS = 10;

const SECTION_TYPES = ['question', 'discovery', 'fun_facts', 'lesson'] as const;
type SectionType = (typeof SECTION_TYPES)[number];

/** Only these carry a picture, matching the kid-facing FactSection schema. */
const IMAGE_TYPES: SectionType[] = ['question', 'discovery'];

export type ParsedFact = {
	topic: string;
	cover_prompt: string;
	structure: FactStructureSection[];
	content: Partial<Record<Language, FactContent>>;
};

/**
 * Parse and check the model's fact payload. Pure, so the contract is testable without
 * a network call.
 *
 * The section structure is language-neutral and lives outside `content`: every
 * language supplies only the words, positionally. That is what makes one
 * `section_images` array valid for all languages — a per-language structure could
 * disagree and misalign every picture after the first gap.
 */
export function parseFactJson(raw: string): ParsedFact {
	let p: Record<string, unknown>;
	try {
		p = JSON.parse(raw);
	} catch {
		throw new Error('OpenAI returned invalid JSON');
	}

	const topic = String(p.topic ?? '').trim();
	if (!topic) throw new Error('Fact JSON is missing a topic');

	const rawSections = p.sections;
	if (!Array.isArray(rawSections) || rawSections.length < 1 || rawSections.length > MAX_SECTIONS) {
		throw new Error(`Fact JSON must have between 1 and ${MAX_SECTIONS} sections`);
	}

	const structure: FactStructureSection[] = rawSections.map((s, i) => {
		const type = (s as { type?: string })?.type as SectionType;
		if (!SECTION_TYPES.includes(type)) {
			throw new Error(`Fact JSON has an unknown section type at ${i}: ${String(type)}`);
		}
		// An image_prompt on fun_facts/lesson is dropped rather than rejected: the words
		// are fine, and the renderer has nowhere to put the picture anyway.
		const prompt = String((s as { image_prompt?: string })?.image_prompt ?? '').trim();
		return IMAGE_TYPES.includes(type) && prompt ? { type, image_prompt: prompt } : { type };
	});

	const rawContent = (p.content ?? {}) as Record<string, unknown>;
	const langs = Object.keys(rawContent);
	if (!langs.length) throw new Error('Fact JSON has no language content');

	const content: Partial<Record<Language, FactContent>> = {};
	for (const lang of langs) {
		const c = rawContent[lang] as Record<string, unknown>;
		const title = String(c?.title ?? '').trim();
		if (!title) throw new Error(`Fact JSON (${lang}) is missing a title`);

		const reflection = String(c?.reflection_question ?? '').trim();
		if (!reflection) throw new Error(`Fact JSON (${lang}) is missing a reflection question`);

		const mission = String(c?.real_world_mission ?? '').trim();
		if (!mission) throw new Error(`Fact JSON (${lang}) is missing a real world mission`);

		const secs = c?.sections;
		if (!Array.isArray(secs) || secs.length !== structure.length) {
			throw new Error(
				`Fact JSON (${lang}) has ${Array.isArray(secs) ? secs.length : 0} sections, expected ${structure.length}`
			);
		}

		const sections = secs.map((s, i) => {
			const kind = structure[i].type;
			if (kind === 'fun_facts') {
				const items = (s as { items?: unknown[] })?.items;
				const clean = Array.isArray(items)
					? items.map((x) => String(x).trim()).filter(Boolean)
					: [];
				if (!clean.length) throw new Error(`Fact JSON (${lang}) has an empty fun_facts list at ${i}`);
				return { items: clean };
			}
			const text = String((s as { text?: string })?.text ?? '').trim();
			if (!text) throw new Error(`Fact JSON (${lang}) has an empty section at ${i}`);
			return { text };
		});

		const subtitle = String(c?.subtitle ?? '').trim();
		content[lang as Language] = {
			title,
			...(subtitle ? { subtitle } : {}),
			sections,
			reflection_question: reflection,
			real_world_mission: mission
		};
	}

	return {
		topic,
		cover_prompt: String(p.cover_prompt ?? '').trim(),
		structure,
		content
	};
}
