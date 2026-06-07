<script lang="ts">
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import type { CharacterId, ThemeId } from '$lib/types';

	let selectedCharacter = $state<CharacterId | null>(null);
	let selectedTheme = $state<ThemeId | null>(null);
	let childName = $state('');

	const te = $derived($language === 'te');
	const canCreate = $derived(selectedCharacter !== null && selectedTheme !== null);

	function create() {
		if (!canCreate) return;
		const params = new URLSearchParams({
			character: selectedCharacter!,
			theme: selectedTheme!,
			...(childName ? { name: childName } : {})
		});
		goto(`/create/generating?${params}`);
	}
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="flex items-center gap-3 mb-6">
		<a href="/" class="p-2 rounded-full hover:bg-gray-100" aria-label="Back">
			<ArrowLeft size={24} strokeWidth={1.5} />
		</a>
		<h1 class="text-2xl font-bold" lang={te ? 'te' : undefined}>
			{te ? 'సృష్టించు' : 'Create a Story'}
		</h1>
	</header>

	<div class="flex-1 space-y-6 max-w-md mx-auto w-full">
		<section>
			<h2 class="text-lg font-bold mb-3" lang={te ? 'te' : undefined}>
				{te ? 'పాత్ర ఎంచుకో' : 'Pick a character'}
			</h2>
			<CharacterPicker bind:selected={selectedCharacter} lang={$language ?? 'en'} />
		</section>

		<section>
			<h2 class="text-lg font-bold mb-3" lang={te ? 'te' : undefined}>
				{te ? 'కథ రకం' : 'Pick a theme'}
			</h2>
			<ThemePicker bind:selected={selectedTheme} lang={$language ?? 'en'} />
		</section>

		<section>
			<label class="block text-lg font-bold mb-2" for="child-name" lang={te ? 'te' : undefined}>
				{te ? 'నీ పేరు (ఐచ్ఛికం)' : 'Your name (optional)'}
			</label>
			<input
				id="child-name"
				type="text"
				bind:value={childName}
				placeholder={te ? 'నీ పేరు...' : 'Your name...'}
				class="w-full p-4 rounded-xl border border-gray-200 text-lg"
			/>
		</section>
	</div>

	<div class="mt-6 max-w-md mx-auto w-full">
		<button
			onclick={create}
			disabled={!canCreate}
			class="w-full py-5 rounded-2xl bg-coral text-white text-xl font-bold disabled:opacity-40 transition-opacity"
		>
			{te ? 'నా కథ తయారు చేయి' : 'Make my story'}
		</button>
	</div>
</div>
