<script lang="ts">
	/**
	 * Day and night: the sun on the left and the Earth spinning in front of it. The side
	 * facing the sun is day; the far side is night, with stars. Land drifts across the
	 * globe (inside a clip) only while the `spin` layer is on.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	// The card thumbnail and the reader can both be on one page; a shared clipPath id
	// would let one instance clip by the other's shape.
	const uid = $props.id();
	const clip = `globe-${uid}`;

	// Two identical copies of the land, one globe-width apart, so sliding by exactly that
	// width loops without a jump.
	const land = 'M0 -40 q30 -30 60 -6 q20 26 -6 46 q-30 14 -54 -8 Z M70 30 q26 -10 40 10 q-6 30 -34 26 q-18 -14 -6 -36 Z M-60 40 q20 -16 40 0 q0 22 -20 24 q-24 -4 -20 -24 Z';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="The sun shining on the Earth, half in day and half in night"
>
	<defs>
		<clipPath id={clip}><circle cx="430" cy="180" r="118" /></clipPath>
	</defs>

	<rect width="680" height="360" fill="#46507A" />
	<g fill="#FFFFFF" opacity="0.5">
		<circle cx="200" cy="40" r="1.6" /><circle cx="300" cy="320" r="1.6" /><circle cx="240" cy="300" r="1.2" />
	</g>

	<!-- Sun (always) -->
	<circle cx="40" cy="180" r="70" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
	<circle cx="52" cy="170" r="4" fill="#A0674E" />
	<circle cx="76" cy="170" r="4" fill="#A0674E" />
	<path d="M50 192 Q64 204 78 192" stroke="#A0674E" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Layer: sunlight travelling to the Earth -->
	<g class="layer" style:opacity={op('sunlight')} stroke="#FFE4A3" stroke-width="4" stroke-linecap="round">
		<line class="flow" stroke-dasharray="8 14" x1="128" y1="130" x2="300" y2="110" />
		<line class="flow" stroke-dasharray="8 14" x1="134" y1="180" x2="300" y2="180" />
		<line class="flow" stroke-dasharray="8 14" x1="128" y1="230" x2="300" y2="250" />
	</g>

	<!-- Earth (always): sea, land, a soft rim -->
	<circle cx="430" cy="180" r="118" fill="#A8D8EA" />
	<g clip-path="url(#{clip})">
		<g class="land" class:moving={shown.has('spin')}>
			<path d={land} transform="translate(410 180)" fill="#B8E6C1" />
			<path d={land} transform="translate(646 180)" fill="#B8E6C1" />
		</g>
	</g>

	<!-- Layer: the day side lit up -->
	<g class="layer" style:opacity={op('day')} clip-path="url(#{clip})">
		<rect x="312" y="62" width="118" height="236" fill="#FFF4E0" opacity="0.22" />
	</g>

	<!-- Layer: the night side, with stars beyond it -->
	<g class="layer" style:opacity={op('night')}>
		<path d="M430 62 A118 118 0 0 1 430 298 Z" fill="#2E3657" opacity="0.6" />
		<g fill="#FFE4A3">
			<path d="M600 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
			<path d="M630 250 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
			<circle cx="580" cy="300" r="2" /><circle cx="650" cy="150" r="2" />
		</g>
		<path d="M608 160 a22 22 0 1 0 20 30 a17 17 0 1 1 -20 -30 Z" fill="#FFF4E0" />
	</g>

	<circle cx="430" cy="180" r="118" fill="none" stroke="#DDF0F8" stroke-width="3" />

	<!-- Layer: an arrow showing the spin -->
	<g class="layer" style:opacity={op('spin')} stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M360 46 Q430 18 500 46" />
		<!-- Head on the left: the land slides left, so the arrow agrees with it. -->
		<path d="M370 34 L358 47 L374 54" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .land.moving {
			animation: turn 9s linear infinite;
		}
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
	}
	@keyframes turn {
		to {
			transform: translateX(-236px);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -44;
		}
	}
</style>
