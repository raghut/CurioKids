<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { get } from 'svelte/store';
	import { language } from '$lib/stores/language';
	import { generatedStories } from '$lib/stores/generatedStories';
	import { familyCode } from '$lib/stores/familyCode';
	import { characters } from '$lib/data/characters';
	import type { CharacterId, GeneratedStory } from '$lib/types';

	type Phase = 'loading' | 'error' | 'limit';

	const te = $derived($language === 'te');

	const characterId = $derived($page.url.searchParams.get('character'));
	const character = $derived(characters.find((c) => c.id === characterId));

	const emoji = $derived(
		characterId === 'rabbit' ? '🐰' :
		characterId === 'peacock' ? '🦚' :
		characterId === 'elephant' ? '🐘' :
		characterId === 'monkey' ? '🐒' :
		characterId === 'tortoise' ? '🐢' : '🦜'
	);

	let phase = $state<Phase>('loading');
	let started = false;

	$effect(() => {
		if (started) return;
		started = true;
		void generate();
	});

	async function generate() {
		const character_id = $page.url.searchParams.get('character') as CharacterId | null;
		// A plain string now — the server validates it against the resolved theme list.
		const theme_id = $page.url.searchParams.get('theme');
		const child_name = $page.url.searchParams.get('name');
		const extra = $page.url.searchParams.get('extra');
		const lang = get(language) ?? 'en';

		if (!character_id || !theme_id) {
			phase = 'error';
			return;
		}

		// Client-side rate limit: max 3 generations per device per day.
		if (!generatedStories.canGenerate(get(generatedStories))) {
			phase = 'limit';
			return;
		}

		try {
			const code = familyCode.get();
			const res = await fetch('/api/generate-story', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					...(code ? { 'x-create-code': code } : {})
				},
				body: JSON.stringify({ character_id, theme_id, child_name, extra, language: lang })
			});

			if (res.status === 401) {
				// Code missing or rotated — forget it and send them back to re-enter.
				familyCode.clear();
				await goto('/create');
				return;
			}

			if (res.status === 400) {
				// Now that themes are operator-managed data, the picked theme can be
				// archived between loading /create and submitting (or come from a stale
				// cached shell). That is not a network problem, so don't show the wifi
				// screen — send them back to pick again from a fresh list.
				await goto('/create');
				return;
			}

			if (!res.ok) {
				phase = 'error';
				return;
			}

			const data = (await res.json()) as { story: GeneratedStory };
			if (!data?.story?.id) {
				phase = 'error';
				return;
			}

			generatedStories.recordGeneration();
			await goto(`/stories/${data.story.id}`);
		} catch {
			// Offline or network failure.
			phase = 'error';
		}
	}
</script>

<div class="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
	{#if phase === 'loading'}
		<div class="text-8xl animate-pulse mb-8">{emoji}</div>

		{#if character}
			<p class="text-xl font-bold mb-2" lang={te ? 'te' : undefined}>
				{te ? character.name_te : character.name_en}
			</p>
		{/if}

		<p class="text-lg text-gray-500" lang={te ? 'te' : undefined}>
			{te ? 'నీ కథ సిద్ధం అవుతోంది...' : 'Your story is coming...'}
		</p>
	{:else if phase === 'limit'}
		<div class="text-8xl mb-8">{emoji}</div>
		<p class="text-xl font-bold mb-2" lang={te ? 'te' : undefined}>
			{te ? 'రేపు మళ్ళీ కథ చేద్దాం!' : "Let's make more tomorrow!"}
		</p>
		<p class="text-lg text-gray-500 mb-8" lang={te ? 'te' : undefined}>
			{te ? 'ఈ రోజుకి మూడు కథలు అయిపోయాయి.' : "That's three new stories for today."}
		</p>
		<a href="/stories" class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'కథలు చదువు' : 'Read stories'}
		</a>
	{:else}
		<div class="text-8xl mb-8 grayscale opacity-70">{emoji}</div>
		<p class="text-xl font-bold mb-8" lang={te ? 'te' : undefined}>
			{te ? 'వైఫై వచ్చాక మళ్ళీ ప్రయత్నిద్దాం!' : "Let's try after wifi comes back!"}
		</p>
		<a href="/" class="px-6 py-4 rounded-2xl bg-sky-blue text-xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'ఇంటికి వెళ్ళు' : 'Back to home'}
		</a>
	{/if}
</div>
