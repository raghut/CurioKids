<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { loadStories } from '$lib/data/loadContent';
	import { seedActiveThemes } from '$lib/data/themes';
	import {
		curatedToFilterable,
		filterToParams,
		generatedToFilterable,
		isFilterActive,
		matchesFilter,
		parseFilter,
		type StoryFilter
	} from '$lib/data/filterStories';
	import ContentCard from '$lib/components/ContentCard.svelte';
	import StoryFilterSheet from '$lib/components/StoryFilterSheet.svelte';
	import { ArrowLeft, SlidersHorizontal } from 'lucide-svelte';
	import type { Story, StorySummary, ThemeOption } from '$lib/types';

	let curated = $state<Story[]>([]);
	let generated = $state<StorySummary[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	// Operator-managed, so fetched. Seeded from the bundled active set so the chips
	// still work offline, where only the gallery's absence is visible anyway.
	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);
	let themesLoaded = false;

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		loadStories($language).then((s) => (curated = s));
		generatedStories
			.loadGallery($language)
			.then((g) => (generated = g))
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	// Independent of the gallery: a failed theme fetch must not hide the stories,
	// and a failed gallery must not hide the chips.
	$effect(() => {
		if (themesLoaded) return;
		themesLoaded = true;
		void (async () => {
			try {
				const res = await fetch('/api/themes');
				if (res.ok) {
					const data = (await res.json()) as { themes: ThemeOption[] };
					themeOptions = data.themes ?? [];
				}
			} catch {
				// Bundled fallback stands.
			}
		})();
	});

	// The URL is the single source of truth for filter state — session-scoped, and
	// it survives reading a story and coming back.
	const filter = $derived(parseFilter($page.url.searchParams));

	let sheetOpen = $state(false);

	function applyFilter(next: StoryFilter) {
		sheetOpen = false;
		const qs = filterToParams(next).toString();
		// replaceState keeps chip taps out of the back history, so Back from the grid
		// goes home rather than walking back through filter states.
		void goto(qs ? `/stories?${qs}` : '/stories', {
			replaceState: true,
			noScroll: true,
			keepFocus: true
		});
	}

	const visibleCurated = $derived(
		curated.filter((s) => matchesFilter(curatedToFilterable(s), filter, $progress))
	);
	const visibleGenerated = $derived(
		generated.filter((s) => matchesFilter(generatedToFilterable(s), filter, $progress))
	);

	const te = $derived($language === 'te');
	const filtered = $derived(isFilterActive(filter));
	const nothingLoaded = $derived(curated.length === 0 && generated.length === 0);
	const nothingMatched = $derived(visibleCurated.length === 0 && visibleGenerated.length === 0);
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>{te ? 'కథలు' : 'Stories'}</h1>

		<!-- Filters live behind this icon so the grid starts at the top of the screen.
		     The coral dot is the only hint a child gets that the grid is narrowed, so
		     it is not decoration — without it a short grid looks like missing stories. -->
		<button
			type="button"
			class="relative ml-auto grid min-h-[64px] min-w-[64px] place-items-center rounded-full hover:bg-gray-100"
			aria-label={te ? 'కథలు ఎంచుకో' : 'Choose stories'}
			onclick={() => (sheetOpen = true)}
		>
			<SlidersHorizontal size={26} strokeWidth={1.5} />
			{#if filtered}
				<span class="absolute right-3 top-3 h-3 w-3 rounded-full bg-coral"></span>
			{/if}
		</button>
	</header>

	<StoryFilterSheet
		open={sheetOpen}
		{filter}
		themes={themeOptions}
		lang={$language ?? 'en'}
		onapply={applyFilter}
		onclose={() => (sheetOpen = false)}
	/>

	<div class="grid grid-cols-2 gap-4">
		{#each visibleCurated as story (story.id)}
			<ContentCard
				title={story.title}
				coverImage={story.cover_image || '📖'}
				href="/stories/{story.id}"
				completed={$progress.includes(story.id)}
			/>
		{/each}

		{#each visibleGenerated as gen (gen.id)}
			<ContentCard
				title={gen.title}
				coverImage={gen.cover_url || '✨'}
				href="/stories/{gen.id}"
				completed={$progress.includes(gen.id)}
				badge="✨"
			/>
		{/each}
	</div>

	<!-- First match wins, so the child never sees "nothing like that" while stories
	     are still arriving. -->
	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథలు వస్తున్నాయి...' : 'Loading stories...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-lg" lang={te ? 'te' : undefined}>
			{te ? 'కథల కోసం వైఫై కావాలి.' : 'We need wifi to load new stories.'}
		</p>
	{:else if nothingLoaded}
		<p class="text-center text-gray-400 mt-12 text-lg">No stories yet!</p>
	{:else if nothingMatched}
		<div class="mt-12 text-center">
			<p class="text-gray-400 text-lg mb-6" lang={te ? 'te' : undefined}>
				{te ? 'అలాంటి కథలు ఇంకా లేవు' : 'No stories like that yet'}
			</p>
			<button
				type="button"
				class="rounded-2xl bg-butter/50 px-6 text-xl font-bold min-h-[64px]"
				onclick={() => applyFilter({ age: null, theme: null, unreadOnly: false })}
			>
				<span lang={te ? 'te' : undefined} class={te ? 'leading-relaxed' : undefined}>
					{te ? 'అన్ని కథలు చూపించు' : 'Show all stories'}
				</span>
			</button>
		</div>
	{/if}
</div>
