<script lang="ts">
	import { themes } from '$lib/data/themes';
	import type { ThemeId, Language } from '$lib/types';

	let { selected = $bindable<ThemeId | null>(null), lang = 'en' }: {
		selected?: ThemeId | null;
		lang?: Language;
	} = $props();

	const colors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];
</script>

<div class="grid grid-cols-2 gap-3">
	{#each themes as theme, i}
		<button
			type="button"
			class="rounded-2xl p-4 text-left border-2 transition-colors min-h-[64px]
				{colors[i]}
				{selected === theme.id ? 'border-coral' : 'border-transparent'}"
			onclick={() => (selected = theme.id)}
		>
			<span class="text-base font-bold">{lang === 'te' ? theme.label_te : theme.label_en}</span>
		</button>
	{/each}
</div>
