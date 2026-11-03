<script lang="ts">
	import { untrack } from 'svelte';
	import { ArrowLeft, RefreshCw, Save, Languages, Eye } from 'lucide-svelte';
	import StatusChip from '$lib/components/admin/StatusChip.svelte';
	import type { PageData } from './$types';
	import type { FactContentSection, FactRecord, Language } from '$lib/types';

	let { data }: { data: PageData } = $props();

	const LANGUAGES_ALL: Language[] = ['en', 'te'];
	const LANG_NAME: Record<Language, string> = { en: 'English', te: 'Telugu' };
	const IMAGE_TYPES = ['question', 'discovery'];
	const COVER_SLOT = -1;

	// Local working copy so edits survive re-render; the server stays the source of truth.
	let fact = $state<FactRecord>(untrack(() => structuredClone(data.fact)));

	let coverPrompt = $state(untrack(() => data.fact.cover_prompt ?? ''));
	let sectionPrompts = $state(
		untrack(() => data.fact.structure.map((s) => s.image_prompt ?? ''))
	);

	type LangWorking = {
		title: string;
		subtitle: string;
		sections: FactContentSection[];
		reflection_question: string;
		real_world_mission: string;
	};

	// One working copy per language that already has content. A language with no
	// content yet has no entry here — its column shows the "generate" state instead.
	let working = $state<Partial<Record<Language, LangWorking>>>(
		untrack(() => {
			const w: Partial<Record<Language, LangWorking>> = {};
			for (const lang of LANGUAGES_ALL) {
				const c = data.fact.content[lang];
				if (!c) continue;
				w[lang] = {
					title: c.title,
					subtitle: c.subtitle ?? '',
					// Shaped by the structure, not by whatever the stored content happened to
					// have, so every section keeps the right field (text vs items) even if a
					// language block is incomplete.
					sections: data.fact.structure.map((s, i) =>
						s.type === 'fun_facts'
							? { items: [...(c.sections[i]?.items ?? [])] }
							: { text: c.sections[i]?.text ?? '' }
					),
					reflection_question: c.reflection_question,
					real_world_mission: c.real_world_mission
				};
			}
			return w;
		})
	);

	const presentLanguages = $derived(LANGUAGES_ALL.filter((l) => !!fact.content[l]));

	// Keyed by slot (-1 = cover, otherwise structure index).
	let imgBusy = $state<Record<number, boolean>>({});
	let imgNote = $state<Record<number, { kind: 'ok' | 'err'; text: string } | null>>({});

	let contentBusy = $state<Partial<Record<Language, boolean>>>({});
	let contentNote = $state<Partial<Record<Language, { kind: 'ok' | 'err'; text: string } | null>>>({});

	let translateBusy = $state<Partial<Record<Language, boolean>>>({});
	let translateNote = $state<Partial<Record<Language, { kind: 'ok' | 'err'; text: string } | null>>>({});

	async function regenImage(slot: number, prompt: string) {
		imgBusy = { ...imgBusy, [slot]: true };
		imgNote = { ...imgNote, [slot]: null };
		try {
			const res = await fetch(`/api/admin/facts/${fact.id}/image`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ slot, prompt })
			});
			const body = await res.json();
			if (!res.ok) {
				imgNote = { ...imgNote, [slot]: { kind: 'err', text: body?.message ?? 'That did not work.' } };
				return;
			}
			if (slot === COVER_SLOT) {
				fact.cover_image_url = body.url;
				fact.cover_prompt = body.prompt;
			} else {
				fact.section_images[slot] = body.url;
				fact.structure[slot] = { ...fact.structure[slot], image_prompt: body.prompt };
			}
			imgNote = { ...imgNote, [slot]: { kind: 'ok', text: 'New picture saved.' } };
		} catch {
			imgNote = { ...imgNote, [slot]: { kind: 'err', text: 'Could not reach the server.' } };
		} finally {
			imgBusy = { ...imgBusy, [slot]: false };
		}
	}

	// Posts only this one language's whole block — the other language's key never
	// appears in the request body, and the endpoint only ever touches `content[language]`.
	async function saveContent(lang: Language) {
		const w = working[lang];
		if (!w) return;
		contentBusy = { ...contentBusy, [lang]: true };
		contentNote = { ...contentNote, [lang]: null };
		try {
			const res = await fetch(`/api/admin/facts/${fact.id}/content`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					language: lang,
					title: w.title,
					subtitle: w.subtitle,
					sections: w.sections,
					reflection_question: w.reflection_question,
					real_world_mission: w.real_world_mission
				})
			});
			const body = await res.json();
			if (!res.ok) {
				contentNote = { ...contentNote, [lang]: { kind: 'err', text: body?.message ?? 'That did not work.' } };
				return;
			}
			fact.content = { ...fact.content, [lang]: body.content };
			contentNote = { ...contentNote, [lang]: { kind: 'ok', text: 'Saved.' } };
		} catch {
			contentNote = { ...contentNote, [lang]: { kind: 'err', text: 'Could not reach the server.' } };
		} finally {
			contentBusy = { ...contentBusy, [lang]: false };
		}
	}

	async function generateTranslation(lang: Language) {
		translateBusy = { ...translateBusy, [lang]: true };
		translateNote = { ...translateNote, [lang]: null };
		try {
			const res = await fetch(`/api/admin/facts/${fact.id}/translate`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ language: lang })
			});
			const body = await res.json();
			if (!res.ok) {
				translateNote = { ...translateNote, [lang]: { kind: 'err', text: body?.message ?? 'That did not work.' } };
				return;
			}
			fact.content = { ...fact.content, [lang]: body.content };
			working = {
				...working,
				[lang]: {
					title: body.content.title,
					subtitle: body.content.subtitle ?? '',
					sections: fact.structure.map((s, i) =>
						s.type === 'fun_facts'
							? { items: [...(body.content.sections[i]?.items ?? [])] }
							: { text: body.content.sections[i]?.text ?? '' }
					),
					reflection_question: body.content.reflection_question,
					real_world_mission: body.content.real_world_mission
				}
			};
			translateNote = { ...translateNote, [lang]: { kind: 'ok', text: 'Draft added — review before publishing.' } };
		} catch {
			translateNote = { ...translateNote, [lang]: { kind: 'err', text: 'Could not reach the server.' } };
		} finally {
			translateBusy = { ...translateBusy, [lang]: false };
		}
	}

	function addItem(lang: Language, i: number) {
		const w = working[lang];
		if (!w) return;
		w.sections[i] = { items: [...(w.sections[i].items ?? []), ''] };
	}

	function removeItem(lang: Language, i: number, j: number) {
		const w = working[lang];
		if (!w) return;
		w.sections[i] = { items: (w.sections[i].items ?? []).filter((_, k) => k !== j) };
	}

	const inputClass =
		'w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';
	const promptClass = inputClass + ' font-mono text-xs leading-relaxed';
	const btn = 'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold disabled:opacity-50';
	const sharedNote = '~₹1.5. Shared by every language — this changes it everywhere.';
