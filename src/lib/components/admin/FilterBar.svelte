<script lang="ts">
	import { Search } from 'lucide-svelte';
	let {
		search = $bindable(''),
		status = $bindable('all'),
		language = $bindable('all')
	}: {
		search: string;
		status: 'all' | 'draft' | 'published';
		language: 'all' | 'en' | 'te';
	} = $props();

	const selectClass =
		'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-sky-blue';
</script>

<div class="flex flex-col gap-3 sm:flex-row sm:items-center">
	<label class="relative flex-1">
		<span class="sr-only">Search by title</span>
		<Search size={16} strokeWidth={1.5} class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
		<input
			bind:value={search}
			type="search"
			placeholder="Search title…"
			class="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none focus:border-sky-blue"
		/>
	</label>
	<select bind:value={status} class={selectClass} aria-label="Filter by status">
		<option value="all">All statuses</option>
		<option value="draft">Draft</option>
		<option value="published">Published</option>
	</select>
	<select bind:value={language} class={selectClass} aria-label="Filter by language">
		<option value="all">All languages</option>
		<option value="en">English</option>
		<option value="te">Telugu</option>
	</select>
</div>
