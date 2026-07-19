<script lang="ts">
	import { Check } from 'lucide-svelte';
	import type { Language } from '$lib/types';

	let {
		title,
		subtitle = '',
		coverImage,
		href,
		completed = false,
		language = 'en'
	}: {
		title: string;
		subtitle?: string;
		coverImage: string;
		href: string;
		completed?: boolean;
		language?: Language;
	} = $props();

	const te = $derived(language === 'te');
	const isImage = $derived(
		coverImage.startsWith('/') || coverImage.startsWith('data:') || coverImage.startsWith('http')
	);
</script>

<a
	{href}
	class="flex items-center gap-4 min-h-[64px] p-3 rounded-2xl bg-white shadow-sm hover:shadow-md transition-shadow"
>
	<div
		class="w-[72px] h-[72px] shrink-0 rounded-xl bg-butter/30 flex items-center justify-center text-3xl overflow-hidden"
	>
		{#if isImage}
			<img src={coverImage} alt="" class="w-full h-full object-cover" />
		{:else}
			<span>{coverImage}</span>
		{/if}
	</div>

	<div class="flex-1 min-w-0">
		<p class="text-2xl font-bold leading-tight {te ? 'leading-[1.6]' : ''}" lang={te ? 'te' : undefined}>
			{title}
		</p>
		{#if subtitle}
			<p class="text-base text-gray-500 truncate" lang={te ? 'te' : undefined}>{subtitle}</p>
		{/if}
	</div>

	{#if completed}
		<div class="shrink-0 bg-mint rounded-full p-1">
			<Check size={20} strokeWidth={2.5} class="text-green-700" />
		</div>
	{/if}
</a>
