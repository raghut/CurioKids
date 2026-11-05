<script lang="ts">
	import type { AdminStorySummary } from '$lib/types';
	import FilterBar from '$lib/components/admin/FilterBar.svelte';
	import StoryTable from '$lib/components/admin/StoryTable.svelte';
	import StoryCardList from '$lib/components/admin/StoryCardList.svelte';
	import ConfirmDialog from '$lib/components/admin/ConfirmDialog.svelte';
	import { invalidateAll, goto } from '$app/navigation';

	let { data } = $props();

	let search = $state('');
	let status = $state<'all' | 'draft' | 'published'>('all');
	let language = $state<'all' | 'en' | 'te'>('all');

	let busy = $state(false);
	let errorMsg = $state('');

	// Delete confirm
	let confirmOpen = $state(false);
	let pendingDelete = $state<AdminStorySummary | null>(null);

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

	function preview(s: AdminStorySummary) {
		goto(`/admin/stories/${s.id}/preview`);
	}
</script>

<svelte:head><title>CurioKids Admin — Stories</title></svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-6 flex items-center justify-between gap-3">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Stories</h1>
		<div class="flex items-center gap-3">
			<span class="hidden text-sm text-slate-500 sm:inline">{filtered.length} shown</span>
			<a
				href="/admin/stories/import"
				class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
			>
				Import
			</a>
			<a href="/admin/create" class="rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white hover:brightness-105">+ New story</a>
		</div>
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
