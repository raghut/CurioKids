<script lang="ts">
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import type { Language, StoryScene } from '$lib/types';

	/**
	 * The child's reading experience: one page at a time, picture above text, prev/next.
	 * Shared by the kid route and the admin preview so the preview cannot drift from
	 * what a child actually sees. Holds no data loading, progress or print — those stay
	 * with whichever route uses it.
	 */
	let {
		title,
		pages = [],
		moral = '',
		language = 'en',
		closeHref = '/stories',
		showClose = true,
		doneLabel = 'Done!',
		scene,
		onDone
	}: {
		title: string;
		pages?: Array<{ text: string; image_url?: string }>;
		moral?: string;
		language?: Language;
		closeHref?: string;
		/** Off when the host route draws its own header (the kid route pairs close with print). */
		showClose?: boolean;
		doneLabel?: string;
		/** Optional animated scene; replaces per-page pictures when present. */
		scene?: StoryScene;
		onDone?: () => void;
	} = $props();

	let pageIndex = $state(0);

	const current = $derived(pages[pageIndex]);
	const isLast = $derived(pageIndex === pages.length - 1);
	// The scene stays mounted across pages, so its layers fade instead of the picture blinking.
	const sceneLayers = $derived(scene ? (scene.page_layers[pageIndex] ?? []) : []);

	export function reset() {
		pageIndex = 0;
	}

	function next() {
		if (!isLast) pageIndex++;
	}
	function prev() {
		if (pageIndex > 0) pageIndex--;
	}
</script>

<div class="flex-1 flex flex-col">
	{#if showClose}
		<header class="flex justify-end items-center gap-1 mb-4">
			<a href={closeHref} class="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
				<X size={24} strokeWidth={1.5} />
			</a>
		</header>
	{/if}

	<h2 class="text-2xl font-bold mb-4" lang={language}>{title}</h2>

	<div class="flex-1 flex flex-col justify-center">
		{#if scene}
			<div class="mx-auto mb-4 aspect-[680/360] w-full overflow-hidden rounded-2xl">
				<FactScene sceneId={scene.id} layers={sceneLayers} />
			</div>
		{/if}
		<div class="bg-peach/20 rounded-2xl p-6 {scene ? 'min-h-[140px]' : 'min-h-[200px]'} flex flex-col items-center justify-center gap-4">
			{#if !scene && current?.image_url}
				<img src={current.image_url} alt="" class="w-full max-w-sm rounded-xl object-cover" />
			{/if}
			<p class="text-xl leading-relaxed text-center" lang={language}>{current?.text}</p>
		</div>
	</div>

	<div class="flex items-center justify-between mt-6">
		<button onclick={prev} disabled={pageIndex === 0} class="p-3 rounded-full bg-gray-100 disabled:opacity-30" aria-label="Previous">
			<ChevronLeft size={28} />
		</button>

		{#if isLast}
			<button onclick={() => onDone?.()} class="px-8 py-3 rounded-full bg-mint font-bold text-lg">{doneLabel}</button>
		{:else}
			<span class="text-sm text-gray-400">{pageIndex + 1} / {pages.length}</span>
		{/if}

		<button onclick={next} disabled={isLast} class="p-3 rounded-full bg-gray-100 disabled:opacity-30" aria-label="Next">
			<ChevronRight size={28} />
		</button>
	</div>

	{#if isLast && moral}
		<div class="mt-4 p-4 bg-mint/20 rounded-xl text-center">
			<p class="text-base italic" lang={language}>{moral}</p>
		</div>
	{/if}
</div>
