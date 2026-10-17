<script lang="ts">
	import { goto } from '$app/navigation';
	import { language } from '$lib/stores/language';
	import { familyCode } from '$lib/stores/familyCode';
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { ArrowLeft, Lock } from 'lucide-svelte';
	import { seedActiveThemes } from '$lib/data/themes';
	import type { CharacterId, ThemeId, ThemeOption } from '$lib/types';

	let selectedCharacter = $state<CharacterId | null>(null);
	let selectedTheme = $state<ThemeId | null>(null);
	let childName = $state('');
	let extra = $state('');

	// Operator-managed, so fetched. Falls back to the bundled active set rather than
	// rendering an empty picker — this screen already needs network to generate.
	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);

	// --- Family passcode gate (UX only; real guard is server-side) ---
	let unlocked = $state(false);
	let needsCode = $state(false);
	let checking = $state(true);
	let codeInput = $state('');
	let verifying = $state(false);
	let codeError = $state(false);
	let started = false;

	const te = $derived($language === 'te');
	const canCreate = $derived(selectedCharacter !== null && selectedTheme !== null);

	$effect(() => {
		if (started) return;
		started = true;
		void init();
	});

	async function init() {
		try {
			const res = await fetch('/api/themes');
			if (res.ok) {
				const data = (await res.json()) as { themes: ThemeOption[] };
				if (data.themes?.length) themeOptions = data.themes;
			}
		} catch {
			// Keep the bundled fallback already in themeOptions.
		}

		// Already unlocked on this device → straight in.
		if (familyCode.get()) {
			unlocked = true;
			checking = false;
			return;
		}
		// Probe whether the gate is even on: an empty code returns 200 when the
		// server has no CREATE_PASSCODE configured (open), 401 when it does.
		try {
			const res = await fetch('/api/verify-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: '' })
			});
			if (res.ok) unlocked = true;
			else needsCode = true;
		} catch {
			needsCode = true; // network issue → ask for the code (safe default)
		}
		checking = false;
	}

	async function unlock() {
		const c = codeInput.trim();
		if (!c || verifying) return;
		codeError = false;
		verifying = true;
		try {
			const res = await fetch('/api/verify-code', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ code: c })
			});
			if (res.ok) {
				familyCode.set(c);
				unlocked = true;
				needsCode = false;
			} else {
				codeError = true;
			}
		} catch {
			codeError = true;
		}
		verifying = false;
	}

	function create() {
		if (!canCreate) return;
		const params = new URLSearchParams({
			character: selectedCharacter!,
			theme: selectedTheme!,
			...(childName ? { name: childName } : {}),
			...(extra.trim() ? { extra: extra.trim() } : {})
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

	{#if checking}
		<!-- Brief blank while we check whether the gate is on. -->
		<div class="flex-1"></div>
	{:else if needsCode && !unlocked}
		<!-- One-time family-code unlock (never shown again on this device). -->
		<div class="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full text-center">
			<div class="text-6xl mb-4">✨</div>
			<div class="flex items-center gap-2 mb-2 text-coral">
				<Lock size={22} strokeWidth={1.5} />
				<h2 class="text-xl font-bold" lang={te ? 'te' : undefined}>
					{te ? 'కుటుంబ కోడ్ ఇవ్వు' : 'Enter family code'}
				</h2>
			</div>
			<p class="text-lg text-gray-500 mb-6" lang={te ? 'te' : undefined}>
				{te ? 'కొత్త కథలు చేయడానికి' : 'to make new stories'}
			</p>
			<input
				type="password"
				bind:value={codeInput}
				onkeydown={(e) => e.key === 'Enter' && unlock()}
				placeholder={te ? 'కోడ్...' : 'Code...'}
				class="w-full p-4 rounded-xl border border-gray-200 text-lg text-center mb-3"
				aria-label={te ? 'కుటుంబ కోడ్' : 'Family code'}
			/>
			{#if codeError}
				<p class="text-coral text-base mb-3" lang={te ? 'te' : undefined}>
					{te ? 'కోడ్ సరిపోలేదు. మళ్ళీ ప్రయత్నించు.' : "That code didn't work. Try again."}
				</p>
			{/if}
			<button
				onclick={unlock}
				disabled={!codeInput.trim() || verifying}
				class="w-full py-5 rounded-2xl bg-coral text-white text-xl font-bold disabled:opacity-40 transition-opacity"
				lang={te ? 'te' : undefined}
			>
				{te ? 'తెరువు' : 'Unlock'}
			</button>
		</div>
	{:else}
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
				<ThemePicker themes={themeOptions} bind:selected={selectedTheme} lang={$language ?? 'en'} />
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

			<section>
				<label class="block text-lg font-bold mb-2" for="extra" lang={te ? 'te' : undefined}>
					{te ? 'ఇంకా ఏమైనా చేర్చాలా? (ఐచ్ఛికం)' : 'Add anything special? (optional)'}
				</label>
				<textarea
					id="extra"
					bind:value={extra}
					maxlength={200}
					rows={2}
					placeholder={te ? 'ఉదా: ఒక చిన్న తాబేలు, ఒక నది...' : 'e.g. a baby turtle, a river, a kite...'}
					class="w-full p-4 rounded-xl border border-gray-200 text-lg resize-none"
				></textarea>
			</section>
		</div>

		<div class="mt-6 max-w-md mx-auto w-full">
			<button
				onclick={create}
				disabled={!canCreate}
				class="w-full py-5 rounded-2xl bg-coral text-white text-xl font-bold disabled:opacity-40 transition-opacity"
				lang={te ? 'te' : undefined}
			>
				{te ? 'నా కథ తయారు చేయి' : 'Make my story'}
			</button>
		</div>
	{/if}
</div>
