<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFact } from '$lib/data/loadContent';
	import FactReader from '$lib/components/FactReader.svelte';
	import { X } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let fact = $state<Fact | null>(null);
	let notFound = $state(false);

	$effect(() => {
		const id = $page.params.id;
		if ($language && id) {
			fact = null;
			notFound = false;
			loadFact(id, $language).then((f) => {
				fact = f;
				notFound = f === null;
			});
		}
	});

	function done() {
		if (fact) progress.markComplete(fact.id);
		goto('/facts');
	}
</script>

<!-- The visible screen, not 100vh: on iPhone Safari 100vh runs under the toolbar and hid
     the next arrow. dvh tracks what is actually visible. -->
<div
	class="flex h-screen flex-col overflow-hidden bg-white px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] supports-[height:100dvh]:h-dvh"
>
	{#if !fact}
		<!-- The reader draws the X beside the title; this one covers loading and not-found. -->
		<header class="flex justify-end">
			<a
				href="/facts"
				class="-mr-3 w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
				aria-label="Close"
			>
				<X size={28} strokeWidth={1.5} />
			</a>
		</header>
	{/if}

	{#if fact}
		<FactReader
			title={fact.title}
			sections={fact.sections}
			reflectionQuestion={fact.reflection_question}
			realWorldMission={fact.real_world_mission}
			language={$language ?? 'en'}
			scene={fact.scene}
			onDone={done}
		/>
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-2xl font-bold mb-6">Hmm, we can't find that fact.</p>
			<a
				href="/facts"
				class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold min-h-[64px] flex items-center"
			>
				Back to Why &amp; How?
			</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12 text-xl">Loading...</p>
	{/if}
</div>
