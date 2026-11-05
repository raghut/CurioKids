<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Upload } from 'lucide-svelte';

	let raw = $state('');
	let saving = $state(false);
	let errorMsg = $state('');
	/** One row per file when several are chosen at once. */
	let results = $state<Array<{ name: string; ok: boolean; message: string; id?: string }>>([]);

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

	/**
	 * Several files: import each one in turn and list what happened, instead of jumping to
	 * a preview. One bad file does not stop the others — each is its own draft.
	 */
	async function importMany(files: File[]) {
		saving = true;
		for (const file of files) {
			try {
				const res = await fetch('/api/admin/facts/import', {
					method: 'POST',
					headers: { 'content-type': 'application/json' },
					body: await file.text()
				});
				const data = await res.json();
				results = [
					...results,
					res.ok
						? { name: file.name, ok: true, message: 'Imported as a draft', id: data.fact.id }
						: { name: file.name, ok: false, message: data?.message ?? 'Could not import.' }
				];
			} catch {
				results = [...results, { name: file.name, ok: false, message: 'Could not reach the server.' }];
			}
		}
		saving = false;
	}

	async function save() {
		if (saving) return;
		if (!raw.trim()) {
			errorMsg = 'Paste the fact JSON or choose a file first.';
			return;
		}
		saving = true;
		errorMsg = '';
		try {
			const res = await fetch('/api/admin/facts/import', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: raw
			});
			const data = await res.json();
			if (!res.ok) errorMsg = data?.message ?? 'Could not import the fact. Try again.';
			else await goto(`/admin/facts/${data.fact.id}/preview`);
		} catch {
			errorMsg = 'Could not reach the server. Check your connection and try again.';
		} finally {
			saving = false;
		}
	}

	const inputClass =
		'w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-xs outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/30';
</script>

<svelte:head><title>CurioKids Admin — Import fact</title></svelte:head>

<div class="mx-auto max-w-2xl">
	<a
		href="/admin/facts"
		class="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-700"
	>
		<ArrowLeft size={16} strokeWidth={1.5} /> Facts
	</a>
	<h1 class="mb-2 font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">Import fact</h1>
	<p class="mb-6 text-sm text-slate-500">
		Add a fact that is already written: no OpenAI call and no cost. It is checked with the same rules
		as a generated fact, saved as a draft, and opened in the preview so you can read it before
		publishing. The format is in <code>docs/scene-facts.md</code>.
	</p>

	<div class="flex flex-col gap-4" class:opacity-60={saving}>
		<label class="flex flex-col gap-1.5">
			<span class="text-sm font-bold text-slate-700">Fact JSON</span>
			<textarea
				bind:value={raw}
				oninput={() => (errorMsg = '')}
				rows="16"
				spellcheck="false"
				placeholder={'{ "topic": "…", "structure": [ … ], "content": { "en": { … }, "te": { … } } }'}
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
						{#if r.id}
							<a href="/admin/facts/{r.id}/preview" class="text-xs font-semibold text-slate-600 underline">Preview</a>
						{/if}
					</li>
				{/each}
			</ul>
			{#if !saving}
				<a href="/admin/facts" class="text-sm font-semibold text-slate-600 underline">Go to all facts to publish them</a>
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
