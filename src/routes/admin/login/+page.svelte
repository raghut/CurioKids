<script lang="ts">
	import { enhance } from '$app/forms';
	import { Lock } from 'lucide-svelte';
	let { form } = $props();
	let submitting = $state(false);
</script>

<svelte:head><title>CurioKids Admin — Sign in</title></svelte:head>

<div class="min-h-screen flex items-center justify-center bg-slate-50 px-4">
	<div class="w-full max-w-sm rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
		<div class="mb-6 flex flex-col items-center gap-2 text-center">
			<span class="grid h-12 w-12 place-items-center rounded-full bg-peach/30 text-coral">
				<Lock size={22} strokeWidth={1.5} />
			</span>
			<h1 class="font-[family-name:var(--font-fraunces)] text-2xl font-bold text-slate-800">
				Admin
			</h1>
			<p class="text-sm text-slate-500">Enter the admin passcode to continue.</p>
		</div>

		<form
			method="POST"
			action="?/login"
			use:enhance={() => {
				submitting = true;
				return async ({ update }) => {
					await update();
					submitting = false;
				};
			}}
			class="flex flex-col gap-4"
		>
			<input
				name="passcode"
				type="password"
				autocomplete="current-password"
				placeholder="Passcode"
				required
				class="w-full rounded-xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-sky-blue focus:ring-2 focus:ring-sky-blue/40"
			/>

			{#if form?.error}
				<p class="text-sm text-coral" role="alert">{form.error}</p>
			{/if}

			<button
				type="submit"
				disabled={submitting}
				class="w-full rounded-xl bg-coral py-3 font-bold text-white transition hover:brightness-105 disabled:opacity-60"
			>
				{submitting ? 'Checking…' : 'Sign in'}
			</button>
		</form>
	</div>
</div>
