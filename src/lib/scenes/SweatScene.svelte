<script lang="ts">
	/**
	 * Why we sweat: a close-up of skin on a hot day. Layers show the heat, the tiny coiled
	 * sweat makers under the skin, sweat drops coming out of pores, the drops drying into
	 * the air (taking heat with them), the skin cooling down, and a glass of water.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SKIN_TOP = 200;
	const pores = [180, 340, 500];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A close-up of skin with sweat drops cooling it down"
>
	<rect width="680" height={SKIN_TOP} fill="#EAF6FB" />
	<!-- Skin layers (always) -->
	<rect y={SKIN_TOP} width="680" height="40" fill="#FFD3BF" />
	<rect y={SKIN_TOP + 40} width="680" height="120" fill="#FFE8DA" />
	<g fill="#F7C6C0">
		{#each pores as x (x)}
			<rect x={x - 4} y={SKIN_TOP} width="8" height="40" />
		{/each}
	</g>

	<!-- Sweat makers, coiled under the skin (always, faint) -->
	<g stroke="#F0C4AE" stroke-width="5" fill="none" stroke-linecap="round">
		{#each pores as x (x)}
			<path d="M{x} {SKIN_TOP + 40} L{x} {SKIN_TOP + 90} q-20 6 0 14 q20 6 0 14 q-20 6 0 14" />
		{/each}
	</g>

	<!-- Layer: a hot day — sun and heat -->
	<g class="layer" style:opacity={op('hot')}>
		<g stroke="#FFB89A" stroke-width="4" stroke-linecap="round">
			{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
				<line x1="80" y1="18" x2="80" y2="10" transform="rotate({a} 80 56)" />
			{/each}
		</g>
		<circle cx="80" cy="56" r="28" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
		<rect y={SKIN_TOP} width="680" height="40" fill="#FFB89A" opacity="0.6" />
		<g stroke="#FFB89A" stroke-width="2.5" fill="none" stroke-linecap="round">
			<path class="shimmer" d="M260 190 q6 -10 0 -20 q-6 -10 0 -20" /><path class="shimmer" d="M420 190 q6 -10 0 -20 q-6 -10 0 -20" style:animation-delay="-0.8s" />
		</g>
	</g>

	<!-- Layer: the sweat makers working -->
	<g class="layer" style:opacity={op('gland')} stroke="#7FB6E0" stroke-width="5" fill="none" stroke-linecap="round">
		{#each pores as x (x)}
			<path d="M{x} {SKIN_TOP + 40} L{x} {SKIN_TOP + 90} q-20 6 0 14 q20 6 0 14 q-20 6 0 14" />
		{/each}
	</g>

	<!-- Layer: sweat drops on the skin -->
	<g class="layer" style:opacity={op('drops')} fill="#CDEBF5" stroke="#7FB6E0" stroke-width="2">
		{#each pores as x (x)}
			<path d="M{x} {SKIN_TOP - 30} Q{x + 14} {SKIN_TOP - 6} {x} {SKIN_TOP} Q{x - 14} {SKIN_TOP - 6} {x} {SKIN_TOP - 30} Z" />
		{/each}
	</g>

	<!-- Layer: drops drying into the air, carrying heat away -->
	<g class="layer" style:opacity={op('evaporate')} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5">
		{#each pores as x, i (x)}
			<g transform="translate({x} {SKIN_TOP - 40})"><circle class="rise" r="5" style:animation-delay="-{i * 0.8}s" /></g>
			<g transform="translate({x + 20} {SKIN_TOP - 50})"><circle class="rise" r="3.5" style:animation-delay="-{i * 0.8 + 1.2}s" /></g>
		{/each}
	</g>

	<!-- Layer: skin cooled down -->
	<g class="layer" style:opacity={op('cool')}>
		<rect y={SKIN_TOP} width="680" height="40" fill="#A8D8EA" opacity="0.35" />
		<g fill="#A8D8EA"><path d="M600 60 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" /></g>
	</g>

	<!-- Layer: a glass of water to drink -->
	<g class="layer" style:opacity={op('water')}>
		<path d="M560 70 L630 70 L622 180 L568 180 Z" fill="#FFFFFF" stroke="#C9D3DA" stroke-width="2.5" />
		<path d="M563 100 L627 100 L622 180 L568 180 Z" fill="#A8D8EA" opacity="0.8" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .rise {
			animation: rise 3s linear infinite;
		}
		.animate .shimmer {
			animation: shimmer 2s ease-in-out infinite;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20%,
		80% {
			opacity: 1;
		}
		100% {
			transform: translateY(-90px);
			opacity: 0;
		}
	}
	@keyframes shimmer {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
</style>
