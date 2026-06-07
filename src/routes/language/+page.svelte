<script lang="ts">
	import { language } from '$lib/stores/language';
	import { goto } from '$app/navigation';

	function pick(lang: 'en' | 'te') {
		language.set(lang);
		goto('/');
	}
</script>

<div class="min-h-screen flex flex-col items-center justify-center gap-8 p-6 bg-white">
	<h1 class="text-3xl font-[family-name:var(--font-fraunces)] font-bold text-coral">
		Choose Language
	</h1>

	<div class="flex flex-col gap-4 w-full max-w-xs">
		<button
			onclick={() => pick('en')}
			class="w-full py-6 rounded-2xl bg-sky-blue text-2xl font-bold shadow-sm hover:shadow-md transition-shadow"
		>
			English
		</button>
		<button
			onclick={() => pick('te')}
			class="w-full py-6 rounded-2xl bg-peach text-2xl font-bold shadow-sm hover:shadow-md transition-shadow"
		>
			తెలుగు
		</button>
	</div>
</div>
