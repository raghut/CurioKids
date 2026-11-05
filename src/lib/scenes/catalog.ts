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
};

export const SCENE_CATALOG: Readonly<Record<string, SceneInfo>> = {
	'water-cycle': {
		label: 'Water cycle',
		layers: ['sunbeams', 'vapor', 'cloud', 'rain-cloud', 'rain', 'stream']
	}
};

export function isKnownScene(id: string): boolean {
	return Object.prototype.hasOwnProperty.call(SCENE_CATALOG, id);
}
