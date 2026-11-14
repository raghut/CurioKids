<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { progress } from '$lib/stores/progress';
	import { loadFacts } from '$lib/data/loadContent';
	import { warmFacts } from '$lib/data/warmCache';
	import FactCard from '$lib/components/FactCard.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { Fact } from '$lib/types';

	let facts = $state<Fact[]>([]);
	let loading = $state(true);
	let failed = $state(false);

	$effect(() => {
		if (!$language) return;
		loading = true;
		failed = false;
		const lang = $language;
		loadFacts(lang)
			.then((f) => {
				facts = f;
				warmFacts(
					f.map((x) => x.id),
					lang
				);
			})
			.catch(() => (failed = true))
			.finally(() => (loading = false));
	});

	const te = $derived($language === 'te');

	// Same contract as the Stories filter: kept in the URL, so it survives reading a fact
	// and coming back, and resets on a fresh visit from home. Nothing in localStorage.
	const unreadOnly = $derived($page.url.searchParams.get('unread') === '1');
	const visible = $derived(unreadOnly ? facts.filter((f) => !$progress.includes(f.id)) : facts);

	function setUnread(on: boolean) {
		void goto(on ? '/facts?unread=1' : '/facts', { replaceState: true, noScroll: true, keepFocus: true });
	}
</script>

<div class="min-h-screen bg-white p-6">
	<header class="flex items-center gap-3 mb-6">
		<a
			href="/"
			class="w-16 h-16 flex items-center justify-center rounded-full hover:bg-gray-100"
			aria-label="Back"
		>
			<ArrowLeft size={28} strokeWidth={1.5} />
		</a>
		<h1 class="text-3xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'ఎందుకు? ఎలా?' : 'Why & How?'}
		</h1>
	</header>

	{#if facts.length}
		<button
			type="button"
			class="mb-5 min-h-[64px] rounded-full px-6 text-xl font-bold transition-colors {unreadOnly
				? 'bg-mint text-green-900'
				: 'bg-gray-100 text-gray-600'}"
			aria-pressed={unreadOnly}
			onclick={() => setUnread(!unreadOnly)}
		>
			<span lang={te ? 'te' : undefined}>{te ? 'ఇంకా చదవలేదు' : 'Not read yet'}</span>
		</button>
	{/if}

	{#if loading}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాలు వస్తున్నాయి...' : 'Loading facts...'}
		</p>
	{:else if failed}
		<p class="text-center text-gray-400 mt-12 text-xl" lang={te ? 'te' : undefined}>
			{te ? 'విషయాల కోసం వైఫై కావాలి.' : 'We need wifi to load facts.'}
		</p>
	{:else if facts.length === 0}
		<p class="text-center text-gray-400 mt-12 text-xl">No facts yet!</p>
	{:else if visible.length === 0}
		<div class="mt-12 text-center">
			<p class="mb-6 text-xl text-gray-500" lang={te ? 'te' : undefined}>
				{te ? 'అన్నీ చదివేశావు!' : "You've read them all!"}
			</p>
			<button
				type="button"
				class="min-h-[64px] rounded-2xl bg-butter/50 px-6 text-xl font-bold"
				onclick={() => setUnread(false)}
			>
				<span lang={te ? 'te' : undefined}>{te ? 'అన్నీ చూపించు' : 'Show all'}</span>
			</button>
		</div>
	{:else}
		<!-- Big picture covers: one column on a phone, two on a tablet, three on a laptop. -->
		<div class="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{#each visible as fact, i (fact.id)}
				<FactCard
					tint={i}
					title={fact.title}
					subtitle={fact.subtitle ?? ''}
					coverImage={fact.cover_image || '🌿'}
					scene={fact.cover_image ? undefined : fact.scene}
					href="/facts/{fact.id}"
					completed={$progress.includes(fact.id)}
					language={$language ?? 'en'}
				/>
			{/each}
		</div>
	{/if}
</div>
