<script lang="ts">
	import { ArrowLeft, Smartphone, Monitor } from 'lucide-svelte';
	import StoryReader from '$lib/components/StoryReader.svelte';
	import StatusChip from '$lib/components/admin/StatusChip.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
	const story = $derived(data.story);

	let view = $state<'mobile' | 'desktop'>('mobile');
	let finished = $state(false);
	let reader = $state<ReturnType<typeof StoryReader> | null>(null);

	// An operator previewing must never write to a child's progress, so Done just
	// rewinds and says so.
	function onDone() {
		finished = true;
		reader?.reset();
	}

	const tab = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';
</script>

<svelte:head><title>CurioKids Admin — Preview: {story.title}</title></svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Admin chrome; everything below the bar is what a child sees. -->
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<a
				href="/admin/stories/{story.id}"
				class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
			>
				<ArrowLeft size={16} strokeWidth={1.5} /> Edit
			</a>
			<span class="font-semibold text-slate-700" lang={story.language}>{story.title}</span>
			<StatusChip status={story.status} />
		</div>

		<div class="flex gap-1 rounded-xl bg-slate-100 p-1">
			<button
				type="button"
				onclick={() => (view = 'mobile')}
				class="{tab} {view === 'mobile' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}"
			>
				<Smartphone size={15} strokeWidth={1.5} /> Mobile
			</button>
			<button
				type="button"
				onclick={() => (view = 'desktop')}
				class="{tab} {view === 'desktop' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}"
			>
				<Monitor size={15} strokeWidth={1.5} /> Desktop
			</button>
		</div>
	</div>

	<p class="mb-3 text-xs text-slate-400">
		This is the child's screen. Nothing here records progress.
	</p>

	{#if finished}
		<p class="mb-3 rounded-lg bg-mint/25 px-4 py-2 text-sm text-emerald-900" role="status">
			That's the end of the story — back to page 1.
		</p>
	{/if}

	<!-- Mobile: a phone-width frame, which is how the app is actually held.
	     Desktop: the same reader at full content width. -->
	<div class={view === 'mobile' ? 'flex justify-center rounded-2xl bg-slate-100 p-6' : ''}>
		<div
			class={view === 'mobile'
				? 'w-full max-w-[390px] overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-white shadow-xl'
				: 'rounded-2xl border border-slate-200 bg-white shadow-sm'}
		>
			<div class="flex {view === 'mobile' ? 'h-[700px]' : 'min-h-[600px]'} flex-col bg-white px-6 pt-4 pb-4">
				<StoryReader
					bind:this={reader}
					title={story.title}
					pages={story.pages}
					moral={story.moral}
					language={story.language}
					closeHref="/admin/stories/{story.id}"
					doneLabel="Done!"
					scene={story.scene}
					{onDone}
				/>
			</div>
		</div>
	</div>
</div>
