<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, RefreshCw, Save, ExternalLink } from 'lucide-svelte';
	import StatusChip from '$lib/components/admin/StatusChip.svelte';
	import type { PageData } from './$types';
	import type { GeneratedStory } from '$lib/types';

	let { data }: { data: PageData } = $props();

	// Local working copy so edits survive re-render; the server stays the source of truth.
	// untrack makes the "initial value only" intent explicit — these are edited in place
	// and must not be clobbered when `data` changes.
	let story = $state<GeneratedStory>(untrack(() => structuredClone(data.story)));
	const COVER = -1;

	let coverPrompt = $state(untrack(() => data.story.cover_prompt ?? ''));
	let pageTexts = $state(untrack(() => data.story.pages.map((p) => p.text)));
	let pagePrompts = $state(untrack(() => data.story.pages.map((p) => p.image_prompt ?? '')));

	// Keyed by page index (-1 = cover) so each block reports its own state.
	let busy = $state<Record<number, 'text' | 'image' | null>>({});
	let note = $state<Record<number, { kind: 'ok' | 'err'; text: string } | null>>({});

	async function send(index: number, payload: Record<string, unknown>, what: 'text' | 'image') {
		busy = { ...busy, [index]: what };
		note = { ...note, [index]: null };
		try {
			const res = await fetch(`/api/admin/stories/${story.id}/page`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ index, ...payload })
			});
			const body = await res.json();
			if (!res.ok) {
				note = { ...note, [index]: { kind: 'err', text: body?.message ?? 'That did not work.' } };
				return;
			}
			if (what === 'image') {
				if (index === COVER) story.cover_image_url = body.image_url;
				else story.pages[index] = { ...story.pages[index], image_url: body.image_url };
				note = { ...note, [index]: { kind: 'ok', text: 'New picture saved.' } };
			} else {
				story.pages[index] = { ...story.pages[index], text: body.text };
				note = { ...note, [index]: { kind: 'ok', text: 'Text saved.' } };
			}
		} catch {
			note = { ...note, [index]: { kind: 'err', text: 'Could not reach the server.' } };
		} finally {
			busy = { ...busy, [index]: null };
		}
	}

	const saveText = (i: number) => send(i, { action: 'text', text: pageTexts[i] }, 'text');
	const regen = (i: number, prompt: string) => send(i, { action: 'image', prompt }, 'image');

	const inputClass =
		'w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';
	const promptClass = inputClass + ' font-mono text-xs leading-relaxed';
	const btn = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';
</script>

<svelte:head><title>CurioKids Admin — {story.title}</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a href="/admin" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700">
		<ArrowLeft size={16} strokeWidth={1.5} /> Stories
	</a>

	<div class="mb-1 flex flex-wrap items-center gap-3">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800" lang={story.language}>
			{story.title}
		</h1>
		<StatusChip status={story.status} />
	</div>
	<p class="mb-6 text-sm text-slate-500">
		{story.age_tag} · {story.language.toUpperCase()} · {story.character_id} · {story.theme_id}
		{#if story.status === 'published'}
			· <a href="/stories/{story.id}" class="inline-flex items-center gap-1 underline">
				view as a child <ExternalLink size={12} strokeWidth={1.5} />
			</a>
		{/if}
	</p>

	<!-- Cover -->
	<section class="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
		<h2 class="mb-3 font-bold text-slate-800">Cover</h2>
		{#if story.cover_image_url}
			<img src={story.cover_image_url} alt="" class="mb-3 w-full rounded-xl object-cover" />
		{:else}
			<p class="mb-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">No cover image.</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="text-xs font-bold text-slate-600">Picture prompt</span>
			<textarea bind:value={coverPrompt} rows="4" class={promptClass}
				placeholder="Describe the cover picture…"></textarea>
		</label>
		{#if !data.story.cover_prompt}
			<p class="mt-1 text-xs text-slate-400">
				This story was made before prompts were saved — write one to regenerate the cover.
			</p>
		{/if}

		{#if note[COVER]}
			<p class="mt-2 text-sm {note[COVER]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}" role="status">
				{note[COVER]?.text}
			</p>
		{/if}

		<button onclick={() => regen(COVER, coverPrompt)} disabled={busy[COVER] === 'image'}
			class="{btn} mt-3 bg-slate-100 text-slate-700 hover:bg-slate-200">
			<RefreshCw size={15} strokeWidth={1.5} />
			{busy[COVER] === 'image' ? 'Making the picture…' : 'Regenerate cover'}
		</button>
	</section>

	<!-- Pages -->
	{#each story.pages as p, i (i)}
		<section class="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
			<h2 class="mb-3 font-bold text-slate-800">Page {i + 1}</h2>

			{#if p.image_url}
				<img src={p.image_url} alt="" class="mb-3 w-full rounded-xl object-cover" />
			{:else}
				<p class="mb-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">
					No picture on this page.
				</p>
			{/if}

			<label class="flex flex-col gap-1.5">
				<span class="text-xs font-bold text-slate-600">Page text</span>
				<textarea bind:value={pageTexts[i]} rows="3" class={inputClass} lang={story.language}></textarea>
			</label>
			<button onclick={() => saveText(i)} disabled={busy[i] === 'text'}
				class="{btn} mt-2 bg-mint text-emerald-900 hover:brightness-105">
				<Save size={15} strokeWidth={1.5} />
				{busy[i] === 'text' ? 'Saving…' : 'Save text'}
			</button>

			<label class="mt-4 flex flex-col gap-1.5">
				<span class="text-xs font-bold text-slate-600">Picture prompt</span>
				<textarea bind:value={pagePrompts[i]} rows="4" class={promptClass}
					placeholder="Describe this page's picture…"></textarea>
			</label>

			{#if note[i]}
				<p class="mt-2 text-sm {note[i]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}" role="status">
					{note[i]?.text}
				</p>
			{/if}

			<button onclick={() => regen(i, pagePrompts[i])} disabled={busy[i] === 'image'}
				class="{btn} mt-3 bg-slate-100 text-slate-700 hover:bg-slate-200">
				<RefreshCw size={15} strokeWidth={1.5} />
				{busy[i] === 'image' ? 'Making the picture…' : 'Regenerate picture'}
			</button>
		</section>
	{/each}

	<p class="mb-10 text-xs text-slate-400">
		Text saves are free. Each regenerated picture is a fresh image generation — roughly ₹4 — and
		replaces the old one.
	</p>
</div>
