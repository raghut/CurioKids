<script lang="ts">
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStories } from '$lib/data/loadContent';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Story } from '$lib/types';

	let stories = $state<Story[]>([]);

	$effect(() => {
		if ($language) {
			loadStories($language).then((s) => (stories = s));
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
			{te ? 'కథలు' : 'Stories'}
		</h1>
	</header>

	<div class="grid grid-cols-2 gap-4">
		{#each stories as story}
			<ContentCard
				title={story.title}
				coverImage={story.cover_image || '📖'}
				href="/stories/{story.id}"
				completed={$progress.includes(story.id)}
			/>
		{/each}

		{#each $generatedStories.stories as gen}
			<ContentCard
				title={gen.title}
				coverImage={gen.cover_image_data_uri || '✨'}
				href="/stories/{gen.id}"
				completed={$progress.includes(gen.id)}
				badge="✨"
			/>
		{/each}
	</div>

	{#if stories.length === 0 && $generatedStories.stories.length === 0}
		<p class="text-center text-gray-400 mt-12 text-lg">No stories yet!</p>
	{/if}
</div>
