<script lang="ts">
	import { SCENES } from '$lib/scenes/registry';

	/**
	 * Draws a fact's animated scene by id. An unknown id draws nothing rather than
	 * failing: a scene removed from the code must not break a fact a child opens.
	 */
	let {
		sceneId,
		layers = [],
		still = false,
		cover = false
	}: { sceneId: string; layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const Scene = $derived(SCENES[sceneId]);
</script>

{#if Scene}
	<Scene {layers} {still} {cover} />
{/if}
