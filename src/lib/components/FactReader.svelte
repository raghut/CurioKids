<script lang="ts">
	import SectionRenderer from '$lib/components/SectionRenderer.svelte';
	import FactScene from '$lib/components/FactScene.svelte';
	import { swipe } from '$lib/actions/swipe';
	import { scrollHint } from '$lib/actions/scrollHint';
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
	// The title is the question being asked, so it is big only on the first step. After
	// that it shrinks to a one-line reminder and the picture and words get the screen.
	const first = $derived(stepIndex === 0);

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

<!-- Sized by its host to the visible screen: the arrows sit in a fixed bottom row and
     only the words scroll if a step is too long, so nothing hides under a browser bar. -->
<div class="flex min-h-0 flex-1 flex-col">
	<div class="mb-3 flex shrink-0 items-start gap-2">
		<h2
			class="min-w-0 flex-1 {first
				? `pt-2 text-3xl font-bold ${te ? 'leading-[1.6]' : 'leading-tight'}`
				: 'truncate pt-5 text-lg text-gray-500'}"
			lang={te ? 'te' : undefined}
		>
			{title}
		</h2>
		{#if showClose}
			<a
				href={closeHref}
				class="-mr-3 flex h-16 w-16 shrink-0 items-center justify-center rounded-full hover:bg-gray-100"
				aria-label="Close"
			>
				<X size={28} strokeWidth={1.5} />
			</a>
		{/if}
	</div>

	{#if scene && showScene}
		<div class="mb-3 aspect-[680/360] max-h-[40dvh] w-full shrink-0 overflow-hidden rounded-2xl">
			<FactScene sceneId={scene.id} layers={sceneLayers} />
		</div>
	{/if}

	<div class="flex min-h-0 flex-1 flex-col justify-center" use:swipe={{ onLeft: next, onRight: prev }}>
		{#if onClosing}
			<div class="flex min-h-0 flex-col gap-4 overflow-y-auto" use:scrollHint>
				<div class="rounded-2xl bg-sky-blue/20 p-5 text-center">
					<p class="mb-2 text-xl font-bold">Think about it 💭</p>
					<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{reflectionQuestion}</p>
				</div>
				<div class="rounded-2xl bg-mint/20 p-5 text-center">
					<p class="mb-2 text-xl font-bold">Try this! 🌿</p>
					<p class="text-2xl {lead}" lang={te ? 'te' : undefined}>{realWorldMission}</p>
				</div>
			</div>
		{:else if section}
			<div class="min-h-0 overflow-y-auto rounded-2xl bg-butter/20 p-5" use:scrollHint>
				<SectionRenderer {section} {language} />
			</div>
		{/if}
	</div>

	<div class="mt-3 flex shrink-0 items-center justify-between">
		<button
			onclick={prev}
			disabled={stepIndex === 0}
			class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
			aria-label="Previous"
		>
			<ChevronLeft size={32} />
		</button>

		{#if onClosing}
			<button
				onclick={() => onDone?.()}
				class="min-h-[64px] rounded-full bg-mint px-8 py-4 text-xl font-bold"
			>
				{doneLabel}
			</button>
		{:else}
			<span class="text-lg text-gray-400">{stepIndex + 1} / {sections.length}</span>
		{/if}

		<button
			onclick={next}
			disabled={onClosing}
			class="flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 disabled:opacity-30"
			aria-label="Next"
		>
			<ChevronRight size={32} />
		</button>
	</div>
</div>