</script>

<svelte:head><title>CurioKids Admin — {fact.topic}</title></svelte:head>

<div class="mx-auto max-w-3xl">
	<a href="/admin/facts" class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700">
		<ArrowLeft size={16} strokeWidth={1.5} /> Facts
	</a>

	<div class="mb-1 flex flex-wrap items-center gap-3">
		<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">{fact.topic}</h1>
		<StatusChip status={fact.status} />
		<a
			href="/admin/facts/{fact.id}/preview"
			class="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
		>
			<Eye size={15} strokeWidth={1.5} /> Preview as a child
		</a>
	</div>
	<p class="mb-6 text-sm text-slate-500">
		{#if presentLanguages.length}
			{presentLanguages.map((l) => l.toUpperCase()).join(' · ')}
		{:else}
			<span class="text-coral">no languages yet</span>
		{/if}
	</p>

	<!-- Cover -->
	<section class="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
		<h2 class="mb-1 font-bold text-slate-800">Cover</h2>
		<p class="mb-3 text-xs font-semibold text-slate-500">Shared by every language</p>

		{#if fact.cover_image_url}
			<img src={fact.cover_image_url} alt="" class="mb-3 w-full rounded-xl object-cover" />
		{:else}
			<p class="mb-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">No cover image.</p>
		{/if}

		<label class="flex flex-col gap-1.5">
			<span class="text-xs font-bold text-slate-600">Picture prompt</span>
			<textarea bind:value={coverPrompt} rows="4" class={promptClass}
				placeholder="Describe the cover picture…"></textarea>
		</label>

		{#if imgNote[COVER_SLOT]}
			<p class="mt-2 text-sm {imgNote[COVER_SLOT]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}" role="status">
				{imgNote[COVER_SLOT]?.text}
			</p>
		{/if}

		<button onclick={() => regenImage(COVER_SLOT, coverPrompt)} disabled={imgBusy[COVER_SLOT]}
			class="{btn} mt-3 bg-slate-100 text-slate-700 hover:bg-slate-200">
			<RefreshCw size={15} strokeWidth={1.5} />
			{imgBusy[COVER_SLOT] ? 'Making the picture…' : 'Regenerate cover'}
		</button>
		<p class="mt-1 text-xs text-slate-400">{sharedNote}</p>
	</section>

	<!-- Sections, in structure order. Count and order are fixed here — only words and
	     picture prompts are editable. -->
	{#each fact.structure as section, i (i)}
		<section class="mb-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
			<h2 class="mb-3 font-bold capitalize text-slate-800">Section {i + 1} — {section.type.replace('_', ' ')}</h2>

			{#if IMAGE_TYPES.includes(section.type)}
				<p class="mb-1 text-xs font-semibold text-slate-500">Shared by every language</p>
				{#if fact.section_images[i]}
					<img src={fact.section_images[i]} alt="" class="mb-3 w-full rounded-xl object-cover" />
				{:else}
					<p class="mb-3 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-400">No picture.</p>
				{/if}

				<label class="flex flex-col gap-1.5">
					<span class="text-xs font-bold text-slate-600">Picture prompt</span>
					<textarea bind:value={sectionPrompts[i]} rows="4" class={promptClass}
						placeholder="Describe this section's picture…"></textarea>
				</label>

				{#if imgNote[i]}
					<p class="mt-2 text-sm {imgNote[i]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}" role="status">
						{imgNote[i]?.text}
					</p>
				{/if}

				<button onclick={() => regenImage(i, sectionPrompts[i])} disabled={imgBusy[i]}
					class="{btn} mt-3 bg-slate-100 text-slate-700 hover:bg-slate-200">
					<RefreshCw size={15} strokeWidth={1.5} />
					{imgBusy[i] ? 'Making the picture…' : 'Regenerate picture'}
				</button>
				<p class="mb-4 mt-1 text-xs text-slate-400">{sharedNote}</p>
			{/if}

			<div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
				{#each LANGUAGES_ALL as lang (lang)}
					<div class="min-w-0">
						<p class="mb-1.5 text-xs font-bold uppercase text-slate-500">{lang}</p>
						{#if working[lang]}
							{#if section.type === 'fun_facts'}
								<div class="flex flex-col gap-1.5">
									{#each working[lang].sections[i].items ?? [] as _, j}
										<div class="flex gap-1.5">
											<input
												class={inputClass}
												bind:value={working[lang].sections[i].items![j]}
												lang={lang}
											/>
											<button
												type="button"
												class="shrink-0 rounded-lg px-2 text-slate-400 hover:text-coral"
												aria-label="Remove this fact"
												onclick={() => removeItem(lang, i, j)}
											>
												×
											</button>
										</div>
									{/each}
									<button
										type="button"
										class="self-start text-xs font-semibold text-slate-500 hover:text-slate-700"
										onclick={() => addItem(lang, i)}
									>
										+ Add fact
									</button>
								</div>
							{:else}
								<textarea
									class={inputClass}
									rows="3"
									bind:value={working[lang].sections[i].text}
									lang={lang}
								></textarea>
							{/if}
						{:else}
							<p class="rounded-lg bg-slate-50 px-3 py-6 text-center text-xs text-slate-400">
								No {LANG_NAME[lang]} yet.
							</p>
						{/if}
					</div>
				{/each}
			</div>
		</section>
	{/each}

	<!-- Title, subtitle, reflection question and mission: the same side-by-side columns,
	     plus the per-language Save / Generate controls. -->
	<section class="mb-10 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
		<h2 class="mb-3 font-bold text-slate-800">Title, subtitle, reflection &amp; mission</h2>

		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
			{#each LANGUAGES_ALL as lang (lang)}
				<div class="min-w-0">
					<p class="mb-2 text-xs font-bold uppercase text-slate-500">{lang}</p>

					{#if working[lang]}
						<div class="flex flex-col gap-3">
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-bold text-slate-600">Title</span>
								<input class={inputClass} bind:value={working[lang].title} lang={lang} />
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-bold text-slate-600">Subtitle</span>
								<input class={inputClass} bind:value={working[lang].subtitle} lang={lang} />
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-bold text-slate-600">Reflection question</span>
								<textarea class={inputClass} rows="2" bind:value={working[lang].reflection_question} lang={lang}
								></textarea>
							</label>
							<label class="flex flex-col gap-1.5">
								<span class="text-xs font-bold text-slate-600">Real-world mission</span>
								<textarea class={inputClass} rows="2" bind:value={working[lang].real_world_mission} lang={lang}
								></textarea>
							</label>

							{#if contentNote[lang]}
								<p class="text-sm {contentNote[lang]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}" role="status">
									{contentNote[lang]?.text}
								</p>
							{/if}

							<button
								onclick={() => saveContent(lang)}
								disabled={contentBusy[lang]}
								class="{btn} self-start bg-mint text-emerald-900 hover:brightness-105"
							>
								<Save size={15} strokeWidth={1.5} />
								{contentBusy[lang] ? 'Saving…' : `Save ${lang.toUpperCase()}`}
							</button>
						</div>
					{:else}
						<div class="flex flex-col items-center gap-2 rounded-lg bg-slate-50 px-3 py-6 text-center">
							<p class="text-xs text-slate-400">No {LANG_NAME[lang]} yet.</p>

							{#if translateNote[lang]}
								<p class="text-xs {translateNote[lang]?.kind === 'ok' ? 'text-emerald-700' : 'text-coral'}">
									{translateNote[lang]?.text}
								</p>
							{/if}

							<button
								onclick={() => generateTranslation(lang)}
								disabled={translateBusy[lang]}
								class="{btn} bg-slate-900 text-white hover:bg-slate-700"
							>
								<Languages size={15} strokeWidth={1.5} />
								{translateBusy[lang] ? 'Writing…' : `Generate ${LANG_NAME[lang]}`}
							</button>
							<p class="text-xs text-slate-400">~₹0.5, a first draft you can correct.</p>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</section>

	<p class="mb-10 text-xs text-slate-400">
		Word saves are free. Each regenerated picture is a fresh image generation — roughly ₹1.5 — and
		replaces the old one everywhere it's used, across every language.
	</p>
</div>
