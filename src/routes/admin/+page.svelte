<script lang="ts">
	import type { AdminStorySummary, GeneratedStory } from '$lib/types';
	import FilterBar from '$lib/components/admin/FilterBar.svelte';
	import StoryTable from '$lib/components/admin/StoryTable.svelte';
	import StoryCardList from '$lib/components/admin/StoryCardList.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import { invalidateAll } from '$app/navigation';
	import { X } from 'lucide-svelte';

	let { data } = $props();

	let search = $state('');
	let status = $state<'all' | 'draft' | 'published'>('all');
	let language = $state<'all' | 'en' | 'te'>('all');

	let busy = $state(false);
	let errorMsg = $state('');

	// Delete confirm
	let confirmOpen = $state(false);
	let pendingDelete = $state<AdminStorySummary | null>(null);

	// Preview
	let previewStory = $state<GeneratedStory | null>(null);
	let previewLoading = $state(false);

	const filtered = $derived(
		(data.stories as AdminStorySummary[]).filter((s) => {
			if (status !== 'all' && s.status !== status) return false;
			if (language !== 'all' && s.language !== language) return false;
			if (search.trim() && !s.title.toLowerCase().includes(search.trim().toLowerCase())) return false;
			return true;
		})
	);

	async function toggle(s: AdminStorySummary) {
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/stories/${s.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: s.status === 'published' ? 'unpublish' : 'publish' })
			});
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not update that story. Try again.';
		} finally {
			busy = false;
		}
	}

	function askDelete(s: AdminStorySummary) {
		pendingDelete = s;
		confirmOpen = true;
	}

	async function doDelete() {
		if (!pendingDelete) return;
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/stories/${pendingDelete.id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not delete that story. Try again.';
		} finally {
			busy = false;
			pendingDelete = null;
		}
	}

	async function preview(s: AdminStorySummary) {
		previewLoading = true;
		previewStory = null;
		try {
			// Admin preview endpoint returns any status (drafts included).
			const res = await fetch(`/api/admin/stories/${s.id}?preview=1`);
			if (res.ok) previewStory = (await res.json()).story ?? null;
		} finally {
			previewLoading = false;
		}
	}
</script>

<svelte:head><title>CurioKids Admin — Stories</title></svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-6 flex items-center justify-between">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Stories</h1>
		<span class="text-sm text-slate-500">{filtered.length} shown</span>
	</div>

	<div class="mb-4">
		<FilterBar bind:search bind:status bind:language />
	</div>

	{#if errorMsg}
		<p class="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">{errorMsg}</p>
	{/if}

	{#if data.loadError}
		<p class="rounded-lg bg-slate-100 px-4 py-6 text-center text-slate-500">
			Couldn’t load stories. Refresh to try again.
		</p>
	{:else if filtered.length === 0}
		<p class="rounded-lg bg-slate-100 px-4 py-10 text-center text-slate-500">No stories match.</p>
	{:else}
		<div class:opacity-60={busy} class:pointer-events-none={busy}>
			<StoryTable stories={filtered} onpreview={preview} ontoggle={toggle} ondelete={askDelete} />
			<StoryCardList stories={filtered} onpreview={preview} ontoggle={toggle} ondelete={askDelete} />
		</div>
	{/if}
</div>

<ConfirmDialog
	bind:open={confirmOpen}
	title="Delete this story?"
	message="This permanently removes the story and its images. This cannot be undone."
	confirmLabel="Delete"
	destructive
	onconfirm={doDelete}
/>

{#if previewLoading || previewStory}
	<div class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4">
		<div class="my-8 w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
			<div class="mb-3 flex items-center justify-between">
				<h2 class="text-lg font-bold text-slate-800">Preview</h2>
				<button
					aria-label="Close preview"
					class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
					onclick={() => (previewStory = null)}
				>
					<X size={18} strokeWidth={1.5} />
				</button>
			</div>
			{#if previewLoading}
				<p class="py-8 text-center text-slate-400">Loading…</p>
			{:else if previewStory}
				{#if previewStory.cover_image_url}
					<img src={previewStory.cover_image_url} alt="" class="mb-4 w-full rounded-xl object-cover" />
				{/if}
				<h3 class="mb-3 font-[family-name:var(--font-fraunces)] text-xl font-bold" lang={previewStory.language}>
					{previewStory.title}
				</h3>
				<div class="flex flex-col gap-4">
					{#each previewStory.pages as p, i (i)}
						<p class="text-base leading-relaxed text-slate-700" lang={previewStory.language}>{p.text}</p>
					{/each}
				</div>
				<p class="mt-4 rounded-lg bg-mint/20 px-3 py-2 text-sm text-slate-700" lang={previewStory.language}>
					{previewStory.moral}
				</p>
			{/if}
		</div>
	</div>
{/if}
