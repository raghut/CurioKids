<script lang="ts">
	/**
	 * How a fish breathes: water in through the mouth, over the gills (which take the air
	 * dissolved in it), and out behind the gill flap. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const IN = 'M90 176 Q160 172 238 180';
	const OUT = 'M352 194 Q390 222 440 244';
	const bubbles = [
		{ x: 230, d: 0 }, { x: 250, d: 1.2 }, { x: 214, d: 2.1 }
	];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A fish in the water, breathing through its gills"
>
	<rect width="680" height="360" fill="#CDEBF5" />
	<rect width="680" height="40" fill="#DDF2F9" />
	<path d="M0 320 Q170 304 340 320 Q510 306 680 318 L680 360 L0 360 Z" fill="#F6E6C8" />
	<g stroke="#7DC68E" stroke-width="6" fill="none" stroke-linecap="round">
		<path class="sway" d="M70 330 Q56 290 76 260 Q92 230 74 200" style:transform-origin="70px 330px" />
		<path class="sway" d="M600 330 Q620 296 600 268 Q584 240 604 214" style:transform-origin="600px 330px" style:animation-delay="-1s" />
		<path class="sway" d="M628 330 Q612 300 630 276" style:transform-origin="628px 330px" style:animation-delay="-2s" />
	</g>

	<!-- Layer: water flowing into the mouth -->
	<g class="layer" style:opacity={op('water-in')}>
		<path d={IN} stroke="#FFFFFF" stroke-width="10" fill="none" stroke-linecap="round" opacity="0.6" />
		<path class="flow" d={IN} stroke="#5FA3D6" stroke-width="3" stroke-dasharray="6 12" fill="none" stroke-linecap="round" />
	</g>

	<!-- Fish (always) -->
	<g>
		<path d="M470 180 L540 130 Q528 180 540 230 Z" fill="#FF8B7B" />
		<ellipse cx="350" cy="182" rx="118" ry="64" fill="#FFB89A" stroke="#F09A7E" stroke-width="2.5" />
		<path d="M330 120 Q370 92 420 124" fill="#FF8B7B" />
		<path d="M380 238 Q404 262 430 236" fill="#FF8B7B" />
		<g fill="#FFD3BF">
			<circle cx="400" cy="170" r="6" /><circle cx="420" cy="194" r="6" /><circle cx="384" cy="200" r="6" />
		</g>
		<circle cx="268" cy="166" r="11" fill="#FFFFFF" />
		<circle cx="265" cy="166" r="5.5" fill="#4E3A2E" />
		<path d="M236 186 q8 6 16 0" stroke="#C26B54" stroke-width="3" fill="none" stroke-linecap="round" />
		<!-- Gill flap -->
		<path d="M326 132 Q350 182 326 232" stroke="#E6876B" stroke-width="3.5" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: the gills, feathery and pink, under the flap -->
	<g class="layer" style:opacity={op('gills')} stroke="#FF8B7B" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M334 150 q10 14 0 28 M342 146 q12 18 0 38 M350 150 q12 16 0 30" />
		<path d="M334 190 q10 12 0 26 M342 186 q12 16 0 32" />
	</g>

	<!-- Layer: air from the water passing into the gills -->
	<g class="layer" style:opacity={op('oxygen')} fill="#FFFFFF" stroke="#5FA3D6" stroke-width="1.2">
		<circle class="pulse" cx="300" cy="172" r="4" />
		<circle class="pulse" cx="318" cy="188" r="3.5" style:animation-delay="-0.5s" />
		<circle class="pulse" cx="340" cy="168" r="3.5" style:animation-delay="-1s" />
		<circle class="pulse" cx="346" cy="204" r="3" style:animation-delay="-1.5s" />
	</g>

	<!-- Layer: water leaving behind the gill flap -->
	<g class="layer" style:opacity={op('water-out')}>
		<path class="flow" d={OUT} stroke="#5FA3D6" stroke-width="3" stroke-dasharray="6 12" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: bubbles rising -->
	<g class="layer" style:opacity={op('bubbles')} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5">
		{#each bubbles as b (b.x)}
			<g transform="translate({b.x} 150)">
				<circle class="rise" r="6" style:animation-delay="-{b.d}s" />
			</g>
		{/each}
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.6s linear infinite;
		}
		.animate .rise {
			animation: rise 3.2s linear infinite;
		}
		.animate .pulse {
			animation: pulse 2s ease-in-out infinite;
		}
		.animate .sway {
			animation: sway 3.5s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -36;
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
			transform: translateY(-120px);
			opacity: 0;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
</style>
