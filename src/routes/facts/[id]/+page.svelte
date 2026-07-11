<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFact } from '$lib/data/loadContent';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let fact = $state<Fact | null>(null);
	let sectionIndex = $state(0);

	$effect(() => {
		const id = $page.params.id;
		if ($language && id) {
			loadFact(id, $language).then((f) => (fact = f));
		}
	});

	function next() {
		if (fact && sectionIndex < fact.sections.length - 1) {
			sectionIndex++;
		}
	}

	function prev() {
		if (sectionIndex > 0) {
			sectionIndex--;
		}
	}

	function done() {
		if (fact) {
			progress.markComplete(fact.id);
		}
		goto('/facts');
	}

	const section = $derived(fact ? fact.sections[sectionIndex] : null);
	const isLast = $derived(fact ? sectionIndex === fact.sections.length - 1 : false);
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex justify-end mb-4">
		<a href="/facts" class="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
			<X size={24} strokeWidth={1.5} />
		</a>
	</header>

	{#if fact}
		<h2 class="text-2xl font-bold mb-4">{fact.title}</h2>

		<div class="flex-1 flex flex-col justify-center">
			<div class="bg-butter/20 rounded-2xl p-6 min-h-[200px] flex flex-col justify-center">
				{#if section}
					{#if section.type === 'question'}
						<p class="text-xl font-bold">{section.text}</p>
					{:else if section.type === 'discovery'}
						<p class="text-xl">{section.text}</p>
					{:else if section.type === 'fun_facts'}
						<ul class="space-y-2">
							{#each section.items as item}
								<li class="text-lg">• {item}</li>
							{/each}
						</ul>
					{:else if section.type === 'lesson'}
						<p class="text-xl italic">{section.text}</p>
					{/if}
				{/if}
			</div>
		</div>

		<div class="flex items-center justify-between mt-6">
			<button
				onclick={prev}
				disabled={sectionIndex === 0}
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
				<span class="text-sm text-gray-400">{sectionIndex + 1} / {fact.sections.length}</span>
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
	{:else}
		<p class="text-center text-gray-400 mt-12">Loading...</p>
	{/if}
</div>
