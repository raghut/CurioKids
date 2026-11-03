<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, Smartphone, Monitor } from 'lucide-svelte';
	import FactReader from '$lib/components/FactReader.svelte';
	import StatusChip from '$lib/components/admin/StatusChip.svelte';
	import type { Language } from '$lib/types';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const LANG_NAME: Record<Language, string> = { en: 'English', te: 'Telugu' };

	let view = $state<'mobile' | 'desktop'>('mobile');
	// Which language the operator is looking at; the first one the fact actually has.
	let lang = $state<Language>(untrack(() => data.languages[0] ?? 'en'));
	let finished = $state(false);
	let reader = $state<ReturnType<typeof FactReader> | null>(null);

	const fact = $derived(data.facts[lang] ?? null);

	// An operator previewing must never write to a child's progress, so Done just
	// rewinds and says so.
	function onDone() {
		finished = true;
		reader?.reset();
	}

	function pick(l: Language) {
		lang = l;
		finished = false;
	}

	const tab = 'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold';
</script>

<svelte:head><title>CurioKids Admin — Preview: {data.topic}</title></svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Admin chrome; everything below the bar is what a child sees. -->
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<div class="flex flex-wrap items-center gap-3">
			<a
				href="/admin/facts/{data.id}"
				class="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
			>
				<ArrowLeft size={16} strokeWidth={1.5} /> Edit
			</a>
			<span class="font-semibold text-slate-700">{data.topic}</span>
			<StatusChip status={data.status} />
		</div>

		<div class="flex flex-wrap items-center gap-2">
			<!-- One row holds every language, so the preview has to say which one it is
			     showing. The machine-written Telugu is the main reason to look here. -->
			{#if data.languages.length > 1}
				<div class="flex gap-1 rounded-xl bg-slate-100 p-1">
					{#each data.languages as l (l)}
						<button
							type="button"
							onclick={() => pick(l)}
							class="{tab} {lang === l ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}"
						>
							{LANG_NAME[l]}
						</button>
					{/each}
				</div>
			{:else if data.languages.length === 1}
				<span class="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-500">
					{LANG_NAME[data.languages[0]]}
				</span>
			{/if}

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
	</div>

	<p class="mb-3 text-xs text-slate-400">
		This is the child's screen. Nothing here records progress.
	</p>

	{#if finished}
		<p class="mb-3 rounded-lg bg-mint/25 px-4 py-2 text-sm text-emerald-900" role="status">
			That's the end of the fact — back to the first screen.
		</p>
	{/if}

	{#if !fact}
		<p class="rounded-lg bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
			This fact has no words in any language yet. Write or generate one on the
			<a href="/admin/facts/{data.id}" class="font-semibold underline">edit page</a> first.
		</p>
	{:else}
		<!-- Mobile: a phone-width frame, which is how the app is actually held.
		     Desktop: the same reader at full content width. -->
		<div class={view === 'mobile' ? 'flex justify-center rounded-2xl bg-slate-100 p-6' : ''}>
			<div
				class={view === 'mobile'
					? 'w-full max-w-[390px] overflow-hidden rounded-[2rem] border-8 border-slate-800 bg-white shadow-xl'
					: 'rounded-2xl border border-slate-200 bg-white shadow-sm'}
			>
				<div class="flex min-h-[600px] flex-col bg-white p-6">
					<!-- Keyed on the language so switching restarts at screen 1 instead of
					     landing mid-fact in the other language. -->
					{#key lang}
						<FactReader
							bind:this={reader}
							title={fact.title}
							sections={fact.sections}
							reflectionQuestion={fact.reflection_question}
							realWorldMission={fact.real_world_mission}
							language={lang}
							closeHref="/admin/facts/{data.id}"
							doneLabel="Done!"
							{onDone}
						/>
					{/key}
				</div>
			</div>
		</div>
	{/if}
</div>
