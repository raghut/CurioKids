<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Sparkles } from 'lucide-svelte';
	import type { Language } from '$lib/types';

	// SvelteKit forbids importing $lib/server modules into client code (confirmed by a
	// failing build), so these mirror $lib/server/factImages.ts's RUPEES_PER_IMAGE and
	// $lib/server/factParse.ts's MIN_SECTIONS rather than importing them.
	const RUPEES_PER_IMAGE = 4;
	// Fewer screens than this cannot be built from one question, at least one discovery,
	// one fun_facts and one lesson, so the server rejects it and the estimate below would
	// quote for a shorter fact than the model could actually produce.
	const MIN_SCREENS = 4;

	let brief = $state('');
	let topic = $state('');
	let languages = $state<Language[]>(['en', 'te']);
	let screens = $state(MIN_SCREENS);
	let illustration = $state<'cover' | 'cover_plus' | 'every'>('cover_plus');

	let generating = $state(false);
	let errorMsg = $state('');

	// Sections that CAN hold a picture: everything except the fun_facts and lesson
	// the prompt always appends.
	const illustratable = $derived(Math.max(0, screens - 2));
	const pictureCount = $derived(
		illustration === 'cover'
			? 0
			: illustration === 'cover_plus'
				? Math.min(2, illustratable)
				: illustratable
	);
	const rupees = $derived((1 + pictureCount) * RUPEES_PER_IMAGE);

	const canGenerate = $derived(
		brief.trim().length > 0 &&
			topic.trim().length > 0 &&
			languages.length > 0 &&
			screens >= MIN_SCREENS &&
			screens <= 10
	);

	const inputClass =
		'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';

	function toggleLanguage(lang: Language) {
		languages = languages.includes(lang) ? languages.filter((l) => l !== lang) : [...languages, lang];
	}

	async function generate() {
		if (!canGenerate || generating) return;
		generating = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/admin/facts', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					brief,
					topic,
					languages,
					illustration,
					section_target: screens
				})
			});
			const data = await res.json();
			if (!res.ok) {
				errorMsg = data?.message ?? 'Could not create the fact. Try again.';
			} else {
				await goto('/admin/facts');
			}
		} catch {
			errorMsg = 'Could not reach the fact machine. Check your connection and try again.';
		} finally {
			generating = false;
		}
	}
</script>

<svelte:head><title>CurioKids Admin — New fact</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a
		href="/admin/facts"
		class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
	>
		<ArrowLeft size={16} strokeWidth={1.5} /> Facts
	</a>
	<h1 class="mb-6 font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">New fact</h1>

	<div class="flex flex-col gap-5" class:opacity-60={generating} class:pointer-events-none={generating}>
		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-bold text-slate-700">Topic <span class="text-coral">*</span></span>
			<input bind:value={topic} placeholder="e.g. Why do ants walk in a line?" class={inputClass} />
		</label>

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-bold text-slate-700">Brief <span class="text-coral">*</span></span>
			<textarea
				bind:value={brief}
				rows="4"
				placeholder="What should this fact explain to a curious 5-8 year old?"
				class={inputClass}
			></textarea>
		</label>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-bold text-slate-700">Languages <span class="text-coral">*</span></span>
			<div class="flex gap-4 text-sm">
				<label class="flex items-center gap-2">
					<input type="checkbox" checked={languages.includes('en')} onchange={() => toggleLanguage('en')} />
					English
				</label>
				<label class="flex items-center gap-2">
					<input type="checkbox" checked={languages.includes('te')} onchange={() => toggleLanguage('te')} />
					Telugu
				</label>
			</div>
		</div>

		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-bold text-slate-700">Screens</span>
			<input type="number" min={MIN_SCREENS} max="10" bind:value={screens} class="w-32 {inputClass}" />
			<!-- The floor is stated, not just enforced: a rejected 2 with no explanation reads
			     as a bug, and the operator cannot see the question/discovery/facts/lesson shape. -->
			<span class="text-xs text-slate-500">{MIN_SCREENS} to 10 — a question, the steps, fun facts, a lesson</span>
		</label>

		<div class="flex flex-col gap-2">
			<span class="text-sm font-bold text-slate-700">Illustration</span>
			<div class="flex flex-col gap-2 text-sm">
				<label class="flex items-center gap-2">
					<input type="radio" name="illustration" value="cover" bind:group={illustration} />
					Cover only
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" name="illustration" value="cover_plus" bind:group={illustration} />
					Cover + a couple of pictures
				</label>
				<label class="flex items-center gap-2">
					<input type="radio" name="illustration" value="every" bind:group={illustration} />
					A picture on every illustratable screen
				</label>
			</div>
		</div>

		<p class="text-sm text-slate-500">
			About ₹{rupees} — 1 cover + {pictureCount} {pictureCount === 1 ? 'picture' : 'pictures'} (estimate — the
			model chooses the final structure)
		</p>

		{#if errorMsg}<p class="text-sm text-coral" role="alert">{errorMsg}</p>{/if}

		<button
			onclick={generate}
			disabled={!canGenerate || generating}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-50"
		>
			<Sparkles size={18} strokeWidth={1.5} />
			{generating ? 'Creating your fact…' : 'Generate'}
		</button>
		{#if generating}
			<p class="text-center text-sm text-slate-400">This can take up to two minutes. Please wait…</p>
		{/if}
	</div>
</div>
