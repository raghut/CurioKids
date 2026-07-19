import type { GeneratedStory, Language } from '$lib/types';
import type { StoryTextResult } from './openaiClient';

/**
 * Pure builder: combine generated text + uploaded image URLs into the final
 * GeneratedStory. pageUrls is index-aligned with text.pages; an empty string
 * means that page has no image (failed or disabled).
 */
export function assembleStory(input: {
	id: string;
	text: StoryTextResult;
	language: Language;
	character_id: string;
	theme_id: string;
	childName: string | null;
	coverUrl: string;
	pageUrls: string[];
	createdAt: string;
}): GeneratedStory {
	return {
		id: input.id,
		type: 'story',
		source: 'generated',
		language: input.language,
		age_range: '5-8',
		age_tag: '5-8',
		character_id: input.character_id,
		theme_id: input.theme_id,
		child_name: input.childName,
		title: input.text.title,
		cover_image_url: input.coverUrl,
		pages: input.text.pages.map((p, i) => ({ text: p.text, image_url: input.pageUrls[i] ?? '' })),
		moral: input.text.moral,
		reflection_question: input.text.reflection_question,
		created_at: input.createdAt
	};
}
