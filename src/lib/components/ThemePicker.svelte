<script lang="ts">
	import type { ThemeId, Language, ThemeOption } from '$lib/types';

	let { themes, selected = $bindable<ThemeId | null>(null), lang = 'en' }: {
		themes: ThemeOption[];
		selected?: ThemeId | null;
		lang?: Language;
	} = $props();

	// Themes are operator-managed, so there can be any number of them. Cycle the
	// four pastel fills rather than indexing a fixed-length array.
	const colors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];
</script>

<div class="grid grid-cols-2 gap-3">
	{#each themes as theme, i (theme.id)}
		<button
			type="button"
			class="rounded-2xl p-4 text-left border-2 transition-colors min-h-[64px]
				{colors[i % colors.length]}
				{selected === theme.id ? 'border-coral' : 'border-transparent'}"
			onclick={() => (selected = theme.id)}
		>
			<span class="text-base font-bold" lang={lang === 'te' ? 'te' : undefined}>
				{lang === 'te' ? theme.label_te : theme.label_en}
			</span>
		</button>
	{/each}
</div>
