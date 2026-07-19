<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFact } from '$lib/data/loadContent';
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import { swipe } from '$lib/actions/swipe';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let fact = $state<Fact | null>(null);
	let notFound = $state(false);
	let stepIndex = $state(0);

	$effect(() => {
		const id = $page.params.id;
		if ($language && id) {
			fact = null;
			notFound = false;
			stepIndex = 0;
			loadFact(id, $language).then((f) => {
				fact = f;
				notFound = f === null;
			});
		}
	});

	// One step per section, plus a final closing screen.
	const stepCount = $derived(fact ? fact.sections.length + 1 : 0);
	const onClosing = $derived(fact ? stepIndex === fact.sections.length : false);
	const section = $derived(fact && !onClosing ? fact.sections[stepIndex] : null);

	const te = $derived($language === 'te');
	const lead = $derived(te ? 'leading-[1.6]' : 'leading-relaxed');

	function next() {
		if (fact && stepIndex < stepCount - 1) stepIndex++;
	}
	function prev() {
		if (stepIndex > 0) stepIndex--;
	}
	function done() {
		if (fact) progress.markComplete(fact.id);
		goto('/facts');
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex justify-end mb-4">
		<a
			href="/facts"
			class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Close"
		>
			<X size={28} strokeWidth={1.5} />
		</a>
	</header>

	{#if fact}
		<h2 class="text-3xl font-bold mb-4" lang={te ? 'te' : undefined}>{fact.title}</h2>

		<div class="flex-1 flex flex-col justify-center" use:swipe={{ onLeft: next, onRight: prev }}>
			{#if onClosing}
				<div class="flex flex-col gap-4">
					<div class="bg-sky-blue/20 rounded-2xl p-6 text-center">
						<p class="text-xl font-bold mb-2">Think about it 💭</p>
						<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{fact.reflection_question}</p>
					</div>
					<div class="bg-mint/20 rounded-2xl p-6 text-center">
						<p class="text-xl font-bold mb-2">Try this! 🌿</p>
						<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{fact.real_world_mission}</p>
					</div>
				</div>
			{:else if section}
				<div class="bg-butter/20 rounded-2xl p-6 min-h-[220px] flex flex-col justify-center">
					<SectionRenderer {section} language={$language ?? 'en'} />
				</div>
			{/if}
		</div>

		<div class="flex items-center justify-between mt-6">
			<button
				onclick={prev}
				disabled={stepIndex === 0}
				class="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Previous"
			>
				<ChevronLeft size={32} />
			</button>

			{#if onClosing}
				<button onclick={done} class="px-8 py-4 rounded-full bg-mint font-bold text-xl min-h-[64px]">
					Done!
				</button>
			{:else}
				<span class="text-lg text-gray-400">{stepIndex + 1} / {fact.sections.length}</span>
			{/if}

			<button
				onclick={next}
				disabled={onClosing}
				class="w-16 h-16 flex items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
				aria-label="Next"
			>
				<ChevronRight size={32} />
			</button>
		</div>
	{:else if notFound}
		<div class="flex-1 flex flex-col items-center justify-center text-center">
			<p class="text-2xl font-bold mb-6">Hmm, we can't find that fact.</p>
			<a
				href="/facts"
				class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold min-h-[64px] flex items-center"
			>
				Back to Why?
			</a>
		</div>
	{:else}
		<p class="text-center text-gray-400 mt-12 text-xl">Loading...</p>
	{/if}
</div>
