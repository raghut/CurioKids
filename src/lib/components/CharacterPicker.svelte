<script lang="ts">
	import { characters } from '$lib/data/characters';
	import type { CharacterId, Language } from '$lib/types';

	let { selected = $bindable<CharacterId | null>(null), lang = 'en' }: {
		selected?: CharacterId | null;
		lang?: Language;
	} = $props();
</script>

<div class="grid grid-cols-3 gap-3">
	{#each characters as char}
		<button
			type="button"
			class="rounded-2xl p-3 flex flex-col items-center gap-1 border-2 transition-colors min-h-[80px]
				{selected === char.id ? 'border-coral bg-coral/10' : 'border-transparent bg-white shadow-sm'}"
			onclick={() => (selected = char.id)}
		>
			<div class="w-12 h-12 rounded-full bg-butter/40 flex items-center justify-center text-2xl">
				{char.id === 'rabbit' ? '🐰' : char.id === 'peacock' ? '🦚' : char.id === 'elephant' ? '🐘' : char.id === 'monkey' ? '🐒' : char.id === 'tortoise' ? '🐢' : '🦜'}
			</div>
			<span class="text-sm font-bold">{lang === 'te' ? char.name_te : char.name_en}</span>
		</button>
	{/each}
</div>
