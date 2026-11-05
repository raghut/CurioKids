<script lang="ts">
	/**
	 * Why the sky is blue: sunlight (many colours) meets tiny bits of air, and the blue
	 * part bounces all over the sky. `sunset` shows the long, low path that leaves the
	 * orange behind. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const BANDS = ['#FF8B7B', '#FFB89A', '#FFE4A3', '#B8E6C1', '#7FB6E0', '#9DB4E8', '#C9B3E6'];
	// Tiny bits of air, scattered over the sky.
	const air = [
		[180, 60], [260, 110], [330, 50], [400, 130], [470, 70], [540, 150], [610, 90],
		[220, 200], [300, 170], [380, 220], [460, 190], [560, 230], [640, 180], [150, 140]
	];
	const bounces = [
		'M300 170 l14 -10 l10 12 l14 -10', 'M400 130 l-12 -12 l14 -8 l-10 -14',
		'M460 190 l14 8 l8 -14 l14 8', 'M330 50 l-14 10 l-8 -12', 'M540 150 l12 -14 l12 10 l12 -12',
		'M380 220 l-14 -8 l-6 14 l-14 -6'
	];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Sunlight shining through the air and making the sky blue"
>
	<rect width="680" height="360" fill="#F5F8FA" />

	<!-- Layer: the sky turned blue -->
	<g class="layer" style:opacity={op('blue-sky')}>
		<rect width="680" height="290" fill="#A8D8EA" />
	</g>

	<!-- Layer: sunset — the long, low path leaves orange behind -->
	<g class="layer" style:opacity={op('sunset')}>
		<rect width="680" height="290" fill="#FFB89A" opacity="0.9" />
		<rect y="180" width="680" height="110" fill="#FFE4A3" opacity="0.6" />
		<circle cx="560" cy="280" r="34" fill="#FF8B7B" />
	</g>

	<!-- Air bits (always) -->
	<g fill="#FFFFFF" stroke="#B9C7D1" stroke-width="1.5">
		{#each air as [x, y] (`${x}-${y}`)}
			<circle cx={x} cy={y} r="4" />
		{/each}
	</g>

	<!-- Ground (always) -->
	<path d="M0 290 Q170 270 340 290 Q510 270 680 288 L680 360 L0 360 Z" fill="#B8E6C1" />

	<!-- Sun (always) -->
	<g stroke="#FFB89A" stroke-width="4" stroke-linecap="round">
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line x1="62" y1="22" x2="62" y2="14" transform="rotate({a} 62 62)" />
		{/each}
	</g>
	<circle cx="62" cy="62" r="30" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />

	<!-- Layer: white sunlight streaming in -->
	<g class="layer" style:opacity={op('sunlight')}>
		<line x1="96" y1="84" x2="300" y2="168" stroke="#FFF4E0" stroke-width="12" stroke-linecap="round" />
		<line class="flow" x1="96" y1="84" x2="300" y2="168" stroke="#FFD27A" stroke-width="3" stroke-dasharray="8 12" stroke-linecap="round" />
	</g>

	<!-- Layer: sunlight is really many colours -->
	<g class="layer" style:opacity={op('colors')} stroke-width="3" stroke-linecap="round">
		{#each BANDS as c, i (c)}
			<line x1={98} y1={78 + i * 3} x2={240} y2={128 + i * 6} stroke={c} />
		{/each}
	</g>

	<!-- Layer: blue light bouncing from air bit to air bit -->
	<g class="layer" style:opacity={op('scatter')} stroke="#5FA3D6" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		{#each bounces as d, i (d)}
			<path class="twinkle" {d} style:animation-delay="-{i * 0.4}s" />
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
		.animate .twinkle {
			animation: twinkle 2.4s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -40;
		}
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
</style>
