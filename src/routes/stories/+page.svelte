<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStories } from '$lib/data/loadContent';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Story, StorySummary } from '$lib/types';

	let curated = $state<Story[]>([]);
	let generated = $state<StorySummary[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadStories($language).then((s) => (curated = s));
		generatedStories
			.loadGallery($language)
			.then((g) => (generated = g))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	const te = $derived($language === 'te');
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>{te ? 'కథలు' : 'Stories'}</h1>
	</header>

	<div class="grid grid-cols-2 gap-4">
		{#each curated as story}
			<ContentCard
				title={story.title}
				coverImage={story.cover_image || '📖'}
				href="/stories/{story.id}"
				completed={$progress.includes(story.id)}
			/>
		{/each}

		{#each generated as gen}
			<ContentCard
				title={gen.title}
				coverImage={gen.cover_url || '✨'}
				href="/stories/{gen.id}"
				completed={$progress.includes(gen.id)}
				badge="✨"
			/>
		{/each}
	</div>

	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథలు వస్తున్నాయి...' : 'Loading stories...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథల కోసం వైఫై కావాలి.' : 'We need wifi to load new stories.'}
		</p>
	{:else if curated.length === 0 && generated.length === 0}
		<p class="text-center text-gray-400 mt-12 text-lg">No stories yet!</p>
	{/if}
</div>
