<script lang="ts">
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import { scrollHint } from '$lib/actions/scrollHint';
	import type { Snippet } from 'svelte';
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
		actions,
		onDone
	}: {
		title: string;
		pages?: Array<{ text: string; image_url?: string }>;
		moral?: string;
		language?: Language;
		closeHref?: string;
		/** Off when the host passes its own buttons through `actions`. */
		showClose?: boolean;
		doneLabel?: string;
		/** Optional animated scene; replaces per-page pictures when present. */
		scene?: StoryScene;
		/** Buttons drawn in the title row instead of the plain X (the kid route adds Print). */
		actions?: Snippet;
		onDone?: () => void;
	} = $props();

	let pageIndex = $state(0);

	const current = $derived(pages[pageIndex]);
	const isLast = $derived(pageIndex === pages.length - 1);
	// The scene stays mounted across pages, so its layers fade instead of the picture blinking.
	const sceneLayers = $derived(scene ? (scene.page_layers[pageIndex] ?? []) : []);
	const te = $derived(language === 'te');
	// Big title on the first page only; after that a one-line reminder, so the picture
	// and the words get the screen.
	const first = $derived(pageIndex === 0);

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

<!-- Sized by its host to the visible screen: the arrows sit in a fixed bottom row and
     only the words scroll if a page is too long, so nothing hides under a browser bar. -->
<div class="flex min-h-0 flex-1 flex-col">
	<div class="mb-3 flex shrink-0 items-start gap-1">
		<h2
			class="min-w-0 flex-1 {first
				? `pt-2 text-3xl font-bold ${te ? 'leading-[1.6]' : 'leading-tight'}`
				: 'truncate pt-5 text-lg text-gray-500'}"
			lang={language}
		>
			{title}
		</h2>
		{#if actions}
			{@render actions()}
		{:else if showClose}
			<a
				href={closeHref}
				class="-mr-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
				aria-label="Close"
			>
				<X size={28} strokeWidth={1.5} />
			</a>
		{/if}
	</div>

	{#if scene}
		<div class="mb-3 aspect-[680/360] max-h-[40dvh] w-full shrink-0 overflow-hidden rounded-2xl">
			<FactScene sceneId={scene.id} layers={sceneLayers} />
		</div>
	{/if}

	<div class="flex min-h-0 flex-1 flex-col justify-center">
		<div class="flex min-h-0 flex-col items-center gap-4 overflow-y-auto rounded-2xl bg-peach/20 p-5" use:scrollHint>
			{#if !scene && current?.image_url}
				<img src={current.image_url} alt="" class="w-full max-w-sm rounded-xl object-cover" />
			{/if}
			<p class="text-center text-2xl {te ? 'leading-[1.6]' : 'leading-relaxed'}" lang={language}>
				{current?.text}
			</p>
			{#if isLast && moral}
				<p class="w-full rounded-xl bg-mint/30 p-4 text-center text-xl italic" lang={language}>{moral}</p>
			{/if}
		</div>
	</div>

	<div class="mt-3 flex shrink-0 items-center justify-between">
		<button
			onclick={prev}
			disabled={pageIndex === 0}
			class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
			aria-label="Previous"
		>
			<ChevronLeft size={32} />
		</button>

		{#if isLast}
			<button onclick={() => onDone?.()} class="min-h-[64px] rounded-full bg-mint px-8 py-4 text-xl font-bold">
				{doneLabel}
			</button>
		{:else}
			<span class="text-lg text-gray-400">{pageIndex + 1} / {pages.length}</span>
		{/if}

		<button
			onclick={next}
			disabled={isLast}
			class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
			aria-label="Next"
		>
			<ChevronRight size={32} />
		</button>
	</div>
</div>
