<script lang="ts">
	import CharacterPicker from '$lib/components/CharacterPicker.svelte';
	import ThemePicker from '$lib/components/ThemePicker.svelte';
	import { goto } from '$app/navigation';
	import { Sparkles, ArrowLeft } from 'lucide-svelte';
	import { seedActiveThemes } from '$lib/data/themes';
	import type { CharacterId, ThemeId, GeneratedStory, AgeBand, ThemeOption } from '$lib/types';

	// Brief state
	let storyIdea = $state('');
	let useCustom = $state(false);
	let selectedCharacter = $state<CharacterId | null>(null);
	let customCharacter = $state('');
	let supportingCharacter = $state('');
	let selectedTheme = $state<ThemeId | null>(null);
	let ageBand = $state<AgeBand>('7-8');
	let language = $state<'en' | 'te'>('en');
	let tone = $state<'gentle' | 'funny' | 'adventurous'>('gentle');
	let setting = $state('');
	let moralFocus = $state('');
	let extra = $state('');

	let themeOptions = $state<ThemeOption[]>(
		seedActiveThemes.map(({ id, label_en, label_te }) => ({ id, label_en, label_te }))
	);

	$effect(() => {
		void (async () => {
			try {
				const res = await fetch('/api/themes');
				if (res.ok) {
					const data = (await res.json()) as { themes: ThemeOption[] };
					if (data.themes?.length) themeOptions = data.themes;
				}
			} catch {
				// Bundled fallback stands.
			}
		})();
	});

	// Flow state
	let generating = $state(false);
	let errorMsg = $state('');
	let draft = $state<GeneratedStory | null>(null);
	let publishing = $state(false);

	const SETTINGS = ['village', 'forest', 'home', 'pond', 'festival', 'market'];

	// 2-4 is the board-book band: every page is illustrated, so it costs and takes more.
	const isToddler = $derived(ageBand === '2-4');

	const canGenerate = $derived(
		storyIdea.trim().length > 0 &&
			selectedTheme !== null &&
			(useCustom ? customCharacter.trim().length > 0 : selectedCharacter !== null)
	);

	const inputClass =
		'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';

	async function generate() {
		if (!canGenerate || generating) return;
		generating = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/admin/generate-story', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					story_idea: storyIdea,
					character_id: useCustom ? undefined : selectedCharacter,
					custom_character: useCustom ? customCharacter : undefined,
					supporting_character: supportingCharacter || undefined,
					theme_id: selectedTheme,
					age_band: ageBand,
					language,
					tone,
					setting: setting || undefined,
					moral_focus: moralFocus || undefined,
					extra: extra || undefined
				})
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data?.message ?? 'Could not create the story. Try again.';
			} else {
				draft = data.story as GeneratedStory;
			}
		} catch {
			errorMsg = 'Could not reach the story machine. Check your connection and try again.';
		} finally {
			generating = false;
		}
	}

	async function publish() {
		if (!draft || publishing) return;
		publishing = true;
		try {
			const res = await fetch(`/api/admin/stories/${draft.id}`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ action: 'publish' })
			});
			if (!res.ok) throw new Error();
			await goto('/admin');
		} catch {
			errorMsg = 'Could not publish. It is saved as a draft — publish it from the list.';
			publishing = false;
		}
	}
</script>

