<script lang="ts">
	/**
	 * How we hear: a bell rings, sound waves travel into the ear, the eardrum shakes, three
	 * tiny bones pass the shake on, the snail-shaped part inside turns it into a message,
	 * and the message goes to the brain.
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
	aria-label="Sound waves from a bell travelling into an ear and on to the brain"
>
	<rect width="680" height="360" fill="#F7FBFC" />

	<!-- Bell (always) -->
	<g class:ring={shown.has('sound')} class="bell" style:transform-origin="70px 120px">
		<path d="M44 190 Q46 130 70 120 Q94 130 96 190 Z" fill="#FFE4A3" stroke="#E8B868" stroke-width="2.5" />
		<rect x="38" y="188" width="64" height="10" rx="4" fill="#E8B868" />
		<circle cx="70" cy="204" r="7" fill="#C79A7C" />
	</g>

	<!-- Head side, cut away (always) -->
	<path d="M250 20 Q520 0 600 160 Q640 300 520 350 L250 350 Z" fill="#FFE8DA" stroke="#F0C4AE" stroke-width="3" />
	<!-- Outer ear -->
	<path d="M250 110 Q200 100 196 170 Q194 236 250 250 Q236 214 240 180 Q244 140 260 132 Z" fill="#FFD3BF" stroke="#F0B49E" stroke-width="2.5" />
	<!-- Ear canal -->
	<path d="M240 168 L350 168 L350 196 L240 196 Z" fill="#FFF4EE" stroke="#F0C4AE" stroke-width="2" />
	<!-- Eardrum -->
	<ellipse cx="352" cy="182" rx="5" ry="22" fill="#F7C6C0" stroke="#EDA79B" stroke-width="2" />
	<!-- Tiny bones -->
	<g fill="#FFFFFF" stroke="#D9CFC4" stroke-width="2"><circle cx="370" cy="174" r="7" /><circle cx="386" cy="186" r="6" /><circle cx="400" cy="176" r="5" /></g>
	<!-- The snail -->
	<path d="M420 180 a26 26 0 1 1 26 26 a18 18 0 1 1 -18 -18 a10 10 0 1 1 10 10" fill="none" stroke="#E8C9B0" stroke-width="7" stroke-linecap="round" />
	<!-- Brain + nerve -->
	<path d="M470 70 q-24 -30 8 -44 q16 -24 40 -4 q30 -6 28 24 q20 20 -4 38 q-4 24 -36 18 q-24 12 -36 -32 Z" fill="#F9D9D2" stroke="#EDB7AD" stroke-width="2.5" />
	<path d="M470 190 Q520 160 500 110" stroke="#F0C4AE" stroke-width="6" fill="none" stroke-linecap="round" />

	<!-- Layer: sound waves leaving the bell -->
	<g class="layer" style:opacity={op('sound')} stroke="#7FB6E0" stroke-width="3" fill="none" stroke-linecap="round">
		{#each [0, 1, 2] as i (i)}
			<path class="wave" d="M{120 + i * 30} 130 Q{140 + i * 30} 182 {120 + i * 30} 234" style:animation-delay="-{i * 0.4}s" />
		{/each}
	</g>

	<!-- Layer: waves travelling down the ear canal -->
	<g class="layer" style:opacity={op('canal')} stroke="#7FB6E0" stroke-width="2.5" fill="none" stroke-linecap="round">
		{#each [260, 286, 312] as x, i (x)}
			<path class="wave" d="M{x} 172 Q{x + 8} 182 {x} 192" style:animation-delay="-{i * 0.3}s" />
		{/each}
	</g>

	<!-- Layer: the eardrum shaking -->
	<g class="layer" style:opacity={op('drum')}>
		<ellipse class="shake" cx="352" cy="182" rx="5" ry="22" fill="#FF8B7B" stroke="#E86F5E" stroke-width="2" style:transform-origin="352px 182px" />
	</g>

	<!-- Layer: the three tiny bones passing the shake on -->
	<g class="layer" style:opacity={op('bones')}>
		<g class="shake" style:transform-origin="385px 180px" fill="#FFE4A3" stroke="#E8B868" stroke-width="2">
			<circle cx="370" cy="174" r="7" /><circle cx="386" cy="186" r="6" /><circle cx="400" cy="176" r="5" />
		</g>
	</g>

	<!-- Layer: the snail-shaped part turning it into a message -->
	<g class="layer" style:opacity={op('snail')}>
		<path d="M420 180 a26 26 0 1 1 26 26 a18 18 0 1 1 -18 -18 a10 10 0 1 1 10 10" fill="none" stroke="#FFB89A" stroke-width="7" stroke-linecap="round" />
	</g>

	<!-- Layer: the message reaching the brain -->
	<g class="layer" style:opacity={op('brain')}>
		<path class="flow" d="M470 190 Q520 160 500 110" stroke="#FF8B7B" stroke-width="3" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
		<path d="M470 70 q-24 -30 8 -44 q16 -24 40 -4 q30 -6 28 24 q20 20 -4 38 q-4 24 -36 18 q-24 12 -36 -32 Z" fill="#FFD3BF" opacity="0.7" />
		<g fill="#FFD27A"><path d="M560 40 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" /></g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .bell.ring {
			animation: ring 0.8s ease-in-out infinite;
		}
		.animate .wave {
			animation: wave 1.2s ease-in-out infinite;
		}
		.animate .shake {
			animation: shake 0.3s ease-in-out infinite;
		}
		.animate .flow {
			animation: flow 1.4s linear infinite;
		}
	}
	@keyframes ring {
		0%,
		100% {
			transform: rotate(-8deg);
		}
		50% {
			transform: rotate(8deg);
		}
	}
	@keyframes wave {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes shake {
		0%,
		100% {
			transform: translateX(-1.5px);
		}
		50% {
			transform: translateX(1.5px);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -32;
		}
	}
</style>
