import type { Component } from 'svelte';
import WaterCycleScene from './WaterCycleScene.svelte';

type SceneProps = { layers?: string[]; still?: boolean; cover?: boolean };

/**
 * Scene id -> component. Must list exactly the ids in catalog.ts (a unit test checks
 * this), so an imported fact can never name a scene that has no picture behind it.
 */
export const SCENES: Record<string, Component<SceneProps>> = {
	'water-cycle': WaterCycleScene
};
