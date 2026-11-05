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
import SkyScene from './SkyScene.svelte';
import FishScene from './FishScene.svelte';
import BirdScene from './BirdScene.svelte';
import TeethScene from './TeethScene.svelte';
import DigestionScene from './DigestionScene.svelte';
import SpiderScene from './SpiderScene.svelte';
import BoatScene from './BoatScene.svelte';
import ThunderScene from './ThunderScene.svelte';
import VolcanoScene from './VolcanoScene.svelte';
import WindScene from './WindScene.svelte';
import PlantDrinkScene from './PlantDrinkScene.svelte';
import FrogScene from './FrogScene.svelte';
import ChickScene from './ChickScene.svelte';
import EarthwormScene from './EarthwormScene.svelte';
import ElephantScene from './ElephantScene.svelte';
import HeartScene from './HeartScene.svelte';
import EyeScene from './EyeScene.svelte';
import EarScene from './EarScene.svelte';
import SweatScene from './SweatScene.svelte';
import SoapScene from './SoapScene.svelte';
import CurdScene from './CurdScene.svelte';
import MagnetScene from './MagnetScene.svelte';
import IceScene from './IceScene.svelte';
import BicycleScene from './BicycleScene.svelte';
import PhoneCallScene from './PhoneCallScene.svelte';
import PlaneScene from './PlaneScene.svelte';
import RocketScene from './RocketScene.svelte';
import StarsScene from './StarsScene.svelte';
import SeasonsScene from './SeasonsScene.svelte';
import SaltySeaScene from './SaltySeaScene.svelte';

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
	sky: SkyScene,
	fish: FishScene,
	bird: BirdScene,
	teeth: TeethScene,
	digestion: DigestionScene,
	spider: SpiderScene,
	boat: BoatScene,
	thunder: ThunderScene,
	volcano: VolcanoScene,
	wind: WindScene,
	'plant-water': PlantDrinkScene,
	frog: FrogScene,
	chick: ChickScene,
	earthworm: EarthwormScene,
	elephant: ElephantScene,
	heart: HeartScene,
	eye: EyeScene,
	ear: EarScene,
	sweat: SweatScene,
	soap: SoapScene,
	curd: CurdScene,
	magnet: MagnetScene,
	ice: IceScene,
	bicycle: BicycleScene,
	'phone-call': PhoneCallScene,
	plane: PlaneScene,
	rocket: RocketScene,
	stars: StarsScene,
	seasons: SeasonsScene,
	'salty-sea': SaltySeaScene
};
