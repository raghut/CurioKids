<script lang="ts">
	import CoverThumb from '$lib/components/admin/CoverThumb.svelte';
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
	const action = 'flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold';
</script>

<div class="flex flex-col gap-3 md:hidden">
	{#each stories as s (s.id)}
		<div class="rounded-xl bg-white p-3 ring-1 ring-slate-200">
			<div class="flex items-center gap-3">
				<CoverThumb coverUrl={s.cover_url} sceneId={s.scene_id} size="md" />
				<div class="min-w-0 flex-1">
					<p class="truncate font-semibold text-slate-800">{s.title}</p>
					<p class="text-xs text-slate-500">{s.character_id} · {s.theme_id} · {s.language.toUpperCase()}</p>
					<div class="mt-1"><StatusChip status={s.status} /></div>
				</div>
			</div>
			<div class="mt-3 flex gap-2">
				<a class="{action} bg-slate-100 text-slate-600" href="/admin/stories/{s.id}">
					<Pencil size={16} strokeWidth={1.5} /> Edit
				</a>
				<button class="{action} bg-slate-100 text-slate-600" onclick={() => onpreview(s)}>
					<Eye size={16} strokeWidth={1.5} /> Preview
				</button>
				<button class="{action} bg-sky-blue/20 text-slate-700" onclick={() => ontoggle(s)}>
					{#if s.status === 'published'}
						<EyeOff size={16} strokeWidth={1.5} /> Unpublish
					{:else}
						<Send size={16} strokeWidth={1.5} /> Publish
					{/if}
				</button>
				<button class="{action} bg-coral/15 text-coral" onclick={() => ondelete(s)}>
					<Trash2 size={16} strokeWidth={1.5} />
				</button>
			</div>
		</div>
	{/each}
</div>
