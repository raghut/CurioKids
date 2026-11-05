<script lang="ts">
	import { Check } from 'lucide-svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import { SCENE_CATALOG } from '$lib/scenes/catalog';
	import type { StoryScene } from '$lib/types';

	let { title, coverImage, href, completed = false, badge = '', scene = null }: {
		title: string;
		coverImage: string;
		href: string;
		completed?: boolean;
		badge?: string;
		/** A scene story's tile shows the scene's cover moment, cropped to the square. */
		scene?: StoryScene | null;
	} = $props();

	const coverLayers = $derived(
		scene ? [...(SCENE_CATALOG[scene.id]?.cover ?? scene.page_layers[0] ?? [])] : []
	);
</script>

<a {href} class="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white relative">
	<div class="aspect-square bg-butter/30 flex items-center justify-center text-4xl">
		{#if scene}
			<FactScene sceneId={scene.id} layers={coverLayers} still cover />
		{:else if coverImage.startsWith('/') || coverImage.startsWith('data:') || coverImage.startsWith('http')}
			<img src={coverImage} alt={title} class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>
	<div class="p-3">
		<p class="text-lg font-bold truncate">{title}</p>
	</div>
	{#if completed}
		<div class="absolute top-2 right-2 bg-mint rounded-full p-1">
			<Check size={18} strokeWidth={2.5} class="text-green-700" />
		</div>
	{/if}
	{#if badge}
		<span class="absolute top-2 left-2 text-sm">{badge}</span>
	{/if}
</a>
