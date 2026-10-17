<script lang="ts">
	import { AGE_BANDS, EMPTY_FILTER, isFilterActive, type StoryFilter } from '$lib/data/filterStories';
	import type { AgeBand, Language, ThemeId, ThemeOption } from '$lib/types';

	let { filter, themes, lang = 'en', onchange }: {
		filter: StoryFilter;
		/** The resolved ACTIVE theme list, passed in — never imported. */
		themes: ThemeOption[];
		lang?: Language;
		onchange: (next: StoryFilter) => void;
	} = $props();

	const te = $derived(lang === 'te');

	// Themes are operator-managed, so cycle the four pastel fills rather than
	// indexing a fixed-length array. Same approach as ThemePicker.
	const themeColors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];

	// Tapping the lit chip clears that dimension — always one obvious way out.
	function pickAge(band: AgeBand) {
		onchange({ ...filter, age: filter.age === band ? null : band });
	}
	function pickTheme(id: ThemeId) {
		onchange({ ...filter, theme: filter.theme === id ? null : id });
	}
	function toggleUnread() {
		onchange({ ...filter, unreadOnly: !filter.unreadOnly });
	}
</script>

<div class="mb-6 space-y-3">
	<div class="flex gap-3">
		{#each AGE_BANDS as band (band)}
			<button
				type="button"
				class="flex-1 rounded-2xl border-2 px-4 text-xl font-bold transition-colors min-h-[64px]
					bg-sky-blue/30
					{filter.age === band ? 'border-coral' : 'border-transparent'}"
				aria-pressed={filter.age === band}
				onclick={() => pickAge(band)}
			>
				{band}
			</button>
		{/each}
	</div>

	{#if themes.length}
		<div class="grid grid-cols-2 gap-3">
			{#each themes as theme, i (theme.id)}
				<button
					type="button"
					class="rounded-2xl border-2 p-4 text-left text-xl font-bold transition-colors min-h-[64px]
						{themeColors[i % themeColors.length]}
						{filter.theme === theme.id ? 'border-coral' : 'border-transparent'}"
					aria-pressed={filter.theme === theme.id}
					onclick={() => pickTheme(theme.id)}
				>
					<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
						{te ? theme.label_te : theme.label_en}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<div class="flex gap-3">
		<button
			type="button"
			class="flex-1 rounded-2xl border-2 px-4 text-xl font-bold transition-colors min-h-[64px]
				bg-mint/30
				{filter.unreadOnly ? 'border-coral' : 'border-transparent'}"
			aria-pressed={filter.unreadOnly}
			onclick={toggleUnread}
		>
			<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
				{te ? 'ఇంకా చదవలేదు' : 'Not read yet'}
			</span>
		</button>

		{#if isFilterActive(filter)}
			<button
				type="button"
				class="rounded-2xl border-2 border-transparent bg-butter/30 px-5 text-xl font-bold transition-colors min-h-[64px]"
				onclick={() => onchange(EMPTY_FILTER)}
			>
				<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
					{te ? 'అన్నీ' : 'All'}
				</span>
			</button>
		{/if}
	</div>
</div>
