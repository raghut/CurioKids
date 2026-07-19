<script lang="ts">
	import type { FactSection, Language } from '$lib/types';

	let { section, language }: { section: FactSection; language: Language } = $props();

	const te = $derived(language === 'te');
	const lead = $derived(te ? 'leading-[1.6]' : 'leading-relaxed');
</script>

<div class="flex flex-col items-center gap-5">
	{#if (section.type === 'question' || section.type === 'discovery') && section.image}
		<img src={section.image} alt="" class="w-full max-w-sm rounded-2xl object-cover" />
	{/if}

	{#if section.type === 'question'}
		<p class="text-2xl font-bold text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{:else if section.type === 'discovery'}
		<p class="text-2xl text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{:else if section.type === 'fun_facts'}
		<ul class="space-y-3 self-stretch">
			{#each section.items as item}
				<li class="text-2xl {lead}" lang={te ? 'te' : undefined}>• {item}</li>
			{/each}
		</ul>
	{:else if section.type === 'lesson'}
		<p class="text-2xl italic text-center {lead}" lang={te ? 'te' : undefined}>{section.text}</p>
	{/if}
</div>
