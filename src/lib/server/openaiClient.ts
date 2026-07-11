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
	pages: Array<{ text: string }>;
	moral: string;
	reflection_question: string;
	scene: string;
};

/**
 * Generate the story text with gpt-4o-mini. Uses response_format json_object
 * to guarantee parseable output.
 */
export async function generateStoryText(messages: ChatMessage[]): Promise<StoryTextResult> {
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

	let parsed: StoryTextResult;
	try {
		parsed = JSON.parse(content);
	} catch {
		throw new Error('OpenAI chat returned invalid JSON');
	}

	if (
		!parsed.title ||
		!Array.isArray(parsed.pages) ||
		parsed.pages.length !== 5 ||
		!parsed.moral ||
		!parsed.reflection_question
	) {
		throw new Error('OpenAI story JSON missing required fields');
	}

	return parsed;
}

/**
 * Generate the cover image with gpt-image-1 and return it as a base64 JPEG
 * data URI, ready to cache in localStorage and render offline.
 *
 * Note: dall-e-3 (the model named in CLAUDE.md) is not available on the
 * current OpenAI account, so we use gpt-image-1. It returns base64 directly
 * (no hosted URL), so no separate URL-to-data-URI fetch is needed. We request
 * JPEG at moderate compression to keep each cached cover small (~150-300 KB)
 * so the offline localStorage cache scales across many generated stories.
 */
export async function generateCoverImage(prompt: string): Promise<string> {
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
	return `data:image/jpeg;base64,${b64}`;
}
