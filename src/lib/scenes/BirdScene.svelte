<script lang="ts">
	/**
	 * How birds fly: wings push air down, the air pushes the bird up, curved wings glide,
	 * and a close-up of a light feather. Wings beat only while `flap` is on.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A bird flying, pushing air down with its wings"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<g fill="#FFFFFF">
		<path d="M440 70 a18 18 0 0 1 12 -30 a26 26 0 0 1 48 -6 a18 18 0 0 1 30 20 a12 12 0 0 1 -4 16 Z" />
		<path d="M90 280 a14 14 0 0 1 10 -24 a20 20 0 0 1 38 -4 a14 14 0 0 1 22 16 Z" />
	</g>
	<path d="M0 320 Q140 296 280 318 Q440 292 680 316 L680 360 L0 360 Z" fill="#B8E6C1" />

	<!-- Layer: air pushed down under the wings -->
	<g class="layer" style:opacity={op('push')} stroke="#7FB6E0" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
		{#each [220, 260, 300, 340, 380] as x (x)}
			<g class="down">
				<path d="M{x} 236 L{x} 274 M{x - 7} 266 L{x} 276 L{x + 7} 266" />
			</g>
		{/each}
	</g>

	<!-- Layer: flapping — motion lines over the wings (the wings themselves beat too) -->
	<g class="layer" style:opacity={op('flap')} stroke="#A9B6C0" stroke-width="2.5" fill="none" stroke-linecap="round">
		<path d="M170 96 q-10 -14 -4 -30 M190 84 q-8 -16 0 -30 M152 112 q-14 -10 -14 -26" />
	</g>

	<!-- Layer: the air pushing the bird up -->
	<g class="layer" style:opacity={op('lift')} stroke="#FFB89A" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M300 92 L300 40 M286 54 L300 38 L314 54" />
	</g>

	<!-- Bird (always) -->
	<g transform="translate(300 170)">
		<g class="wing" class:moving={shown.has('flap')} style:transform-origin="0px 0px">
			<path d="M-6 -4 Q-60 -80 -120 -60 Q-80 -30 -60 6 Z" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="2" />
		</g>
		<path d="M50 0 L96 -22 L92 22 Z" fill="#7FB6E0" />
		<ellipse cx="0" cy="8" rx="62" ry="30" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="2" />
		<circle cx="-58" cy="-10" r="24" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="2" />
		<path d="M-80 -12 L-104 -4 L-80 2 Z" fill="#FFD27A" />
		<circle cx="-64" cy="-16" r="4" fill="#4E3A2E" />
		<g class="wing" class:moving={shown.has('flap')} style:transform-origin="0px 0px">
			<path d="M0 -2 Q-40 -86 -100 -78 Q-66 -40 -48 8 Z" fill="#CDE8F2" stroke="#7FB6E0" stroke-width="2" />
		</g>
	</g>

	<!-- Layer: a second bird gliding, air sliding over its curved wing -->
	<g class="layer" style:opacity={op('glide')}>
		<g transform="translate(560 120) scale(0.7)">
			<path d="M-120 -6 Q-60 -40 0 -6 Q60 -40 120 -6 Q60 -20 0 6 Q-60 -20 -120 -6 Z" fill="#FFB89A" stroke="#F09A7E" stroke-width="2" />
			<ellipse cx="0" cy="2" rx="22" ry="12" fill="#FFB89A" stroke="#F09A7E" stroke-width="2" />
		</g>
		<g stroke="#A9B6C0" stroke-width="2" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
			<path class="flow" d="M470 92 Q520 74 560 92 Q600 74 650 92" />
			<path class="flow" d="M470 128 L650 128" />
		</g>
	</g>

	<!-- Layer: a close-up of a feather -->
	<g class="layer" style:opacity={op('feather')}>
		<circle cx="100" cy="100" r="66" fill="#FFFFFF" stroke="#FFB89A" stroke-width="3" />
		<path d="M64 146 L136 54" stroke="#C79A7C" stroke-width="3" stroke-linecap="round" />
		<path d="M136 54 Q160 90 112 130 L80 126 Q90 80 136 54 Z" fill="#CDE8F2" stroke="#7FB6E0" stroke-width="1.5" />
		<g stroke="#7FB6E0" stroke-width="1.2">
			<path d="M124 70 L144 78 M116 82 L140 94 M108 94 L132 110 M98 106 L120 124 M120 76 L98 70 M110 90 L86 86 M100 104 L80 104" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .wing.moving {
			animation: flap 1s ease-in-out infinite;
		}
		.animate .down {
			animation: down 1s ease-in infinite;
		}
		.animate .flow {
			animation: flow 1.6s linear infinite;
		}
	}
	@keyframes flap {
		0%,
		100% {
			transform: rotate(0deg) scaleY(1);
		}
		50% {
			transform: rotate(-12deg) scaleY(-0.6);
		}
	}
	@keyframes down {
		0% {
			transform: translateY(-8px);
			opacity: 0;
		}
		40% {
			opacity: 1;
		}
		100% {
			transform: translateY(10px);
			opacity: 0;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -28;
		}
	}
</style>
