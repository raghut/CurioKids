<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFacts } from '$lib/data/loadContent';
	import FactCard from '$lib/components/FactCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let facts = $state<Fact[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadFacts($language)
			.then((f) => (facts = f))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	const te = $derived($language === 'te');
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a
			href="/"
			class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Back"
		>
			<ArrowLeft size={28} strokeWidth={1.5} />
		</a>
		<h1 class="text-3xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'ఎందుకు?' : 'Why?'}
		</h1>
	</header>

	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాలు వస్తున్నాయి...' : 'Loading facts...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాల కోసం వైఫై కావాలి.' : 'We need wifi to load facts.'}
		</p>
	{:else if facts.length === 0}
		<p class="text-center text-gray-400 mt-12 text-xl">No facts yet!</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each facts as fact}
				<FactCard
					title={fact.title}
					subtitle={fact.subtitle ?? ''}
					coverImage={fact.cover_image || '🌿'}
					href="/facts/{fact.id}"
					completed={$progress.includes(fact.id)}
					language={$language ?? 'en'}
				/>
			{/each}
		</div>
	{/if}
</div>
