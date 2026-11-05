<script lang="ts">
	/**
	 * How an aeroplane flies: engines pushing it forward, air flowing over and under the
	 * curved wings, the wings' lift (up), the plane's weight (down), and the tail and flaps
	 * that steer it.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const BODY = '#FFFFFF';
	const EDGE = '#C9D3DA';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="An aeroplane flying with air flowing around its wings"
>
	<rect width="680" height="360" fill="#DDF0F8" />
	<g fill="#FFFFFF"><path d="M60 90 a16 16 0 0 1 10 -26 a24 24 0 0 1 44 -4 a16 16 0 0 1 26 18 Z" /><path d="M520 300 a16 16 0 0 1 10 -26 a24 24 0 0 1 44 -4 a16 16 0 0 1 26 18 Z" /></g>

	<!-- Layer: air flowing over and under the wing -->
	<g class="layer" style:opacity={op('air')} stroke="#7FB6E0" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-dasharray="8 10">
		<path class="flow" d="M560 150 Q420 126 340 156 Q260 182 100 160" />
		<path class="flow" d="M560 214 Q420 214 340 206 Q260 200 100 214" />
	</g>

	<!-- Plane (always) -->
	<g>
		<path d="M500 168 Q540 170 560 180 Q540 192 500 194 L170 194 Q140 194 130 180 Q140 168 170 168 Z" fill={BODY} stroke={EDGE} stroke-width="2.5" />
		<path d="M190 168 L150 112 L176 112 L230 168 Z" fill="#FFB89A" />
		<path d="M380 172 Q330 150 250 150 L290 176 Z" fill="#E6EEF2" stroke={EDGE} stroke-width="2" />
		<path d="M400 190 L300 240 L330 240 L430 190 Z" fill={BODY} stroke={EDGE} stroke-width="2.5" />
		<rect x="336" y="204" width="44" height="18" rx="9" fill="#C9D3DA" />
		<g fill="#A8D8EA">
			{#each [250, 280, 310, 340, 370, 400, 430, 460] as x (x)}<circle cx={x} cy="178" r="4" />{/each}
		</g>
		<path d="M520 172 Q540 174 548 180 L520 180 Z" fill="#A8D8EA" />
	</g>

	<!-- Layer: engines pushing the plane forward -->
	<g class="layer" style:opacity={op('engines')} stroke="#C9C3BA" stroke-width="4" stroke-linecap="round">
		<line class="blow" x1="330" y1="213" x2="270" y2="213" />
		<line class="blow" x1="320" y1="206" x2="280" y2="200" style:animation-delay="-0.3s" />
		<line class="blow" x1="320" y1="220" x2="280" y2="226" style:animation-delay="-0.6s" />
		<path d="M600 140 L640 140 M630 130 L642 140 L630 150" stroke="#FFB89A" stroke-width="4" fill="none" stroke-linejoin="round" />
	</g>

	<!-- Layer: lift pushing up under the wings -->
	<g class="layer" style:opacity={op('lift')} stroke="#7DC68E" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M360 120 L360 70 M346 84 L360 68 L374 84" />
	</g>

	<!-- Layer: the plane's weight pulling down -->
	<g class="layer" style:opacity={op('weight')} stroke="#A9A39B" stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M300 260 L300 310 M286 296 L300 312 L314 296" />
	</g>

	<!-- Layer: tail and wing flaps that steer -->
	<g class="layer" style:opacity={op('steer')}>
		<path class="tilt" d="M150 112 L176 112 L184 124 L158 124 Z" fill="#FF8B7B" style:transform-origin="170px 118px" />
		<path class="tilt" d="M300 240 L330 240 L326 250 L296 250 Z" fill="#FF8B7B" style:transform-origin="314px 244px" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1s linear infinite;
		}
		.animate .blow {
			animation: blow 0.9s ease-in-out infinite;
		}
		.animate .tilt {
			animation: tilt 2s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: 36;
		}
	}
	@keyframes blow {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes tilt {
		0%,
		100% {
			transform: rotate(-6deg);
		}
		50% {
			transform: rotate(6deg);
		}
	}
</style>
