<script lang="ts">
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import { swipe } from '$lib/actions/swipe';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import type { FactScene as Scene, FactSection, Language } from '$lib/types';

	/**
	 * The child's "Why?" experience: one section at a time, then a closing screen with the
	 * reflection question and the mission. Shared by the kid route and the admin preview so
	 * the preview cannot drift from what a child actually sees. Holds no data loading,
	 * progress or navigation — those stay with whichever route uses it.
	 */
	let {
		title,
		sections = [],
		reflectionQuestion = '',
		realWorldMission = '',
		language = 'en',
		closeHref = '/facts',
		showClose = true,
		doneLabel = 'Done!',
		scene,
		onDone
	}: {
		title: string;
		sections?: FactSection[];
		reflectionQuestion?: string;
		realWorldMission?: string;
		language?: Language;
		closeHref?: string;
		/** Off when the host route draws its own header. */
		showClose?: boolean;
		doneLabel?: string;
		/** Optional animated scene; replaces per-section pictures when present. */
		scene?: Scene;
		onDone?: () => void;
	} = $props();

	let stepIndex = $state(0);

	// One step per section, plus a final closing screen.
	const stepCount = $derived(sections.length + 1);
	const onClosing = $derived(stepIndex === sections.length);
	const section = $derived(!onClosing ? sections[stepIndex] : null);

	// The scene stays mounted across steps, so its layers fade instead of the whole
	// picture blinking. The closing screen keeps the last section's layers.
	const sceneLayers = $derived(
		scene ? (scene.section_layers[Math.min(stepIndex, sections.length - 1)] ?? []) : []
	);

	// A fun-facts list and the closing screen are the two tallest steps; with any scene
	// above them the arrows fell off a 390x844 phone (measured across all 11 facts), so
	// those two steps show the words alone.
	const showScene = $derived(!onClosing && section?.type !== 'fun_facts');

	const te = $derived(language === 'te');
	const lead = $derived(te ? 'leading-[1.6]' : 'leading-relaxed');

	export function reset() {
		stepIndex = 0;
	}

	function next() {
		if (stepIndex < stepCount - 1) stepIndex++;
	}
	function prev() {
		if (stepIndex > 0) stepIndex--;
	}
</script>

<div class="flex-1 flex flex-col">
	{#if showClose}
		<header class="flex justify-end mb-4">
			<a
				href={closeHref}
				class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
				aria-label="Close"
			>
				<X size={28} strokeWidth={1.5} />
			</a>
		</header>
	{/if}

	<h2 class="text-3xl font-bold mb-4" lang={te ? 'te' : undefined}>{title}</h2>

	{#if scene && showScene}
		<div
			class="mx-auto mb-4 aspect-[680/360] w-full overflow-hidden rounded-2xl"
		>
			<FactScene sceneId={scene.id} layers={sceneLayers} />
		</div>
	{/if}

	<div class="flex-1 flex flex-col justify-center" use:swipe={{ onLeft: next, onRight: prev }}>
		{#if onClosing}
			<div class="flex flex-col gap-4">
				<div class="bg-sky-blue/20 rounded-2xl p-6 text-center">
					<p class="text-xl font-bold mb-2">Think about it 💭</p>
					<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{reflectionQuestion}</p>
				</div>
				<div class="bg-mint/20 rounded-2xl p-6 text-center">
					<p class="text-xl font-bold mb-2">Try this! 🌿</p>
					<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{realWorldMission}</p>
				</div>
			</div>
		{:else if section}
			<!-- Shorter with a scene above it, so the arrows stay on a phone screen. -->
			<div
				class="bg-butter/20 rounded-2xl p-6 {scene
					? 'min-h-[160px]'
					: 'min-h-[220px]'} flex flex-col justify-center"
			>
				<SectionRenderer {section} {language} />
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
			<button
				onclick={() => onDone?.()}
				class="px-8 py-4 rounded-full bg-mint font-bold text-xl min-h-[64px]"
			>
				{doneLabel}
			</button>
		{:else}
			<span class="text-lg text-gray-400">{stepIndex + 1} / {sections.length}</span>
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
</div>
