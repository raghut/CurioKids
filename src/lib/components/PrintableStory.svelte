<script lang="ts">
	import type { Language } from '$lib/types';

	// Print-only picture-book layout: one story page per sheet, storybook-scale
	// type, images where present. Hidden on screen; appears only when printing.
	let {
		title,
		cover = '',
		pages = [],
		moral = '',
		reflectionQuestion = '',
		language = 'en'
	}: {
		title: string;
		cover?: string;
		pages?: Array<{ text: string; image: string }>;
		moral?: string;
		reflectionQuestion?: string;
		language?: Language;
	} = $props();

	const te = $derived(language === 'te');
</script>

<div class="hidden print:block text-black">
	<!-- Sheet 1: title page -->
	<section class="print-sheet flex flex-col items-center justify-center text-center gap-6">
		<h1
			class="text-4xl font-bold font-[family-name:var(--font-fraunces)] text-coral"
			lang={te ? 'te' : undefined}
		>
			{title}
		</h1>
		{#if cover}
			<img src={cover} alt="" class="max-w-full max-h-[13cm] object-contain rounded-2xl" />
		{/if}
		<p class="text-xl text-gray-500" lang={te ? 'te' : undefined}>
			{te ? 'క్యూరియోకిడ్స్‌తో తయారు చేయబడింది ✨' : 'Made with CurioKids ✨'}
		</p>
	</section>

	<!-- Sheets 2…N: one story page each -->
	{#each pages as page, i (i)}
		<section class="print-sheet flex flex-col items-center justify-center gap-6 text-center">
			{#if page.image}
				<img src={page.image} alt="" class="max-w-full max-h-[11cm] object-contain rounded-2xl" />
			{/if}
			<p class="text-2xl leading-relaxed max-w-[17cm]" lang={te ? 'te' : undefined}>{page.text}</p>
			<span class="text-base text-gray-400">{i + 1}</span>
		</section>
	{/each}

	<!-- Final sheet: moral + reflection + footer -->
	{#if moral || reflectionQuestion}
		<section class="print-sheet flex flex-col items-center justify-center text-center gap-10">
			{#if moral}
				<div>
					<p class="text-xl text-gray-500 mb-2" lang={te ? 'te' : undefined}>
						{te ? 'నీతి' : 'Moral'}
					</p>
					<p class="text-2xl italic leading-relaxed" lang={te ? 'te' : undefined}>{moral}</p>
				</div>
			{/if}
			{#if reflectionQuestion}
				<div>
					<p class="text-xl text-gray-500 mb-2" lang={te ? 'te' : undefined}>
						{te ? 'ఆలోచించు' : 'Think about it'}
					</p>
					<p class="text-2xl leading-relaxed" lang={te ? 'te' : undefined}>{reflectionQuestion}</p>
				</div>
			{/if}
			<p class="text-lg text-gray-400 mt-6" lang={te ? 'te' : undefined}>
				{te ? 'క్యూరియోకిడ్స్‌తో తయారు చేయబడింది ✨' : 'Made with CurioKids ✨'}
			</p>
		</section>
	{/if}
</div>

<style>
	@media print {
		/* Paper margins live here — NOT as element padding, which (combined with a
		   full-height sheet) pushed content past the page and created blank pages. */
		@page {
			margin: 1.4cm;
		}
	}

	/* One story page per sheet. break-after forces the next sheet onto a new page;
	   break-inside keeps a sheet from splitting. No min-height/padding here, so a
	   sheet is only as tall as its content and always fits one page. */
	.print-sheet {
		break-after: page;
		break-inside: avoid;
		/* Center content on the page without forcing overflow. */
		min-height: 24cm;
	}
	.print-sheet:last-child {
		break-after: auto;
	}
</style>
