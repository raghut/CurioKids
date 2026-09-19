<script lang="ts">
	import './layout.css';
	import { language } from '$lib/stores/language';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';

	let { children } = $props();
	let showSplash = $state(true);
	let mounted = $state(false);

	// The admin dashboard (/admin/*) is a separate tool — it must not inherit the
	// kid app's splash screen or the language-picker redirect.
	const isAdmin = $derived($page.url.pathname.startsWith('/admin'));

	onMount(() => {
		mounted = true;
		// Show splash for 1 second on first load
		setTimeout(() => {
			showSplash = false;
		}, 1000);
	});

	// Redirect to language picker if no language set (except if already there, or in admin)
	$effect(() => {
		if (mounted && !showSplash && !isAdmin && $language === null && $page.url.pathname !== '/language') {
			goto('/language');
		}
	});
</script>

{#if showSplash && !isAdmin}
	<div class="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
		<h1 class="text-5xl font-[family-name:var(--font-fraunces)] font-bold text-coral">
			CurioKids
		</h1>
		<p class="mt-2 text-lg text-peach">Wonder. Stories. Discovery.</p>
	</div>
{:else}
	{@render children()}
{/if}
