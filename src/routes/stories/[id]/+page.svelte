<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStory } from '$lib/data/loadContent';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Story, GeneratedStory } from '$lib/types';

	let story = $state<Story | GeneratedStory | null>(null);
	let notFound = $state(false);
	let pageIndex = $state(0);

	$effect(() => {
		const id = $page.params.id;
		if (!id) return;

		// Check generated stories first
		const gen = $generatedStories.stories.find((s) => s.id === id);
		if (gen) {
			story = gen;
			notFound = false;
			return;
		}

		// Load curated story. If it isn't a curated story either, mark not-found
		// so we never hang on "Loading..." forever.
		if ($language) {
			loadStory(id, $language).then((s) => {
				story = s;
				notFound = s === null;
			});
		}
	});

	const pages = $derived(
		story
			? story.source === 'generated'
				? (story as GeneratedStory).pages.map((p) => p.text)
				: (story as Story).pages.map((p) => p.text)
			: []
	);

	const isLast = $derived(pageIndex === pages.length - 1);

	function next() {
		if (!isLast) pageIndex++;
	}

	function prev() {
		if (pageIndex > 0) pageIndex--;
	}

	function done() {
		if (story) progress.markComplete(story.id);
		goto('/stories');
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex justify-end mb-4">
		<a href="/stories" class="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
			<X size={24} strokeWidth={1.5} />
		</a>
	</header>

	{#if story}
		<h2 class="text-2xl font-bold mb-4">{story.title}</h2>

		<div class="flex-1 flex flex-col justify-center">
			<div class="bg-peach/20 rounded-2xl p-6 min-h-[200px] flex items-center justify-center">
				<p class="text-xl leading-relaxed">{pages[pageIndex]}</p>
			</div>
		</div>

		<div class="flex items-center justify-between mt-6">
			<button
				onclick={prev}
				disabled={pageIndex === 0}
				class="p-3 rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Previous"
			>
				<ChevronLeft size={28} />
			</button>

			{#if isLast}
				<button
					onclick={done}
					class="px-8 py-3 rounded-full bg-mint font-bold text-lg"
				>
					Done!
				</button>
			{:else}
				<span class="text-sm text-gray-400">{pageIndex + 1} / {pages.length}</span>
			{/if}

			<button
				onclick={next}
				disabled={isLast}
				class="p-3 rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Next"
			>
				<ChevronRight size={28} />
			</button>
		</div>

		{#if isLast && story.moral}
			<div class="mt-4 p-4 bg-mint/20 rounded-xl text-center">
				<p class="text-base italic">{story.moral}</p>
			</div>
		{/if}
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-xl font-bold mb-6">Hmm, we can't find that story.</p>
			<a href="/stories" class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold">
				Back to stories
			</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12">Loading...</p>
	{/if}
</div>
