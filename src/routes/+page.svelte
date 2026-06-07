<script lang="ts">
	import { language } from '$lib/stores/language';
	import { Settings } from 'lucide-svelte';

	const te = $derived($language === 'te');
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

		<a
			href="/create"
			class="flex-1 rounded-3xl bg-mint/40 p-8 flex items-center justify-center min-h-[120px] shadow-sm hover:shadow-md transition-shadow"
		>
			<span class="text-2xl font-bold" class:lang-te={te} lang={te ? 'te' : undefined}>
				{te ? 'సృష్టించు' : 'Create'}
			</span>
		</a>
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
