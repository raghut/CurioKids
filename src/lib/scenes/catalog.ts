/**
 * The scenes that exist, and the layers each one can show. Pure data with no Svelte
 * import, so the server-side validator and the unit tests can read it without
 * compiling a component. `registry.ts` maps the same ids to their components.
 *
 * Adding a scene: write the component in this folder, add its id + layers here, add it
 * to registry.ts. A fact can only reference ids and layers listed here, so a typo in an
 * imported fact is rejected at import time instead of rendering a blank picture.
 */
export type SceneInfo = {
	/** Shown in admin only. */
	label: string;
	/**
	 * Layers that can be switched on per section. Everything else in the scene (sky,
	 * ground, the sun's face) is always visible.
	 */
	layers: readonly string[];
	/**
	 * The busiest, most inviting moment of the scene, shown on the fact's card in the
	 * Why? list. Chosen to make a child want to tap, not to explain anything yet.
	 */
	cover: readonly string[];
};

export const SCENE_CATALOG: Readonly<Record<string, SceneInfo>> = {
	'water-cycle': {
		label: 'Water cycle',
		layers: ['sunbeams', 'vapor', 'cloud', 'rain-cloud', 'rain', 'stream'],
		cover: ['vapor', 'rain-cloud', 'rain', 'stream']
	},
	'ant-trail': {
		label: 'Ants and their trail',
		layers: ['scout', 'trail', 'line', 'smell', 'carry', 'team'],
		cover: ['trail', 'line', 'carry', 'team']
	},
	rainbow: {
		label: 'Rainbow',
		layers: ['sunlight', 'rain', 'drop', 'rainbow'],
		cover: ['sunlight', 'rain', 'rainbow']
	},
	electricity: {
		label: 'Electricity to a home',
		layers: ['flow-high', 'transformer', 'flow-home', 'bulb'],
		cover: ['flow-high', 'transformer', 'flow-home', 'bulb']
	},
	'day-night': {
		label: 'Day and night',
		layers: ['sunlight', 'spin', 'day', 'night'],
		cover: ['sunlight', 'spin', 'day', 'night']
	},
	seed: {
		label: 'Seed to plant',
		layers: ['water', 'root', 'shoot', 'leaves', 'flower', 'sunlight'],
		cover: ['root', 'flower', 'sunlight']
	},
	butterfly: {
		label: 'Butterfly life cycle',
		layers: ['egg', 'caterpillar', 'chrysalis', 'butterfly', 'cycle'],
		cover: ['egg', 'caterpillar', 'chrysalis', 'butterfly']
	},
	bees: {
		label: 'Bees and honey',
		layers: ['nectar', 'pollen', 'fly', 'cells', 'fan', 'honey'],
		cover: ['nectar', 'pollen', 'fly', 'honey']
	},
	moon: {
		label: "The moon's shapes",
		layers: ['sunlight', 'orbit', 'full', 'half', 'crescent', 'new'],
		cover: ['sunlight', 'orbit', 'full']
	},
	shadow: {
		label: 'Shadows',
		layers: ['morning', 'noon', 'evening', 'rays'],
		cover: ['morning', 'rays']
	},
	sky: {
		label: 'Why the sky is blue',
		layers: ['sunlight', 'colors', 'scatter', 'blue-sky', 'sunset'],
		cover: ['sunlight', 'scatter', 'blue-sky']
	},
	fish: {
		label: 'How fish breathe',
		layers: ['water-in', 'gills', 'oxygen', 'water-out', 'bubbles'],
		cover: ['water-in', 'gills', 'water-out', 'bubbles']
	},
	bird: {
		label: 'How birds fly',
		layers: ['flap', 'push', 'lift', 'glide', 'feather'],
		cover: ['flap', 'push', 'glide']
	},
	teeth: {
		label: 'Milk teeth',
		layers: ['milk', 'bud', 'rising', 'wobbly', 'peek', 'grown'],
		cover: ['wobbly', 'rising']
	},
	digestion: {
		label: 'Where food goes',
		layers: ['mouth', 'pipe', 'stomach', 'intestine', 'energy'],
		cover: ['mouth', 'pipe', 'stomach', 'intestine']
	},
	spider: {
		label: 'Spider web',
		layers: ['bridge', 'frame', 'spokes', 'spiral', 'spider', 'silk'],
		cover: ['bridge', 'frame', 'spokes', 'spiral', 'spider']
	},
	boat: {
		label: 'Why boats float',
		layers: ['ball', 'boat', 'push-up', 'push-aside', 'ship'],
		cover: ['ball', 'boat', 'push-up', 'ship']
	},
	thunder: {
		label: 'Lightning and thunder',
		layers: ['storm', 'lightning', 'light', 'sound', 'count', 'safe'],
		cover: ['storm', 'lightning', 'sound', 'safe']
	},
	volcano: {
		label: 'Volcano',
		layers: ['heat', 'magma', 'rise', 'erupt', 'flow', 'cool'],
		cover: ['magma', 'rise', 'erupt', 'flow']
	},
	wind: {
		label: 'What makes the wind',
		layers: ['warm', 'rise', 'breeze', 'loop', 'kite'],
		cover: ['warm', 'breeze', 'loop', 'kite']
	}
};

export function isKnownScene(id: string): boolean {
	return Object.prototype.hasOwnProperty.call(SCENE_CATALOG, id);
}
