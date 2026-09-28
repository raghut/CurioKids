<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStory } from '$lib/data/loadContent';
	import { X, Printer } from 'lucide-svelte';
	import PrintableStory from '$lib/components/PrintableStory.svelte';
	import StoryReader from '$lib/components/StoryReader.svelte';
	import type { Story, GeneratedStory } from '$lib/types';

	let story = $state<Story | GeneratedStory | null>(null);
	let notFound = $state(false);

	$effect(() => {
		const id = $page.params.id;
		if (!id) return;
		story = null;
		notFound = false;

		// Try the backend gallery first (generated stories).
		generatedStories.getStory(id).then((gen) => {
			if (gen) {
				story = gen;
				return;
			}
			// Fall back to curated (bundled) content.
			if ($language) {
				loadStory(id, $language).then((s) => {
					story = s;
					notFound = s === null;
				});
			} else {
				notFound = true;
			}
		}).catch(() => (notFound = true));
	});

	type ViewPage = { text: string; image_url?: string };
	const pages = $derived<ViewPage[]>(
		story
			? story.source === 'generated'
				? (story as GeneratedStory).pages
				: (story as Story).pages.map((p) => ({ text: p.text }))
			: []
	);

	// Normalize either source into props for the print-only layout.
	const printData = $derived(
		story
			? story.source === 'generated'
				? {
						title: story.title,
						cover: (story as GeneratedStory).cover_image_url,
						pages: (story as GeneratedStory).pages.map((p) => ({ text: p.text, image: p.image_url })),
						moral: story.moral,
						reflectionQuestion: story.reflection_question
					}
				: {
						title: story.title,
						cover: (story as Story).cover_image,
						pages: (story as Story).pages.map((p) => ({ text: p.text, image: p.image })),
						moral: story.moral,
						reflectionQuestion: story.reflection_question
					}
			: null
	);

	function done() {
		if (story) progress.markComplete(story.id);
		goto('/stories');
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col print:min-h-0 print:p-0 print:block">
	<header class="flex justify-end items-center gap-1 mb-4 print:hidden">
		{#if story}
			<button
				onclick={() => window.print()}
				class="p-2 rounded-full hover:bg-gray-100"
				aria-label="Print"
			>
				<Printer size={24} strokeWidth={1.5} />
			</button>
		{/if}
		<a href="/stories" class="p-2 rounded-full hover:bg-gray-100" aria-label="Close">
			<X size={24} strokeWidth={1.5} />
		</a>
	</header>

	{#if printData}
		<PrintableStory {...printData} language={$language ?? 'en'} />
	{/if}

	{#if story}
		<div class="flex-1 flex flex-col print:hidden">
			<StoryReader
				title={story.title}
				{pages}
				moral={story.moral}
				language={$language ?? 'en'}
				showClose={false}
				onDone={done}
			/>
		</div>
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-xl font-bold mb-6">Hmm, we can't find that story.</p>
			<a href="/stories" class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold">Back to stories</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12">Loading...</p>
	{/if}
</div>
