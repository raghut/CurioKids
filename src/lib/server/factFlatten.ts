import type { Fact, FactRecord, FactSection, Language } from '$lib/types';

/** Which languages this record actually has words for. */
export function factLanguages(record: FactRecord): Language[] {
	return Object.keys(record.content) as Language[];
}

/**
 * Collapse a stored record into the single-language `Fact` the child's screens expect.
 *
 * This is the whole point of the bilingual record: storage keeps every language and one
 * set of images, while `FactCard`, `SectionRenderer` and both kid routes keep working on
 * the shape they already had. Returns null when the record has no words in `language`.
 */
export function flattenFact(record: FactRecord, language: Language): Fact | null {
	const c = record.content[language];
	if (!c) return null;

	const sections: FactSection[] = record.structure.map((s, i) => {
		const words = c.sections[i] ?? {};
		// Images are shared, stored outside content, and index-aligned with structure.
		const image = record.section_images[i] ?? '';
		switch (s.type) {
			case 'fun_facts':
				return { type: 'fun_facts', items: words.items ?? [] };
			case 'lesson':
				return { type: 'lesson', text: words.text ?? '' };
			case 'question':
				return { type: 'question', text: words.text ?? '', image };
			case 'discovery':
			default:
				return { type: 'discovery', text: words.text ?? '', image };
		}
	});

	return {
		id: record.id,
		type: 'nature_fact',
		language,
		topic: record.topic,
		age_range: record.age_range,
		title: c.title,
		...(c.subtitle ? { subtitle: c.subtitle } : {}),
		cover_image: record.cover_image_url,
		// Facts have no audio yet (recorded-vs-TTS is undecided) and the viewer renders
		// fine without it, but the kid Fact type requires the field.
		audio: '',
		sections,
		reflection_question: c.reflection_question,
		real_world_mission: c.real_world_mission,
		// Shared by every language, like the images. Absent on still-image facts, so their
		// API output is byte-for-byte what it was.
		...(record.scene ? { scene: record.scene } : {})
	};
}
