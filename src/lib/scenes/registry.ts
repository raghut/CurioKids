import type { Component } from 'svelte';
import WaterCycleScene from './WaterCycleScene.svelte';
import AntTrailScene from './AntTrailScene.svelte';
import RainbowScene from './RainbowScene.svelte';
import ElectricityScene from './ElectricityScene.svelte';
import DayNightScene from './DayNightScene.svelte';
import SeedScene from './SeedScene.svelte';
import ButterflyScene from './ButterflyScene.svelte';
import BeesScene from './BeesScene.svelte';
import MoonScene from './MoonScene.svelte';
import ShadowScene from './ShadowScene.svelte';
import CarrotShareScene from './CarrotShareScene.svelte';

type SceneProps = { layers?: string[]; still?: boolean; cover?: boolean };

/**
 * Scene id -> component. Must list exactly the ids in catalog.ts (a unit test checks
 * this), so an imported fact can never name a scene that has no picture behind it.
 */
export const SCENES: Record<string, Component<SceneProps>> = {
	'water-cycle': WaterCycleScene,
	'ant-trail': AntTrailScene,
	rainbow: RainbowScene,
	electricity: ElectricityScene,
	'day-night': DayNightScene,
	seed: SeedScene,
	butterfly: ButterflyScene,
	bees: BeesScene,
	moon: MoonScene,
	shadow: ShadowScene,
	'carrot-share': CarrotShareScene
};