<svelte:head><title>CurioKids Admin — New story</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a href="/admin" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700">
		<ArrowLeft size={16} strokeWidth={1.5} /> Stories
	</a>
	<h1 class="mb-6 font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">New story</h1>

	{#if draft}
		<!-- Draft preview + publish -->
		<div class="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
			<div class="mb-2 inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-600">Draft — not visible to kids yet</div>
			{#if draft.cover_image_url}
				<img src={draft.cover_image_url} alt="" class="mb-4 w-full rounded-xl object-cover" />
			{/if}
			<h2 class="mb-3 font-[family-name:var(--font-fraunces)] text-xl font-bold" lang={draft.language}>{draft.title}</h2>
			<div class="flex flex-col gap-4">
				{#each draft.pages as p, i (i)}
					<div class="flex flex-col gap-2">
						{#if p.image_url}
							<img src={p.image_url} alt="" class="w-full rounded-xl object-cover" />
						{/if}
						<p class="text-base leading-relaxed text-slate-700" lang={draft.language}>{p.text}</p>
					</div>
				{/each}
			</div>
			<p class="mt-4 rounded-lg bg-mint/20 px-3 py-2 text-sm text-slate-700" lang={draft.language}>{draft.moral}</p>
			<p class="mt-2 text-sm italic text-slate-500" lang={draft.language}>{draft.reflection_question}</p>

			{#if errorMsg}<p class="mt-4 text-sm text-coral" role="alert">{errorMsg}</p>{/if}

			<div class="mt-6 flex flex-wrap gap-3">
				<button onclick={publish} disabled={publishing} class="rounded-xl bg-mint px-5 py-2.5 font-bold text-emerald-900 hover:brightness-105 disabled:opacity-60">
					{publishing ? 'Publishing…' : 'Publish'}
				</button>
				<button onclick={() => goto(`/admin/stories/${draft?.id}`)} class="rounded-xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-200">
					Edit pages
				</button>
				<button onclick={() => goto('/admin')} class="rounded-xl bg-slate-100 px-5 py-2.5 font-semibold text-slate-600 hover:bg-slate-200">
					Keep as draft
				</button>
				<button onclick={() => (draft = null)} class="rounded-xl px-5 py-2.5 font-semibold text-slate-400 hover:text-slate-600">
					Edit brief
				</button>
			</div>
		</div>
	{:else}
		<!-- Brief form -->
		<div class="flex flex-col gap-5" class:opacity-60={generating} class:pointer-events-none={generating}>
			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-bold text-slate-700">Story idea <span class="text-coral">*</span></span>
				<textarea bind:value={storyIdea} rows="3" placeholder="A shy peacock who's afraid to dance at the village festival learns courage." class={inputClass}></textarea>
			</label>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-bold text-slate-700">Main character <span class="text-coral">*</span></span>
				<div class="flex gap-2 text-sm">
					<button type="button" onclick={() => (useCustom = false)} class="rounded-lg px-3 py-1.5 font-semibold {!useCustom ? 'bg-coral/15 text-coral' : 'bg-slate-100 text-slate-500'}">Pick an animal</button>
					<button type="button" onclick={() => (useCustom = true)} class="rounded-lg px-3 py-1.5 font-semibold {useCustom ? 'bg-coral/15 text-coral' : 'bg-slate-100 text-slate-500'}">Custom</button>
				</div>
				{#if useCustom}
					<input bind:value={customCharacter} placeholder="e.g. a tiny brave firefly named Chinni" class={inputClass} />
					<p class="text-xs text-slate-400">Custom characters won't have a consistent look across stories.</p>
				{:else}
					<CharacterPicker bind:selected={selectedCharacter} lang={language} />
				{/if}
			</div>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-bold text-slate-700">Supporting character</span>
				<input bind:value={supportingCharacter} placeholder="Optional — e.g. a wise old owl" class={inputClass} />
			</label>

			<div class="flex flex-col gap-2">
				<span class="text-sm font-bold text-slate-700">Theme <span class="text-coral">*</span></span>
				<ThemePicker themes={themeOptions} bind:selected={selectedTheme} lang={language} />
			</div>

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-bold text-slate-700">Age band</span>
					<select bind:value={ageBand} class={inputClass}>
						<option value="2-4">2–4</option>
						<option value="5-6">5–6</option>
						<option value="7-8">7–8</option>
					</select>
					{#if isToddler}
						<p class="text-xs text-slate-400">
							Board book: short pages and a picture on every page (6 images) — slower and
							costlier than the other bands.
						</p>
					{/if}
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-bold text-slate-700">Language</span>
					<select bind:value={language} class={inputClass}>
						<option value="en">English</option>
						<option value="te">Telugu</option>
					</select>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-bold text-slate-700">Tone</span>
					<select bind:value={tone} class={inputClass}>
						<option value="gentle">Gentle</option>
						<option value="funny">Funny</option>
						<option value="adventurous">Adventurous</option>
					</select>
				</label>
				<label class="flex flex-col gap-1.5">
					<span class="text-sm font-bold text-slate-700">Setting</span>
					<input bind:value={setting} list="settings" placeholder="Optional" class={inputClass} />
					<datalist id="settings">
						{#each SETTINGS as s}<option value={s}></option>{/each}
					</datalist>
				</label>
			</div>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-bold text-slate-700">Moral focus</span>
				<input bind:value={moralFocus} placeholder="Optional — e.g. courage grows with practice" class={inputClass} />
			</label>

			<label class="flex flex-col gap-1.5">
				<span class="text-sm font-bold text-slate-700">Extra wishes</span>
				<input bind:value={extra} placeholder="Optional — extra animals, places, or objects to include" class={inputClass} />
			</label>

			{#if errorMsg}<p class="text-sm text-coral" role="alert">{errorMsg}</p>{/if}

			<button
				onclick={generate}
				disabled={!canGenerate || generating}
				class="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-50"
			>
				<Sparkles size={18} strokeWidth={1.5} />
				{generating ? 'Creating your story…' : 'Generate'}
			</button>
			{#if generating}
				<p class="text-center text-sm text-slate-400">
					This takes ~{isToddler ? '60–90' : '15–30'} seconds. Please wait…
				</p>
			{/if}
		</div>
	{/if}
</div>
