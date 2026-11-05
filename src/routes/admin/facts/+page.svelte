<script lang="ts">
	import type { AdminFactSummary } from '$lib/types';
	import StatusChip from '$lib/components/admin/StatusChip.svelte';
	import { invalidateAll } from '$app/navigation';
	import { Trash2, Send, Eye, EyeOff, Pencil } from 'lucide-svelte';

	let { data } = $props();

	let busy = $state(false);
	let errorMsg = $state('');
	let pendingDeleteId = $state<string | null>(null);

	async function toggle(f: AdminFactSummary) {
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/facts/${f.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: f.status === 'published' ? 'unpublish' : 'publish' })
			});
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not update that fact. Try again.';
		} finally {
			busy = false;
		}
	}

	function askDelete(id: string) {
		pendingDeleteId = id;
	}

	function cancelDelete() {
		pendingDeleteId = null;
	}

	async function doDelete(id: string) {
		busy = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/admin/facts/${id}`, { method: 'DELETE' });
			if (!res.ok) throw new Error();
			await invalidateAll();
		} catch {
			errorMsg = 'Could not delete that fact. Try again.';
		} finally {
			busy = false;
			pendingDeleteId = null;
		}
	}
</script>

<svelte:head><title>CurioKids Admin — Facts</title></svelte:head>

<div class="mx-auto max-w-5xl">
	<div class="mb-6 flex items-center justify-between gap-3">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Facts</h1>
		<div class="flex items-center gap-3">
			<span class="hidden text-sm text-slate-500 sm:inline">{data.facts.length} shown</span>
			<a
				href="/admin/facts/import"
				class="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
			>
				Import
			</a>
			<a
				href="/admin/facts/create"
				class="rounded-xl bg-coral px-4 py-2 text-sm font-bold text-white hover:brightness-105"
			>
				+ New fact
			</a>
		</div>
	</div>

	{#if errorMsg}
		<p class="mb-3 rounded-lg bg-coral/10 px-3 py-2 text-sm text-coral" role="alert">{errorMsg}</p>
	{/if}

	{#if data.loadError}
		<p class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
			Could not read saved facts. Has <code>npm run db:init</code> been run?
		</p>
	{:else if data.facts.length === 0}
		<p class="rounded-lg bg-slate-100 px-4 py-10 text-center text-slate-500">
			No facts yet. Create one to get started.
		</p>
	{:else}
		<div class:opacity-60={busy} class:pointer-events-none={busy}>
			<!-- Desktop table -->
			<div class="hidden overflow-x-auto rounded-xl ring-1 ring-slate-200 md:block">
				<table class="w-full min-w-[720px] border-collapse text-left text-sm">
					<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
						<tr>
							<th class="px-4 py-3 font-semibold">Fact</th>
							<th class="px-4 py-3 font-semibold">Languages</th>
							<th class="px-4 py-3 font-semibold">Screens</th>
							<th class="px-4 py-3 font-semibold">Status</th>
							<th class="px-4 py-3 text-right font-semibold">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-slate-100">
						{#each data.facts as f (f.id)}
							<tr class="hover:bg-slate-50/70">
								<td class="px-4 py-3">
									<div class="flex items-center gap-3">
										{#if f.cover_url}
											<img src={f.cover_url} alt="" class="h-10 w-10 shrink-0 rounded-md object-cover" />
										{:else}
											<div
												class="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-slate-200 text-lg"
											>
												🌿
											</div>
										{/if}
										<div class="min-w-0">
											<a
												href="/admin/facts/{f.id}"
												class="truncate font-semibold text-slate-800 hover:underline"
											>
												{f.title}
											</a>
											<p class="truncate text-xs text-slate-500">{f.topic}</p>
										</div>
									</div>
								</td>
								<td class="px-4 py-3 text-slate-600">
									{#if f.languages.length}
										{f.languages.map((l) => l.toUpperCase()).join(' · ')}
									{:else}
										<span class="text-coral">none</span>
									{/if}
								</td>
								<td class="px-4 py-3 text-slate-600">
									{f.section_count} {f.section_count === 1 ? 'screen' : 'screens'}
								</td>
								<td class="px-4 py-3"><StatusChip status={f.status} /></td>
								<td class="px-4 py-3">
									{#if pendingDeleteId === f.id}
										<div class="flex justify-end gap-2">
											<button
												class="rounded-lg bg-coral px-3 py-1.5 text-xs font-bold text-white hover:brightness-105"
												onclick={() => doDelete(f.id)}
											>
												Really delete?
											</button>
											<button
												class="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
												onclick={cancelDelete}
											>
												Cancel
											</button>
										</div>
									{:else}
										<div class="flex justify-end gap-1">
											<a
												class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
												title="Edit words and pictures"
												aria-label="Edit words and pictures"
												href="/admin/facts/{f.id}"
											>
												<Pencil size={17} strokeWidth={1.5} />
											</a>
											<a
												class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
												title="Preview"
												aria-label="Preview"
												href="/admin/facts/{f.id}/preview"
											>
												<Eye size={17} strokeWidth={1.5} />
											</a>
											<button
												class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100"
												title={f.status === 'published' ? 'Unpublish' : 'Publish'}
												aria-label={f.status === 'published' ? 'Unpublish' : 'Publish'}
												onclick={() => toggle(f)}
											>
												{#if f.status === 'published'}
													<EyeOff size={17} strokeWidth={1.5} />
												{:else}
													<Send size={17} strokeWidth={1.5} />
												{/if}
											</button>
											<button
												class="grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-coral"
												title="Delete"
												aria-label="Delete"
												onclick={() => askDelete(f.id)}
											>
												<Trash2 size={17} strokeWidth={1.5} />
											</button>
										</div>
									{/if}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Mobile cards -->
			<div class="flex flex-col gap-3 md:hidden">
				{#each data.facts as f (f.id)}
					<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
						<div class="flex items-center gap-3">
							{#if f.cover_url}
								<img src={f.cover_url} alt="" class="h-14 w-14 shrink-0 rounded-lg object-cover" />
							{:else}
								<div
									class="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-slate-200 text-2xl"
								>
									🌿
								</div>
							{/if}
							<div class="min-w-0 flex-1">
								<a href="/admin/facts/{f.id}" class="truncate font-semibold text-slate-800 hover:underline">
									{f.title}
								</a>
								<p class="text-xs text-slate-500">
									{f.topic} ·
									{#if f.languages.length}
										{f.languages.map((l) => l.toUpperCase()).join(' · ')}
									{:else}
										<span class="text-coral">no languages</span>
									{/if}
									· {f.section_count} {f.section_count === 1 ? 'screen' : 'screens'}
								</p>
								<div class="mt-1"><StatusChip status={f.status} /></div>
							</div>
						</div>
						<div class="mt-3 flex gap-2">
							{#if pendingDeleteId === f.id}
								<button
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral text-sm font-bold text-white"
									onclick={() => doDelete(f.id)}
								>
									Really delete?
								</button>
								<button
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600"
									onclick={cancelDelete}
								>
									Cancel
								</button>
							{:else}
								<a
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600"
									href="/admin/facts/{f.id}"
								>
									<Pencil size={16} strokeWidth={1.5} /> Edit
								</a>
								<a
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-100 text-sm font-semibold text-slate-600"
									href="/admin/facts/{f.id}/preview"
								>
									<Eye size={16} strokeWidth={1.5} /> Preview
								</a>
								<button
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-sky-blue/20 text-sm font-semibold text-slate-700"
									onclick={() => toggle(f)}
								>
									{#if f.status === 'published'}
										<EyeOff size={16} strokeWidth={1.5} /> Unpublish
									{:else}
										<Send size={16} strokeWidth={1.5} /> Publish
									{/if}
								</button>
								<!-- Icon-only: four labelled actions do not fit a phone row. -->
								<button
									class="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-coral/15 text-sm font-semibold text-coral"
									title="Delete"
									aria-label="Delete"
									onclick={() => askDelete(f.id)}
								>
									<Trash2 size={16} strokeWidth={1.5} />
								</button>
							{/if}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>
