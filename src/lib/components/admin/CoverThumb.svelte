<script lang="ts">
	import FactScene from '$lib/components/FactScene.svelte';
	import { SCENE_CATALOG } from '$lib/scenes/catalog';

	/**
	 * The small cover square in the admin fact and story lists. A cover image wins; a
	 * scene fact or scene story (which has no image) draws its scene's cover moment, still,
	 * the way the child's list does; anything else gets the placeholder. Without this,
	 * every scene item showed a blank grey square in admin while children saw a picture.
	 */
	let {
		coverUrl = '',
		sceneId = null,
		size = 'sm',
		placeholder = ''
	}: {
		coverUrl?: string;
		sceneId?: string | null;
		size?: 'sm' | 'md';
		placeholder?: string;
	} = $props();

	const box = $derived(size === 'sm' ? 'h-10 w-10 rounded-md' : 'h-14 w-14 rounded-lg');
	const cover = $derived(sceneId ? [...(SCENE_CATALOG[sceneId]?.cover ?? [])] : []);
</script>

{#if coverUrl}
	<img src={coverUrl} alt="" class="{box} shrink-0 object-cover" />
{:else if sceneId && SCENE_CATALOG[sceneId]}
	<div class="{box} shrink-0 overflow-hidden bg-slate-100">
		<FactScene {sceneId} layers={cover} still cover />
	</div>
{:else}
	<div class="{box} grid shrink-0 place-items-center bg-slate-200 {size === 'sm' ? 'text-lg' : 'text-2xl'}">
		{placeholder}
	</div>
{/if}
