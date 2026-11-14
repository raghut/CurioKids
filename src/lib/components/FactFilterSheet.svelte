<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import { EMPTY_FACT_FILTER, type FactFilter } from '$lib/data/filterFacts';
	import type { Language } from '$lib/types';

	/**
	 * The Why & How? filter sheet. Mirrors StoryFilterSheet on purpose — full screen, a
	 * draft that changes nothing until "Show facts", Clear and X — so the two lists behave
	 * the same for a child. New filters are new sections in the scrolling middle.
	 */
	let { open, filter, lang = 'en', onapply, onclose }: {
		open: boolean;
		filter: FactFilter;
		lang?: Language;
		onapply: (next: FactFilter) => void;
		onclose: () => void;
	} = $props();

	const te = $derived(lang === 'te');

	let draft = $state<FactFilter>(untrack(() => ({ ...filter })));
	let wasOpen = false;

	$effect(() => {
		if (open && !wasOpen) draft = { ...filter };
		wasOpen = open;
	});

	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = open ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	const toggleUnread = () => (draft = { ...draft, unreadOnly: !draft.unreadOnly });

	const chip = 'rounded-2xl border-2 p-4 text-xl font-bold transition-colors min-h-[64px]';
	const teText = $derived(te ? 'leading-relaxed' : undefined);

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window on:keydown={open ? onkeydown : undefined} />

{#if open}
	<div
		class="fixed inset-0 z-50 flex flex-col bg-white"
		role="dialog"
		aria-modal="true"
		aria-label={te ? 'విషయాలు ఎంచుకో' : 'Choose facts'}
		transition:fade={{ duration: 150 }}
	>
		<header class="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
			<h2 class="text-2xl font-bold" lang={te ? 'te' : undefined} class:leading-relaxed={te}>
				{te ? 'విషయాలు ఎంచుకో' : 'Choose facts'}
			</h2>
			<button
				type="button"
				class="grid min-h-[64px] min-w-[64px] place-items-center rounded-full hover:bg-gray-100"
				aria-label={te ? 'మూసేయి' : 'Close'}
				onclick={onclose}
			>
				<X size={28} strokeWidth={1.5} />
			</button>
		</header>

		<div class="min-h-0 flex-1 overflow-y-auto p-6">
			<section>
				<h3 class="mb-3 text-lg font-bold text-gray-500" lang={te ? 'te' : undefined}>
					{te ? 'కొత్త విషయాలు' : 'New facts'}
				</h3>
				<button
					type="button"
					class="{chip} w-full bg-mint/30 text-left {draft.unreadOnly
						? 'border-coral'
						: 'border-transparent'}"
					aria-pressed={draft.unreadOnly}
					onclick={toggleUnread}
				>
					<span lang={te ? 'te' : undefined} class={teText}>
						{te ? 'ఇంకా చదవలేదు' : 'Not read yet'}
					</span>
				</button>
			</section>
		</div>

		<footer class="flex shrink-0 gap-3 border-t border-gray-100 p-6">
			<button
				type="button"
				class="min-h-[64px] rounded-2xl border-2 border-gray-200 px-6 text-xl font-bold text-gray-500"
				onclick={() => (draft = { ...EMPTY_FACT_FILTER })}
			>
				<span lang={te ? 'te' : undefined} class={teText}>{te ? 'తీసేయి' : 'Clear'}</span>
			</button>
			<button
				type="button"
				class="min-h-[64px] flex-1 rounded-2xl bg-coral/80 text-xl font-bold text-white"
				onclick={() => onapply(draft)}
			>
				<span lang={te ? 'te' : undefined} class={teText}>
					{te ? 'విషయాలు చూపించు' : 'Show facts'}
				</span>
			</button>
		</footer>
	</div>
{/if}
