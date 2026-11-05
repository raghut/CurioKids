import { describe, it, expect } from 'vitest';
import src from './registry.ts?raw';
import { SCENE_CATALOG } from './catalog';

const svelteSources = import.meta.glob<string>('./*.svelte', { query: '?raw', import: 'default', eager: true });

// registry.ts imports .svelte files, which this test setup does not compile, so the
// check reads its source instead: every catalog id needs a component and vice versa.
describe('scene registry', () => {
	// 'water-cycle': WaterCycleScene  ->  { 'water-cycle': 'WaterCycleScene' }
	const entries = Object.fromEntries(
		[...src.matchAll(/^\t'([a-z0-9-]+)':\s*(\w+)/gm)].map((m) => [m[1], m[2]])
	);
	// import WaterCycleScene from './WaterCycleScene.svelte'  ->  component -> file
	const files = Object.fromEntries(
		[...src.matchAll(/import (\w+) from '\.\/(\w+)\.svelte'/g)].map((m) => [m[1], m[2]])
	);

	it('registers exactly the scenes the catalog lists', () => {
		expect(Object.keys(entries).sort()).toEqual(Object.keys(SCENE_CATALOG).sort());
	});

	it('draws every catalog layer in its component', () => {
		for (const [id, info] of Object.entries(SCENE_CATALOG)) {
			const file = files[entries[id]];
			expect(file, id).toBeTruthy();
			const svelte = svelteSources[`./${file}.svelte`];
			for (const layer of info.layers) expect(svelte, `${id}:${layer}`).toContain(`op('${layer}')`);
		}
	});
});
