<script lang="ts">
	import { page } from '$app/stores';
	import { language } from '$lib/stores/language';
	import { characters } from '$lib/data/characters';

	const characterId = $derived($page.url.searchParams.get('character'));
	const character = $derived(characters.find((c) => c.id === characterId));
	const te = $derived($language === 'te');

	const emoji = $derived(
		characterId === 'rabbit' ? '🐰' :
		characterId === 'peacock' ? '🦚' :
		characterId === 'elephant' ? '🐘' :
		characterId === 'monkey' ? '🐒' :
		characterId === 'tortoise' ? '🐢' : '🦜'
	);
</script>

<div class="min-h-screen bg-white flex flex-col items-center justify-center p-6">
	<div class="text-8xl animate-pulse mb-8">
		{emoji}
	</div>

	{#if character}
		<p class="text-xl font-bold mb-2">
			{te ? character.name_te : character.name_en}
		</p>
	{/if}

	<p class="text-lg text-gray-500 text-center" lang={te ? 'te' : undefined}>
		{te ? 'నీ కథ సిద్ధం అవుతోంది...' : 'Your story is coming...'}
	</p>

	<p class="mt-8 text-sm text-gray-300">(API not connected yet)</p>

	<a
		href="/"
		class="mt-8 px-6 py-3 rounded-xl bg-sky-blue font-bold"
	>
		{te ? 'ఇంటికి వెళ్ళు' : 'Back to home'}
	</a>
</div>
