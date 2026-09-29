import { env } from '$env/dynamic/private';
import type { ChatMessage } from './storyPrompt';

/**
 * Server-only OpenAI wrapper. Calls the OpenAI REST API directly via fetch —
 * no SDK dependency. OPENAI_API_KEY is read from private env and never reaches
 * the client bundle.
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

function apiKey(): string {
	const key = env.OPENAI_API_KEY;
	if (!key) throw new Error('OPENAI_API_KEY is not configured');
	return key;
}

export type StoryTextResult = {
	title: string;
	/**
	 * has_supporting marks the pages the supporting character actually appears on, so
	 * its descriptor is added to those page prompts only — keeping it consistent where
	 * it belongs without dropping it into scenes the text never puts it in.
	 */
	pages: Array<{ text: string; image_prompt: string; has_supporting?: boolean }>;
	moral: string;
	reflection_question: string;
	scene: string;
	/**
	 * The model's own visual description of the hero it just wrote — species, size,
	 * colours, markings. This is the only thing the image model is told about the
	 * hero, and it is reused for every page, which is what keeps the character from
	 * drifting into a different creature. Optional: the kid flow's prompt does not
	 * ask for it (it always has a locked character descriptor to use instead).
	 */
	hero_descriptor?: string;
	/** Same idea as hero_descriptor, for the brief's supporting character. '' when none. */
	supporting_descriptor?: string;
};

/**
 * Parse and check an OpenAI story payload. Pure, so the contract is unit-testable
 * without a network call. expectedPages is an exact match, not a floor: a band that
 * asked for 6 pages and got 5 is a failure worth seeing, not one to absorb quietly.
 */
export function parseStoryJson(content: string, expectedPages = 5): StoryTextResult {
	let parsed: StoryTextResult;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('OpenAI chat returned invalid JSON');
	}

	if (
		!parsed.title ||
		!Array.isArray(parsed.pages) ||
		parsed.pages.length !== expectedPages ||
		!parsed.moral ||
		!parsed.reflection_question
	) {
		throw new Error('OpenAI story JSON missing required fields');
	}

	if (parsed.pages.some((p) => !p || typeof p.text !== 'string' || !p.text.trim())) {
		throw new Error('OpenAI story JSON has an empty page');
	}

	return parsed;
}

/**
 * Generate the story text with gpt-4o-mini. Uses response_format json_object
 * to guarantee parseable output.
 */
export async function generateStoryText(
	messages: ChatMessage[],
	expectedPages = 5
): Promise<StoryTextResult> {
	const res = await fetch(`${OPENAI_BASE}/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey()}`
		},
		body: JSON.stringify({
			model: 'gpt-4o-mini',
			messages,
			temperature: 0.8,
			response_format: { type: 'json_object' }
		})
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`OpenAI chat failed (${res.status}): ${detail.slice(0, 200)}`);
	}

	const data = await res.json();
	const content = data?.choices?.[0]?.message?.content;
	if (!content) throw new Error('OpenAI chat returned no content');

	return parseStoryJson(content, expectedPages);
}

/**
 * Generate one image with gpt-image-1 and return the raw JPEG bytes (so the
 * caller can upload to blob storage). We request JPEG at moderate compression
 * to keep stored files small.
 */
export async function generateImage(prompt: string): Promise<Buffer> {
	const res = await fetch(`${OPENAI_BASE}/images/generations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${apiKey()}`
		},
		body: JSON.stringify({
			model: 'gpt-image-1',
			prompt,
			n: 1,
			size: '1024x1024',
			quality: 'medium',
			output_format: 'jpeg',
			output_compression: 80
		})
	});

	if (!res.ok) {
		const detail = await res.text().catch(() => '');
		throw new Error(`OpenAI image failed (${res.status}): ${detail.slice(0, 200)}`);
	}

	const data = await res.json();
	const b64 = data?.data?.[0]?.b64_json;
	if (!b64) throw new Error('OpenAI image returned no data');
	return Buffer.from(b64, 'base64');
}
