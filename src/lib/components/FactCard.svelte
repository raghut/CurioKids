<script lang="ts">
	import { Check } from 'lucide-svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import { SCENE_CATALOG } from '$lib/scenes/catalog';
	import type { FactScene as Scene, Language } from '$lib/types';

	/**
	 * A fact's cover in the Why? list: a big picture on top and the question under it.
	 * The picture is the hook — for a scene fact it is the scene's busiest moment
	 * (SCENE_CATALOG[id].cover), gently moving, so a child sees something happening before
	 * reading a word. Still images and the emoji fallback get the same big frame.
	 */
	let {
		title,
		subtitle = '',
		coverImage,
		href,
		completed = false,
		language = 'en',
		scene,
		tint = 0
	}: {
		title: string;
		subtitle?: string;
		coverImage: string;
		href: string;
		completed?: boolean;
		language?: Language;
		scene?: Scene;
		/** Position in the list; picks the palette colour of the caption strip. */
		tint?: number;
	} = $props();

	const te = $derived(language === 'te');
	const isImage = $derived(
		coverImage.startsWith('/') || coverImage.startsWith('data:') || coverImage.startsWith('http')
	);
	const coverLayers = $derived(
		scene ? [...(SCENE_CATALOG[scene.id]?.cover ?? scene.section_layers[0] ?? [])] : []
	);

	// Cycling the locked palette keeps a long list from reading as one grey column.
	const STRIPS = ['bg-butter/40', 'bg-sky-blue/30', 'bg-mint/35', 'bg-peach/30'];
	const strip = $derived(STRIPS[tint % STRIPS.length]);
</script>

<a
	{href}
	class="flex h-full flex-col overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-black/5 transition-shadow hover:shadow-md active:scale-[0.99]"
>
	<div class="relative aspect-[680/360] w-full overflow-hidden bg-butter/30">
		{#if scene}
			<FactScene sceneId={scene.id} layers={coverLayers} />
		{:else if isImage}
			<img src={coverImage} alt="" class="h-full w-full object-cover" />
		{:else}
			<span class="flex h-full items-center justify-center text-7xl">{coverImage}</span>
		{/if}

		{#if completed}
			<!-- Big enough to read from across the room; the card stays tappable to re-read. -->
			<div class="absolute right-3 top-3 rounded-full bg-mint p-2 shadow-sm">
				<Check size={24} strokeWidth={2.5} class="text-green-700" />
			</div>
		{/if}
	</div>

	<!-- flex-1: side by side on a tablet, both caption strips reach the card bottom. -->
	<div class="flex-1 px-5 py-4 {strip}">
		<p class="text-2xl font-bold {te ? 'leading-[1.6]' : 'leading-tight'}" lang={te ? 'te' : undefined}>
			{title}
		</p>
		{#if subtitle}
			<p class="mt-1 text-lg text-gray-600" lang={te ? 'te' : undefined}>{subtitle}</p>
		{/if}
	</div>
</a>
