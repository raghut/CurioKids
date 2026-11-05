<script lang="ts">
	/**
	 * Earthworms in the soil, cut away: the worm, the tunnels it digs, pulling dead leaves
	 * down to eat, the rich soil it leaves behind, and plant roots and rain water using its
	 * tunnels.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SURFACE = 120;
	const WORM = '#F2A7A0';
	const TUNNELS = 'M150 120 Q160 180 210 220 Q260 260 320 250 Q380 240 410 290 M410 290 Q450 320 520 300 M470 120 Q480 170 520 190 Q560 210 600 260';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="An earthworm digging tunnels in the soil under a garden"
>
	<rect width="680" height={SURFACE} fill="#EAF6FB" />
	<rect y={SURFACE} width="680" height={360 - SURFACE} fill="#D9B494" />
	<g fill="#C9A282"><circle cx="80" cy="200" r="5" /><circle cx="600" cy="330" r="6" /><circle cx="300" cy="320" r="4" /><circle cx="560" cy="160" r="4" /></g>
	<rect y={SURFACE - 6} width="680" height="10" fill="#9ED6AA" />
	<!-- Plants on top (always) -->
	<g stroke="#5FAE72" stroke-width="4" fill="none" stroke-linecap="round">
		<path d="M260 {SURFACE} L260 70" /><path d="M560 {SURFACE} L560 78" />
	</g>
	<g fill="#7DC68E" stroke="#5FAE72" stroke-width="2">
		<path d="M260 90 q-24 -18 -40 0 q18 16 40 0 Z" /><path d="M260 76 q24 -18 40 0 q-18 16 -40 0 Z" />
		<path d="M560 96 q-22 -16 -36 0 q16 14 36 0 Z" /><path d="M560 84 q22 -16 36 0 q-16 14 -36 0 Z" />
	</g>

	<!-- Layer: tunnels dug through the soil -->
	<g class="layer" style:opacity={op('tunnels')}>
		<path d={TUNNELS} stroke="#EBD0B6" stroke-width="18" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: plant roots and rain water going down the tunnels -->
	<g class="layer" style:opacity={op('roots-water')}>
		<g stroke="#C79A7C" stroke-width="3" fill="none" stroke-linecap="round">
			<path d="M260 {SURFACE} Q256 170 290 230 M260 140 Q240 170 216 196" />
			<path d="M560 {SURFACE} Q566 180 590 236" />
		</g>
		<path class="down" d={TUNNELS} stroke="#5FA3D6" stroke-width="3" stroke-dasharray="4 14" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: dead leaves on the surface, pulled down to eat -->
	<g class="layer" style:opacity={op('leaves')}>
		<path d="M120 112 q20 -16 40 0 q-20 12 -40 0 Z" fill="#E8B868" />
		<path d="M440 112 q18 -14 36 0 q-18 12 -36 0 Z" fill="#D9925F" />
		<path class="tug" d="M150 132 q8 -8 16 0 q-8 6 -16 0 Z" fill="#E8B868" />
	</g>

	<!-- Layer: rich dark soil left behind, and little piles on top -->
	<g class="layer" style:opacity={op('castings')}>
		<g fill="#A97E62"><ellipse cx="230" cy="230" rx="24" ry="12" /><ellipse cx="380" cy="260" rx="26" ry="12" /><ellipse cx="530" cy="200" rx="22" ry="10" /></g>
		<g fill="#8F6A52"><path d="M320 {SURFACE - 4} q8 -14 16 0 Z M340 {SURFACE - 4} q8 -12 16 0 Z" /><path d="M420 {SURFACE - 4} q8 -14 16 0 Z" /></g>
	</g>

	<!-- Layer: the earthworm wriggling -->
	<g class="layer" style:opacity={op('worm')}>
		<g class="wriggle">
			<path d="M250 236 Q280 220 310 240 Q340 260 370 244" stroke={WORM} stroke-width="16" fill="none" stroke-linecap="round" />
			<path d="M290 226 l0 14 M320 246 l0 14" stroke="#E08F88" stroke-width="2" />
			<rect x="300" y="232" width="18" height="16" rx="6" fill="#E89990" transform="rotate(20 309 240)" />
			<circle cx="368" cy="240" r="2.5" fill="#4E3A2E" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .wriggle {
			animation: wriggle 2.4s ease-in-out infinite;
		}
		.animate .down {
			animation: down 2s linear infinite;
		}
		.animate .tug {
			animation: tug 2s ease-in-out infinite;
		}
	}
	@keyframes wriggle {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(10px);
		}
	}
	@keyframes down {
		to {
			stroke-dashoffset: -36;
		}
	}
	@keyframes tug {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(10px);
		}
	}
</style>
