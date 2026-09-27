<script lang="ts">
	import type { AdminStorySummary } from '$lib/types';
	import StatusChip from './StatusChip.svelte';
	import { Eye, Send, EyeOff, Trash2, Pencil } from 'lucide-svelte';
	let {
		stories,
		onpreview,
		ontoggle,
		ondelete
	}: {
		stories: AdminStorySummary[];
		onpreview: (s: AdminStorySummary) => void;
		ontoggle: (s: AdminStorySummary) => void;
		ondelete: (s: AdminStorySummary) => void;
	} = $props();
	const iconBtn = 'grid h-9 w-9 place-items-center rounded-lg text-slate-500 hover:bg-slate-100';
</script>

<div class="hidden overflow-x-auto rounded-xl ring-1 ring-slate-200 md:block">
	<table class="w-full min-w-[720px] border-collapse text-left text-sm">
		<thead class="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
			<tr>
				<th class="px-4 py-3 font-semibold">Story</th>
				<th class="px-4 py-3 font-semibold">Lang</th>
				<th class="px-4 py-3 font-semibold">Character</th>
				<th class="px-4 py-3 font-semibold">Theme</th>
				<th class="px-4 py-3 font-semibold">Status</th>
				<th class="px-4 py-3 text-right font-semibold">Actions</th>
			</tr>
		</thead>
		<tbody class="divide-y divide-slate-100">
			{#each stories as s (s.id)}
				<tr class="hover:bg-slate-50/70">
					<td class="px-4 py-3">
						<div class="flex items-center gap-3">
							{#if s.cover_url}
								<img src={s.cover_url} alt="" class="h-10 w-10 shrink-0 rounded-md object-cover" />
							{:else}
								<div class="h-10 w-10 shrink-0 rounded-md bg-slate-200"></div>
							{/if}
							<span class="font-semibold text-slate-800">{s.title}</span>
						</div>
					</td>
					<td class="px-4 py-3 uppercase text-slate-500">{s.language}</td>
					<td class="px-4 py-3 text-slate-600">{s.character_id}</td>
					<td class="px-4 py-3 text-slate-600">{s.theme_id}</td>
					<td class="px-4 py-3"><StatusChip status={s.status} /></td>
					<td class="px-4 py-3">
						<div class="flex justify-end gap-1">
							<a class={iconBtn} title="Edit pages" aria-label="Edit pages" href="/admin/stories/{s.id}">
								<Pencil size={17} strokeWidth={1.5} />
							</a>
							<button class={iconBtn} title="Preview" aria-label="Preview" onclick={() => onpreview(s)}>
								<Eye size={17} strokeWidth={1.5} />
							</button>
							<button
								class={iconBtn}
								title={s.status === 'published' ? 'Unpublish' : 'Publish'}
								aria-label={s.status === 'published' ? 'Unpublish' : 'Publish'}
								onclick={() => ontoggle(s)}
							>
								{#if s.status === 'published'}
									<EyeOff size={17} strokeWidth={1.5} />
								{:else}
									<Send size={17} strokeWidth={1.5} />
								{/if}
							</button>
							<button class="{iconBtn} hover:text-coral" title="Delete" aria-label="Delete" onclick={() => ondelete(s)}>
								<Trash2 size={17} strokeWidth={1.5} />
							</button>
						</div>
					</td>
				</tr>
			{/each}
		</tbody>
	</table>
</div>
