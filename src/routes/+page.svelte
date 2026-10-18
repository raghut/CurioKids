<script lang="ts">
	import { language } from '$lib/stores/language';
	import { Settings } from 'lucide-svelte';

	const te = $derived($language === 'te');

	/**
	 * The child-facing Create entry point is hidden for now (2026-10-18).
	 *
	 * Only the card is gated — `/create`, `/create/generating`, `/api/generate-story`
	 * and the whole generation pipeline are untouched and still work, so restoring it
	 * is this one line. Stories already generated stay visible in the Stories grid.
	 */
	const SHOW_CREATE = false;
</script>

<div class="min-h-screen bg-white p-6 flex flex-col">
	<header class="mb-8">
		<h1 class="text-3xl font-[family-name:var(--font-fraunces)] font-bold text-coral">
			CurioKids
		</h1>
	</header>

	<div class="flex-1 flex flex-col gap-5 max-w-md mx-auto w-full">
		<a
			href="/stories"
			class="flex-1 rounded-3xl bg-peach/40 p-8 flex items-center justify-center min-h-[120px] shadow-sm hover:shadow-md transition-shadow"
		>
			<span class="text-2xl font-bold" class:lang-te={te} lang={te ? 'te' : undefined}>
				{te ? 'కథలు' : 'Stories'}
			</span>
		</a>

		<a
			href="/facts"
			class="flex-1 rounded-3xl bg-sky-blue/40 p-8 flex items-center justify-center min-h-[120px] shadow-sm hover:shadow-md transition-shadow"
		>
			<span class="text-2xl font-bold" class:lang-te={te} lang={te ? 'te' : undefined}>
				{te ? 'ఎందుకు?' : 'Why?'}
			</span>
		</a>

		{#if SHOW_CREATE}
			<a
				href="/create"
				class="flex-1 rounded-3xl bg-mint/40 p-8 flex items-center justify-center min-h-[120px] shadow-sm hover:shadow-md transition-shadow"
			>
				<span class="text-2xl font-bold" class:lang-te={te} lang={te ? 'te' : undefined}>
					{te ? 'సృష్టించు' : 'Create'}
				</span>
			</a>
		{/if}
	</div>

	<footer class="mt-6 flex justify-end">
		<button
			onclick={() => language.reset()}
			class="p-3 rounded-full hover:bg-gray-100 transition-colors"
			aria-label="Change language"
		>
			<Settings size={24} strokeWidth={1.5} class="text-gray-400" />
		</button>
	</footer>
</div>
