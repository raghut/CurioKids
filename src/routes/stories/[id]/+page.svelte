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
						reflectionQuestion: story.reflection_question,
						scene: (story as GeneratedStory).scene
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

<!-- The visible screen, not 100vh: on iPhone Safari 100vh runs under the toolbar and hid
     the next arrow. Print gets its normal flowing layout back. -->
<div
	class="flex h-screen flex-col overflow-hidden bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] supports-[height:100dvh]:h-dvh print:block print:h-auto print:overflow-visible print:p-0"
>
	{#snippet closeButton()}
		<a
			href="/stories"
			class="-mr-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Close"
		>
			<X size={28} strokeWidth={1.5} />
		</a>
	{/snippet}

	{#if !story}
		<!-- The reader draws its buttons beside the title; this covers loading and not-found. -->
		<header class="flex justify-end print:hidden">{@render closeButton()}</header>
	{/if}

	{#if printData}
		<PrintableStory {...printData} language={$language ?? 'en'} />
	{/if}

	{#if story}
		<div class="flex min-h-0 flex-1 flex-col print:hidden">
			<StoryReader
				title={story.title}
				{pages}
				moral={story.moral}
				language={$language ?? 'en'}
				scene={story.source === 'generated' ? (story as GeneratedStory).scene : undefined}
				onDone={done}
			>
				{#snippet actions()}
					<button
						onclick={() => window.print()}
						class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
						aria-label="Print"
					>
						<Printer size={26} strokeWidth={1.5} />
					</button>
					{@render closeButton()}
				{/snippet}
			</StoryReader>
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
