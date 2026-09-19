<script lang="ts">
	import { Check, PencilLine } from 'lucide-svelte';
	let { status }: { status: 'draft' | 'published' } = $props();
</script>

{#if status === 'published'}
	<span class="inline-flex items-center gap-1 rounded-full bg-mint/40 px-2.5 py-1 text-xs font-bold text-emerald-700">
		<Check size={13} strokeWidth={2} /> Published
	</span>
{:else}
	<span class="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">
		<PencilLine size={13} strokeWidth={2} /> Draft
	</span>
{/if}
