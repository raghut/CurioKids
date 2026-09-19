<script lang="ts">
	let {
		open = $bindable(false),
		title,
		message,
		confirmLabel = 'Confirm',
		destructive = false,
		onconfirm
	}: {
		open: boolean;
		title: string;
		message: string;
		confirmLabel?: string;
		destructive?: boolean;
		onconfirm: () => void;
	} = $props();

	function close() {
		open = false;
	}
	function confirm() {
		onconfirm();
		open = false;
	}
</script>

<svelte:window on:keydown={(e) => open && e.key === 'Escape' && close()} />

{#if open}
	<div class="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
		<button class="absolute inset-0 bg-slate-900/40" aria-label="Close" onclick={close}></button>
		<div class="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
			<h2 class="text-lg font-bold text-slate-800">{title}</h2>
			<p class="mt-2 text-sm text-slate-600">{message}</p>
			<div class="mt-6 flex justify-end gap-3">
				<button
					onclick={close}
					class="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
				>
					Cancel
				</button>
				<button
					onclick={confirm}
					class="rounded-lg px-4 py-2 text-sm font-bold text-white {destructive ? 'bg-coral' : 'bg-sky-blue'} hover:brightness-105"
				>
					{confirmLabel}
				</button>
			</div>
		</div>
	</div>
{/if}
