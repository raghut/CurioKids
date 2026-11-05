<script lang="ts">
	/**
	 * How plants drink: water in the soil, soaked up by roots, carried up the stem, and
	 * breathed out from the leaves; plus the coloured-water-and-white-flower experiment.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const STEM = '#5FAE72';
	const LEAF = '#7DC68E';
	const WATER = '#5FA3D6';
	const soilDrops = [[250, 280], [430, 290], [300, 320], [400, 330], [220, 330], [470, 320]];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A plant drawing water up from its roots to its leaves"
>
	<rect width="680" height="240" fill="#EAF6FB" />
	<rect y="236" width="680" height="124" fill="#EBCDB4" />
	<rect y="232" width="680" height="8" fill="#B8E6C1" />

	<!-- Layer: water in the soil -->
	<g class="layer" style:opacity={op('soil-water')} fill="#A8D8EA" stroke={WATER} stroke-width="1">
		{#each soilDrops as [x, y] (`${x}${y}`)}
			<path d="M{x} {y - 7} Q{x + 5} {y + 2} {x} {y + 6} Q{x - 5} {y + 2} {x} {y - 7} Z" />
		{/each}
	</g>

	<!-- Roots (always) -->
	<g stroke="#C79A7C" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M340 240 Q336 280 342 330 M340 256 Q318 276 300 306 M341 262 Q364 280 384 312 M338 290 Q320 300 312 330 M342 296 Q360 306 368 334" />
	</g>

	<!-- Layer: roots soaking up water -->
	<g class="layer" style:opacity={op('roots')}>
		<g stroke={WATER} stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="4 8">
			<path class="up" d="M342 330 Q336 280 340 240" />
			<path class="up" d="M300 306 Q318 276 340 256" />
			<path class="up" d="M384 312 Q364 280 341 262" />
		</g>
	</g>

	<!-- Plant (always) -->
	<path d="M340 240 Q336 170 340 96" stroke={STEM} stroke-width="8" fill="none" stroke-linecap="round" />
	<path d="M338 190 q-50 -30 -84 -6 q34 32 84 6 Z" fill={LEAF} stroke={STEM} stroke-width="2" />
	<path d="M340 150 q50 -34 86 -8 q-34 34 -86 8 Z" fill={LEAF} stroke={STEM} stroke-width="2" />
	<g fill="#FFFFFF" stroke="#E5DCD2" stroke-width="1.5">
		{#each [0, 72, 144, 216, 288] as a (a)}
			<ellipse cx="340" cy="62" rx="11" ry="18" transform="rotate({a} 340 80)" />
		{/each}
	</g>
	<circle cx="340" cy="80" r="11" fill="#FFE4A3" stroke="#F5CF7E" stroke-width="2" />

	<!-- Layer: water travelling up the stem -->
	<g class="layer" style:opacity={op('stem')}>
		<path class="up" d="M340 240 Q336 170 340 100" stroke={WATER} stroke-width="3" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
		<path class="up" d="M338 186 Q300 176 266 184 M340 146 Q380 136 414 146" stroke={WATER} stroke-width="2" stroke-dasharray="4 8" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: leaves breathing water out into the air -->
	<g class="layer" style:opacity={op('leaves-out')} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5">
		{#each [[270, 168], [300, 160], [400, 130], [430, 136]] as [x, y], i (i)}
			<g transform="translate({x} {y})"><circle class="rise" r="4.5" style:animation-delay="-{i * 0.7}s" /></g>
		{/each}
	</g>

	<!-- Layer: the experiment — a white flower in coloured water turns colour -->
	<g class="layer" style:opacity={op('glass')}>
		<path d="M540 200 L620 200 L612 316 L548 316 Z" fill="#FFFFFF" stroke="#C9D3DA" stroke-width="2.5" />
		<path d="M543 246 L617 246 L612 316 L548 316 Z" fill="#9DB4E8" opacity="0.8" />
		<path d="M580 300 Q578 220 582 150" stroke={STEM} stroke-width="5" fill="none" stroke-linecap="round" />
		<path class="up" d="M580 300 Q578 220 582 152" stroke="#7C8FD6" stroke-width="2.5" stroke-dasharray="4 8" fill="none" />
		<g fill="#C9D3F5" stroke="#9DB4E8" stroke-width="1.5">
			{#each [0, 72, 144, 216, 288] as a (a)}
				<ellipse cx="582" cy="122" rx="10" ry="16" transform="rotate({a} 582 138)" />
			{/each}
		</g>
		<circle cx="582" cy="138" r="9" fill="#9DB4E8" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .up {
			animation: up 1.8s linear infinite;
		}
		.animate .rise {
			animation: rise 3s linear infinite;
		}
	}
	@keyframes up {
		to {
			stroke-dashoffset: 28;
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
			transform: translateY(-60px);
			opacity: 0;
		}
	}
</style>
