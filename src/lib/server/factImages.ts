import type { FactStructureSection } from '$lib/types';

/** Rough per-image cost, used only to warn the operator before they spend it. */
/**
 * One generated picture, in rupees, rounded up.
 *
 * gpt-image-2.5-flare billed 439 output tokens for a 1024x1024 medium JPEG at $30/1M,
 * about $0.013. Rounded up so the estimate the operator sees is never lower than the
 * bill. Was 4 while the app used gpt-image-1, which cost roughly three times as much.
 */
export const RUPEES_PER_IMAGE = 1.5;

export const ILLUSTRATION_LEVELS = ['cover', 'cover_plus', 'every'] as const;
export type IllustrationLevel = (typeof ILLUSTRATION_LEVELS)[number];

/** How many section pictures `cover_plus` buys. */
const COVER_PLUS_COUNT = 2;

export type ImagePlan = {
	cover: boolean;
	/** Indices into the structure that should get a picture. */
	sectionIndices: number[];
};

/**
 * Decide which pictures to generate.
 *
 * Image spend scales with section count — a ten-step explainer illustrated throughout is
 * an order of magnitude more than a cover — so the level is the operator's choice and the
 * cost is shown before they commit to it. A section with no image_prompt is skipped
 * whatever the level: there is nothing to draw from.
 */
export function imagePlan(
	structure: FactStructureSection[],
	level: IllustrationLevel
): ImagePlan {
	const capable = structure
		.map((s, i) => ({ s, i }))
		.filter(({ s }) => (s.type === 'question' || s.type === 'discovery') && !!s.image_prompt)
		.map(({ i }) => i);

	if (level === 'cover') return { cover: true, sectionIndices: [] };
	if (level === 'cover_plus') return { cover: true, sectionIndices: capable.slice(0, COVER_PLUS_COUNT) };
	return { cover: true, sectionIndices: capable };
}

/** Rupees, for the create screen's warning. */
export function estimateCost(plan: ImagePlan): number {
	return ((plan.cover ? 1 : 0) + plan.sectionIndices.length) * RUPEES_PER_IMAGE;
}
