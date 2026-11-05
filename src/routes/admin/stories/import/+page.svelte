<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Upload } from 'lucide-svelte';

	type Imported = { id: string; language: string; title: string };

	let raw = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	/** One row per file when several are chosen at once. */
	let results = $state<Array<{ name: string; ok: boolean; message: string; stories?: Imported[] }>>([]);

	async function post(body: string): Promise<{ ok: boolean; message: string; stories?: Imported[] }> {
		const res = await fetch('/api/admin/stories/import', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body
		});
		const data = await res.json();
		return res.ok
			? { ok: true, message: 'Imported as a draft', stories: data.stories }
			: { ok: false, message: data?.message ?? 'Could not import.' };
	}

	async function readFile(e: Event) {
		const files = [...((e.currentTarget as HTMLInputElement).files ?? [])];
		errorMsg = '';
		results = [];
		if (files.length === 1) {
			raw = await files[0].text();
		} else if (files.length > 1) {
			await importMany(files);
		}
	}

	/** Several files: import each in turn and list what happened. One bad file does not stop the rest. */
	async function importMany(files: File[]) {
		saving = true;
		for (const file of files) {
			try {
				results = [...results, { name: file.name, ...(await post(await file.text())) }];
			} catch {
				results = [...results, { name: file.name, ok: false, message: 'Could not reach the server.' }];
			}
		}
		saving = false;
	}

	async function save() {
		if (saving) return;
		if (!raw.trim()) {
			errorMsg = 'Paste the story JSON or choose a file first.';
			return;
		}
		saving = true;
		errorMsg = '';
		try {
			const r = await post(raw);
			if (!r.ok) errorMsg = r.message;
			else if (r.stories?.length === 1) await goto(`/admin/stories/${r.stories[0].id}/preview`);
			else results = [{ name: 'Pasted story', ...r }];
		} catch {
			errorMsg = 'Could not reach the server. Check your connection and try again.';
		} finally {
			saving = false;
		}
	}

	const inputClass =
		'w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';
</script>

<svelte:head><title>CurioKids Admin — Import story</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a
		href="/admin"
		class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
	>
		<ArrowLeft size={16} strokeWidth={1.5} /> Stories
	</a>
	<h1 class="mb-2 font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Import story</h1>
	<p class="mb-6 text-sm text-slate-500">
		Add a story that is already written: no OpenAI call and no cost. Each language becomes its own
		draft, sharing one animated scene. Read it in the preview, then publish it from the stories list.
		The format is in <code>docs/scene-stories.md</code>.
	</p>

	<div class="flex flex-col gap-4" class:opacity-60={saving}>
		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-bold text-slate-700">Story JSON</span>
			<textarea
				bind:value={raw}
				oninput={() => (errorMsg = '')}
				rows="16"
				spellcheck="false"
				placeholder={'{ "character_id": "rabbit", "theme_id": "sharing", "age_tag": "5-6", "content": { "en": { … } } }'}
				class={inputClass}
			></textarea>
		</label>

		<label class="flex flex-wrap items-center gap-3 text-sm text-slate-600">
			<span class="font-bold text-slate-700">Or choose files</span>
			<input type="file" multiple accept=".json,application/json" onchange={readFile} class="text-sm" />
			<span class="w-full text-xs text-slate-500">
				One file fills the box above. Several files are imported straight away, each as its own draft.
			</span>
		</label>

		{#if results.length}
			<ul class="flex flex-col gap-1 rounded-xl bg-white p-3 text-sm ring-1 ring-slate-200" aria-live="polite">
				{#each results as r (r.name)}
					<li class="flex flex-wrap items-baseline gap-2">
						<span class="font-semibold {r.ok ? 'text-emerald-700' : 'text-coral'}">{r.ok ? '✓' : '✗'}</span>
						<span class="font-mono text-xs text-slate-700">{r.name}</span>
						<span class="text-slate-500">{r.message}</span>
						{#each r.stories ?? [] as s (s.id)}
							<a href="/admin/stories/{s.id}/preview" class="text-xs font-semibold text-slate-600 underline">
								Preview {s.language.toUpperCase()}
							</a>
						{/each}
					</li>
				{/each}
			</ul>
			{#if !saving}
				<a href="/admin" class="text-sm font-semibold text-slate-600 underline">Go to all stories to publish them</a>
			{/if}
		{/if}

		{#if errorMsg}<p class="text-sm text-coral" role="alert">{errorMsg}</p>{/if}

		<button
			onclick={save}
			disabled={saving}
			class="inline-flex items-center justify-center gap-2 rounded-xl bg-coral px-6 py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-50"
		>
			<Upload size={18} strokeWidth={1.5} />
			{saving ? 'Importing…' : 'Import as draft'}
		</button>
	</div>
</div>
