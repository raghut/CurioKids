import { describe, it, expect } from 'vitest';
import type { FactStructureSection } from '$lib/types';
import { imagePlan, estimateCost, ILLUSTRATION_LEVELS, RUPEES_PER_IMAGE } from './factImages';

const structure: FactStructureSection[] = [
	{ type: 'question', image_prompt: 'q' },
	{ type: 'discovery', image_prompt: 'd1' },
	{ type: 'fun_facts' },
	{ type: 'discovery', image_prompt: 'd2' },
	{ type: 'lesson' }
];

describe('imagePlan', () => {
	it('cover: just the cover', () => {
		const plan = imagePlan(structure, 'cover');
		expect(plan.cover).toBe(true);
		expect(plan.sectionIndices).toEqual([]);
	});

	it('cover_plus: the cover and the first two image-capable sections', () => {
		expect(imagePlan(structure, 'cover_plus').sectionIndices).toEqual([0, 1]);
	});

	it('every: the cover and every image-capable section', () => {
		expect(imagePlan(structure, 'every').sectionIndices).toEqual([0, 1, 3]);
	});

	it('never picks fun_facts or lesson', () => {
		const idx = imagePlan(structure, 'every').sectionIndices;
		expect(idx).not.toContain(2);
		expect(idx).not.toContain(4);
	});

	it('skips an image-capable section with no prompt', () => {
		const noPrompt: FactStructureSection[] = [{ type: 'question' }, { type: 'discovery', image_prompt: 'd' }];
		expect(imagePlan(noPrompt, 'every').sectionIndices).toEqual([1]);
	});

	it('cover_plus takes fewer than two when fewer exist', () => {
		const one: FactStructureSection[] = [{ type: 'question', image_prompt: 'q' }, { type: 'lesson' }];
		expect(imagePlan(one, 'cover_plus').sectionIndices).toEqual([0]);
	});

	it('handles a structure with no image-capable sections', () => {
		const none: FactStructureSection[] = [{ type: 'fun_facts' }, { type: 'lesson' }];
		const plan = imagePlan(none, 'every');
		expect(plan.cover).toBe(true);
		expect(plan.sectionIndices).toEqual([]);
	});
});

describe('estimateCost', () => {
	it('counts the cover plus each planned section image', () => {
		expect(estimateCost(imagePlan(structure, 'cover'))).toBe(RUPEES_PER_IMAGE);
		expect(estimateCost(imagePlan(structure, 'cover_plus'))).toBe(RUPEES_PER_IMAGE * 3);
		expect(estimateCost(imagePlan(structure, 'every'))).toBe(RUPEES_PER_IMAGE * 4);
	});
});

describe('ILLUSTRATION_LEVELS', () => {
	it('is the three supported levels', () => {
		expect(ILLUSTRATION_LEVELS).toEqual(['cover', 'cover_plus', 'every']);
	});
});
