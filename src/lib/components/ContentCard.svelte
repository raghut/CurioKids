<script lang="ts">
	import { Check } from 'lucide-svelte';

	let { title, coverImage, href, completed = false, badge = '' }: {
		title: string;
		coverImage: string;
		href: string;
		completed?: boolean;
		badge?: string;
	} = $props();
</script>

<a {href} class="block rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow bg-white relative">
	<div class="aspect-square bg-butter/30 flex items-center justify-center text-4xl">
		{#if coverImage.startsWith('/') || coverImage.startsWith('data:')}
			<img src={coverImage} alt={title} class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>
	<div class="p-3">
		<p class="text-lg font-bold truncate">{title}</p>
	</div>
	{#if completed}
		<div class="absolute top-2 right-2 bg-mint rounded-full p-1">
			<Check size={18} strokeWidth={2.5} class="text-green-700" />
		</div>
	{/if}
	{#if badge}
		<span class="absolute top-2 left-2 text-sm">{badge}</span>
	{/if}
</a>
