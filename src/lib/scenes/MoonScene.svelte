<script lang="ts">
	/**
	 * The moon's shapes: sunlight from the left, the Earth with the moon travelling round
	 * it (half of the moon always lit), and on the right the moon as WE see it from Earth.
	 * The four phase layers (full, half, crescent, new) share one spot and fade between
	 * each other. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const uid = $props.id();
	const clip = `moonface-${uid}`;
	const LIT = '#FFF4E0';
	const DARK = '#5A6390';
	const M = { x: 572, y: 180, r: 64 };
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Sunlight, the Earth with the moon going around it, and the moon's shape in the sky"
>
	<defs>
		<clipPath id={clip}><circle cx={M.x} cy={M.y} r={M.r} /></clipPath>
	</defs>
	<rect width="680" height="360" fill="#46507A" />
	<g fill="#FFFFFF" opacity="0.6">
		<circle cx="420" cy="40" r="1.6" /><circle cx="470" cy="320" r="1.6" /><circle cx="660" cy="30" r="1.4" />
		<circle cx="640" cy="330" r="1.4" /><circle cx="160" cy="330" r="1.4" />
	</g>

	<!-- Layer: sunlight from the left -->
	<g class="layer" style:opacity={op('sunlight')}>
		<circle cx="-50" cy="180" r="120" fill="#FFE4A3" />
		<g stroke="#FFE4A3" stroke-width="4" stroke-linecap="round">
			<line class="flow" stroke-dasharray="8 14" x1="84" y1="120" x2="140" y2="130" />
			<line class="flow" stroke-dasharray="8 14" x1="90" y1="180" x2="140" y2="180" />
			<line class="flow" stroke-dasharray="8 14" x1="84" y1="240" x2="140" y2="230" />
		</g>
	</g>

	<!-- Earth (always) -->
	<circle cx="270" cy="180" r="34" fill="#A8D8EA" />
	<path d="M256 166 q14 -8 22 4 q-4 14 -18 10 q-8 -6 -4 -14 Z M276 190 q10 -4 14 6 q-6 8 -14 2 Z" fill="#B8E6C1" />

	<!-- Layer: the moon's path around the Earth, with the moon going round -->
	<g class="layer" style:opacity={op('orbit')}>
		<circle cx="270" cy="180" r="110" fill="none" stroke="#A9B1D6" stroke-width="2" stroke-dasharray="5 9" />
		<g class="orbit" style:transform-origin="270px 180px">
			<g transform="translate(380 180)">
				<!-- Counter-rotates, so the half facing the sun (left) stays lit all the way round. -->
				<g class="counter" style:transform-origin="0px 0px">
					<circle r="16" fill={DARK} stroke="#A9B1D6" stroke-width="1.5" />
					<path d="M0 -16 A16 16 0 0 0 0 16 Z" fill={LIT} />
				</g>
			</g>
		</g>
	</g>

	<!-- The moon as seen from Earth: one phase at a time -->
	<circle cx={M.x} cy={M.y} r={M.r} fill={DARK} stroke="#A9B1D6" stroke-width="2" />
	<g clip-path="url(#{clip})">
		<g class="layer" style:opacity={op('full')}>
			<circle cx={M.x} cy={M.y} r={M.r} fill={LIT} />
			<circle cx={M.x - 20} cy={M.y - 14} r="10" fill="#F1E2C8" />
			<circle cx={M.x + 18} cy={M.y + 20} r="7" fill="#F1E2C8" />
		</g>
		<g class="layer" style:opacity={op('half')}>
			<path d="M{M.x} {M.y - M.r} A{M.r} {M.r} 0 0 1 {M.x} {M.y + M.r} Z" fill={LIT} />
		</g>
		<g class="layer" style:opacity={op('crescent')}>
			<path
				d="M{M.x} {M.y - M.r} A{M.r} {M.r} 0 0 1 {M.x} {M.y + M.r} A{M.r * 0.75} {M.r} 0 0 0 {M.x} {M.y - M.r} Z"
				fill={LIT}
			/>
		</g>
	</g>
	<!-- New moon: the dark disc alone, with a faint rim so it is not "missing" -->
	<g class="layer" style:opacity={op('new')}>
		<circle cx={M.x} cy={M.y} r={M.r + 6} fill="none" stroke="#A9B1D6" stroke-width="2" stroke-dasharray="4 8" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .orbit {
			animation: orbit 16s linear infinite;
		}
		.animate .counter {
			animation: counter 16s linear infinite;
		}
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
	}
	/* The moon's lit side must keep facing the sun while it travels, so the inner moon
	   counter-rotates by the same amount. */
	@keyframes orbit {
		to {
			transform: rotate(-360deg);
		}
	}
	@keyframes counter {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -44;
		}
	}
</style>
