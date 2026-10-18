import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { validateFactBrief } from '$lib/server/validate';
import { buildFactMessages, buildFactImagePrompt } from '$lib/server/factPrompt';
import { parseFactJson } from '$lib/server/factParse';
import { imagePlan } from '$lib/server/factImages';
import { chatJson, generateImage } from '$lib/server/openaiClient';
import { uploadImage } from '$lib/server/blob';
import { insertFact } from '$lib/server/db';
import type { FactRecord } from '$lib/types';

// Auth is enforced by hooks.server.ts (all /api/admin/* need a valid admin cookie).
// Admin fact generation has no family passcode and no daily cap, like admin stories.

// A ten-section fact illustrated throughout is eleven image calls, which runs well past
// the platform default timeout.
export const config = { maxDuration: 120 };

type ErrorCode = 'invalid_input' | 'openai_failed' | 'server_error';
function fail(code: ErrorCode, message: string, status: number) {
	return json({ error: code, message }, { status });
}

export const POST: RequestHandler = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail('invalid_input', 'Something is off with the brief. Please try again.', 400);
	}

	const v = validateFactBrief(body);
	if (!v.ok) return fail(v.code, v.message, 400);

	try {
		// One call for every language, so the structure is shared by construction.
		const parsed = parseFactJson(
			await chatJson(
				buildFactMessages({
					brief: v.brief,
					topic: v.topic,
					languages: v.languages,
					sectionTarget: v.sectionTarget
				})
			)
		);

		const plan = imagePlan(parsed.structure, v.illustration);
		const id = crypto.randomUUID();

		// Cover first, then each planned section image — all in parallel. A failed image
		// becomes "" for that slot rather than failing the whole fact.
		const jobs: Array<{ slot: number | 'cover'; body: string }> = [
			...(plan.cover && parsed.cover_prompt ? [{ slot: 'cover' as const, body: parsed.cover_prompt }] : []),
			...plan.sectionIndices.map((i) => ({ slot: i, body: parsed.structure[i].image_prompt ?? '' }))
		];

		const results = await Promise.all(
			jobs.map((j) =>
				generateImage(buildFactImagePrompt(j.body))
					.then((bytes) => uploadImage(bytes, `fact-${id}-${j.slot}`, 'facts'))
					.catch((e) => {
						console.error(`fact image ${j.slot} failed:`, e instanceof Error ? e.message : 'unknown');
						return '';
					})
			)
		);

		let coverUrl = '';
		const sectionImages = parsed.structure.map(() => '');
		jobs.forEach((j, n) => {
			if (j.slot === 'cover') coverUrl = results[n];
			else sectionImages[j.slot] = results[n];
		});

		const fact: FactRecord = {
			id,
			type: 'nature_fact',
			topic: parsed.topic || v.topic,
			age_range: '5-8',
			status: 'draft',
			cover_image_url: coverUrl,
			cover_prompt: parsed.cover_prompt,
			section_images: sectionImages,
			structure: parsed.structure,
			content: parsed.content,
			created_at: new Date().toISOString()
		};

		await insertFact(fact);
		return json({ fact });
	} catch (err) {
		console.error('admin fact generation failed:', err instanceof Error ? err.message : 'unknown');
		return fail('openai_failed', 'The fact machine had a hiccup. Please try again.', 502);
	}
};
