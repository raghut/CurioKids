<script lang="ts">
	import { enhance } from '$app/forms';
	import { ArrowLeft, RotateCcw, Eye, Lock } from 'lucide-svelte';
	import type { PageData, ActionData } from './$types';
	import type { AgeBand } from '$lib/types';

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let activeBand = $state<AgeBand>('2-4');
	const active = $derived(data.bands.find((b) => b.band === activeBand) ?? data.bands[0]);

	// Which template the last action concerned, so a message lands next to the right box.
	const touched = $derived(
		form && 'band' in form && form.band ? `${form.band}:${form.kind}` : (form?.saved ?? form?.reset ?? null)
	);
	const previewFor = $derived(form && 'preview' in form ? `${form.band}:${form.kind}` : null);

	function when(iso: string | null) {
		if (!iso) return '';
		return new Date(iso).toLocaleString();
	}

	const textareaClass =
		'w-full rounded-lg border border-slate-300 p-3 font-mono text-xs leading-relaxed outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';
</script>

<svelte:head><title>CurioKids Admin — Prompts</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/admin" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700">
		<ArrowLeft size={16} strokeWidth={1.5} /> Stories
	</a>
	<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Prompts</h1>
	<p class="mb-6 mt-1 text-sm text-slate-500">
		What gets sent to the model for each age band. Edits take effect on the next story you generate.
		The greyed-out block under each box is always sent and can't be changed.
	</p>

	{#if data.loadError}
		<p class="mb-6 rounded-lg bg-butter-yellow/40 px-4 py-3 text-sm text-slate-700" role="alert">
			Couldn't read saved prompts — showing the built-in defaults. If this is the first time, run
			<code class="font-mono">npm run db:init</code> to create the table.
		</p>
	{/if}

	<!-- Age band tabs -->
	<div class="mb-6 flex gap-2">
		{#each data.bands as b (b.band)}
			<button
				type="button"
				onclick={() => (activeBand = b.band)}
				class="rounded-lg px-4 py-2 text-sm font-bold {activeBand === b.band
					? 'bg-coral/15 text-coral'
					: 'bg-slate-100 text-slate-500 hover:bg-slate-200'}"
			>
				{b.band.replace('-', '–')}
			</button>
		{/each}
	</div>

	<div class="flex flex-col gap-8">
		{#each active.templates as t (t.kind)}
			{@const id = `${active.band}:${t.kind}`}
			<section class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
				<div class="mb-3 flex flex-wrap items-center justify-between gap-2">
					<h2 class="font-bold text-slate-800">{t.label}</h2>
					{#if t.isDefault}
						<span class="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">Using default</span>
					{:else}
						<span class="rounded-full bg-mint/30 px-2.5 py-1 text-xs font-semibold text-emerald-900">
							Edited {when(t.editedAt)}
						</span>
					{/if}
				</div>

				<form method="POST" use:enhance class="flex flex-col gap-3">
					<input type="hidden" name="band" value={active.band} />
					<input type="hidden" name="kind" value={t.kind} />

					<textarea
						name="body"
						rows={t.kind === 'story_user' ? 18 : t.kind === 'story_system' ? 3 : 5}
						class={textareaClass}
						value={touched === id && form && 'body' in form && form.body ? form.body : t.body}
					></textarea>

					<p class="text-xs text-slate-400">
						Placeholders:
						{#each t.vars as v, i (v)}<code class="font-mono text-slate-500">{'{{' + v + '}}'}</code>{#if i < t.vars.length - 1}, {/if}{/each}
					</p>

					<details class="rounded-lg bg-slate-50 p-3">
						<summary class="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-slate-500">
							<Lock size={13} strokeWidth={1.5} /> Always sent (not editable)
						</summary>
						<pre class="mt-2 whitespace-pre-wrap font-mono text-xs text-slate-400">{t.locked}</pre>
					</details>

					{#if touched === id && form?.error}
						<p class="text-sm text-coral" role="alert">{form.error}</p>
					{/if}
					{#if form?.saved === id}
						<p class="text-sm text-emerald-700" role="status">Saved.</p>
					{/if}
					{#if form?.reset === id}
						<p class="text-sm text-emerald-700" role="status">Back to the default.</p>
					{/if}

					{#if previewFor === id && form && 'preview' in form}
						<div class="rounded-lg bg-slate-900 p-3">
							<p class="mb-2 text-xs font-semibold text-slate-400">Exactly what the model receives:</p>
							<pre class="whitespace-pre-wrap font-mono text-xs text-slate-100">{form.preview}</pre>
						</div>
					{/if}

					<div class="flex flex-wrap gap-2">
						<button
							type="submit"
							formaction="?/save"
							class="rounded-xl bg-coral px-5 py-2.5 text-sm font-bold text-white hover:brightness-105"
						>
							Save
						</button>
						<button
							type="submit"
							formaction="?/preview"
							class="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
						>
							<Eye size={15} strokeWidth={1.5} /> Preview
						</button>
						{#if !t.isDefault}
							<button
								type="submit"
								formaction="?/reset"
								class="inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-slate-600"
							>
								<RotateCcw size={15} strokeWidth={1.5} /> Reset to default
							</button>
						{/if}
					</div>
				</form>
			</section>
		{/each}
	</div>
</div>
