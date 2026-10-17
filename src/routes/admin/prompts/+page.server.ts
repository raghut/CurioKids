import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import type { AgeBand, PromptKind } from '$lib/types';
import {
	ALLOWED_VARS,
	LOCKED_FLOOR,
	PROMPT_KINDS,
	PROMPT_KIND_LABELS,
	renderWithFloor,
	resolveTemplates,
	validateTemplate
} from '$lib/server/promptTemplates';
import { adminTemplateVars } from '$lib/server/storyPrompt';
import {
	listPromptOverrides,
	upsertPromptTemplate,
	deletePromptTemplate
} from '$lib/server/db';
import { characters } from '$lib/data/characters';
import { themes } from '$lib/data/themes';

const BANDS: AgeBand[] = ['2-4', '5-6', '7-8'];

function isBand(v: unknown): v is AgeBand {
	return BANDS.includes(v as AgeBand);
}
function isKind(v: unknown): v is PromptKind {
	return PROMPT_KINDS.includes(v as PromptKind);
}

/** A representative brief, so Preview shows a prompt exactly as the model will get it. */
function sampleVars(band: AgeBand) {
	return adminTemplateVars({
		storyIdea: 'Motu the elephant finds a big banana and shares it.',
		character: characters.find((c) => c.id === 'elephant') ?? null,
		customCharacter: null,
		supportingCharacter: 'a cheerful parrot',
		theme: themes.find((t) => t.id === 'sharing')!,
		ageBand: band,
		language: 'en',
		tone: 'gentle',
		setting: 'a village pond',
		moralFocus: 'sharing feels good',
		extra: null
	});
}

export const load: PageServerLoad = async () => {
	let overrides: Awaited<ReturnType<typeof listPromptOverrides>> = [];
	let loadError = false;
	try {
		overrides = await listPromptOverrides();
	} catch (err) {
		// Most likely prompt_templates doesn't exist yet — say so rather than 500.
		console.error('prompt overrides load failed:', err instanceof Error ? err.message : 'unknown');
		loadError = true;
	}

	const bands = BANDS.map((band) => {
		const forBand: Partial<Record<PromptKind, string>> = {};
		const editedAt: Partial<Record<PromptKind, string>> = {};
		for (const o of overrides.filter((o) => o.age_band === band)) {
			forBand[o.kind] = o.body;
			editedAt[o.kind] = new Date(o.updated_at).toISOString();
		}
		const resolved = resolveTemplates(band, forBand);
		return {
			band,
			templates: PROMPT_KINDS.map((kind) => ({
				kind,
				label: PROMPT_KIND_LABELS[kind],
				body: resolved[kind],
				isDefault: forBand[kind] === undefined,
				editedAt: editedAt[kind] ?? null,
				locked: LOCKED_FLOOR[kind],
				vars: ALLOWED_VARS[kind]
			}))
		};
	});

	return { bands, loadError };
};

export const actions: Actions = {
	save: async ({ request }) => {
		const form = await request.formData();
		const band = form.get('band');
		const kind = form.get('kind');
		const body = String(form.get('body') ?? '');
		if (!isBand(band) || !isKind(kind)) return fail(400, { error: 'Unknown template.' });

		const check = validateTemplate(kind, body);
		if (!check.ok) return fail(400, { error: check.message, band, kind, body });

		try {
			await upsertPromptTemplate(band, kind, body.trim());
		} catch (err) {
			console.error('prompt save failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not save. Has npm run db:init been run?', band, kind, body });
		}
		return { saved: `${band}:${kind}` };
	},

	reset: async ({ request }) => {
		const form = await request.formData();
		const band = form.get('band');
		const kind = form.get('kind');
		if (!isBand(band) || !isKind(kind)) return fail(400, { error: 'Unknown template.' });

		try {
			await deletePromptTemplate(band, kind);
		} catch (err) {
			console.error('prompt reset failed:', err instanceof Error ? err.message : 'unknown');
			return fail(500, { error: 'Could not reset.', band, kind });
		}
		return { reset: `${band}:${kind}` };
	},

	// Render the textarea's CURRENT text against a sample brief, without saving, so the
	// server-side renderer stays the single source of truth for what the model receives.
	preview: async ({ request }) => {
		const form = await request.formData();
		const band = form.get('band');
		const kind = form.get('kind');
		const body = String(form.get('body') ?? '');
		if (!isBand(band) || !isKind(kind)) return fail(400, { error: 'Unknown template.' });

		const check = validateTemplate(kind, body);
		if (!check.ok) return fail(400, { error: check.message, band, kind, body });

		const vars =
			kind === 'image_cover' || kind === 'image_page'
				? {
						hero_descriptor: 'a small grey baby elephant with big ears and a curled trunk',
						scene: 'Motu shares the banana beside the pond'
					}
				: sampleVars(band);

		return { preview: renderWithFloor(kind, body, vars), band, kind, body };
	}
};
