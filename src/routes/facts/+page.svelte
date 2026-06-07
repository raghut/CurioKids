<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFacts } from '$lib/data/loadContent';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let facts = $state<Fact[]>([]);

	$effect(() => {
		if ($language) {
			loadFacts($language).then((f) => (facts = f));
		}
	});

	const te = $derived($language === 'te');
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'ఎందుకు?' : 'Why?'}
		</h1>
	</header>

	{#if facts.length === 0}
		<p class="text-center text-gray-400 mt-12 text-lg">No facts yet!</p>
	{:else}
		<div class="grid grid-cols-2 gap-4">
			{#each facts as fact}
				<ContentCard
					title={fact.title}
					coverImage={fact.cover_image || '🌿'}
					href="/facts/{fact.id}"
					completed={$progress.includes(fact.id)}
				/>
			{/each}
		</div>
	{/if}
</div>
