<script lang="ts">
	import { untrack } from 'svelte';
	import { fade } from 'svelte/transition';
	import { X } from 'lucide-svelte';
	import { AGE_BANDS, EMPTY_FILTER, type StoryFilter } from '$lib/data/filterStories';
	import type { AgeBand, Language, ThemeId, ThemeOption } from '$lib/types';

	let { open, filter, themes, lang = 'en', onapply, onclose }: {
		open: boolean;
		/** The filter currently in effect. Copied into a draft each time the sheet opens. */
		filter: StoryFilter;
		/** The resolved ACTIVE theme list, passed in — never imported. */
		themes: ThemeOption[];
		lang?: Language;
		onapply: (next: StoryFilter) => void;
		onclose: () => void;
	} = $props();

	const te = $derived(lang === 'te');

	// Choices are held as a DRAFT: nothing changes behind the sheet until "Show
	// stories" is pressed, so a child can try combinations without the grid moving
	// under them. Dismissing with X discards the draft.
	let draft = $state<StoryFilter>(untrack(() => ({ ...filter })));
	let wasOpen = false;

	$effect(() => {
		if (open && !wasOpen) draft = { ...filter };
		wasOpen = open;
	});

	// Stop the grid behind the sheet scrolling under a child's finger.
	$effect(() => {
		if (typeof document === 'undefined') return;
		document.body.style.overflow = open ? 'hidden' : '';
		return () => {
			document.body.style.overflow = '';
		};
	});

	// Tapping the lit chip clears that one — the same gesture as the grid used to have.
	const pickAge = (band: AgeBand) =>
		(draft = { ...draft, age: draft.age === band ? null : band });
	const pickTheme = (id: ThemeId) =>
		(draft = { ...draft, theme: draft.theme === id ? null : id });
	const toggleUnread = () => (draft = { ...draft, unreadOnly: !draft.unreadOnly });

	const themeColors = ['bg-peach/30', 'bg-sky-blue/30', 'bg-mint/30', 'bg-butter/30'];

	const chip = 'rounded-2xl border-2 p-4 text-xl font-bold transition-colors min-h-[64px]';
	const teText = $derived(te ? 'leading-relaxed' : undefined);

	function onkeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

<svelte:window on:keydown={open ? onkeydown : undefined} />

{#if open}
	<!-- Full screen rather than a small modal: bigger targets, no mis-taps, and the
	     whole choice is visible at once on a phone. -->
	<div
		class="fixed inset-0 z-50 flex flex-col bg-white"
		role="dialog"
		aria-modal="true"
		aria-label={te ? 'కథలు ఎంచుకో' : 'Choose stories'}
		transition:fade={{ duration: 150 }}
	>
		<header class="flex shrink-0 items-center justify-between border-b border-gray-100 p-6">
			<h2 class="text-2xl font-bold" lang={te ? 'te' : undefined} class:leading-relaxed={te}>
				{te ? 'కథలు ఎంచుకో' : 'Choose stories'}
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
			<section class="mb-8">
				<h3 class="mb-3 text-lg font-bold text-gray-500" lang={te ? 'te' : undefined}>
					{te ? 'వయసు' : 'Age'}
				</h3>
				<div class="flex gap-3">
					{#each AGE_BANDS as band (band)}
						<button
							type="button"
							class="{chip} flex-1 bg-sky-blue/30 {draft.age === band
								? 'border-coral'
								: 'border-transparent'}"
							aria-pressed={draft.age === band}
							onclick={() => pickAge(band)}
						>
							{band}
						</button>
					{/each}
				</div>
			</section>

			{#if themes.length}
				<section class="mb-8">
					<h3 class="mb-3 text-lg font-bold text-gray-500" lang={te ? 'te' : undefined}>
						{te ? 'కథ రకం' : 'Story kind'}
					</h3>
					<div class="grid grid-cols-2 gap-3">
						{#each themes as theme, i (theme.id)}
							<button
								type="button"
								class="{chip} text-left {themeColors[i % themeColors.length]} {draft.theme ===
								theme.id
									? 'border-coral'
									: 'border-transparent'}"
								aria-pressed={draft.theme === theme.id}
								onclick={() => pickTheme(theme.id)}
							>
								<span lang={te ? 'te' : undefined} class={teText}>
									{te ? theme.label_te : theme.label_en}
								</span>
							</button>
						{/each}
					</div>
				</section>
			{/if}

			<section>
				<h3 class="mb-3 text-lg font-bold text-gray-500" lang={te ? 'te' : undefined}>
					{te ? 'కొత్త కథలు' : 'New stories'}
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

		<!-- Pinned at the bottom, within thumb reach. "Show stories" is the big primary
		     action; Clear only empties the choices above and leaves the sheet open, so
		     a child can pick again without reopening. -->
		<footer class="flex shrink-0 gap-3 border-t border-gray-100 p-6">
			<button
				type="button"
				class="min-h-[64px] rounded-2xl border-2 border-gray-200 px-6 text-xl font-bold text-gray-500"
				onclick={() => (draft = { ...EMPTY_FILTER })}
			>
				<span lang={te ? 'te' : undefined} class={teText}>{te ? 'తీసేయి' : 'Clear'}</span>
			</button>
			<button
				type="button"
				class="min-h-[64px] flex-1 rounded-2xl bg-coral/80 text-xl font-bold text-white"
				onclick={() => onapply(draft)}
			>
				<span lang={te ? 'te' : undefined} class={teText}>
					{te ? 'కథలు చూపించు' : 'Show stories'}
				</span>
			</button>
		</footer>
	</div>
{/if}
