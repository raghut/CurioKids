<script lang="ts">
	import { goto } from '$app/navigation';
	import { ArrowLeft, Upload } from 'lucide-svelte';

	let raw = $state('');
	let saving = $state(false);
	let errorMsg = $state('');

	async function readFile(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		if (file) {
			raw = await file.text();
			errorMsg = '';
		}
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

		<label class="flex items-center gap-3 text-sm text-slate-600">
			<span class="font-bold text-slate-700">Or choose a file</span>
			<input type="file" accept=".json,application/json" onchange={readFile} class="text-sm" />
		</label>

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
