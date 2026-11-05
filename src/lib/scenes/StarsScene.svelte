<script lang="ts">
	/**
	 * Why stars twinkle: stars far away, the moving blanket of air around the Earth, a
	 * star's light wobbling through that air on its way down, stars twinkling, and a
	 * planet nearby shining steadily.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const stars = [[80, 40], [180, 70], [300, 30], [420, 60], [540, 36], [620, 90], [120, 110], [480, 120], [360, 100], [240, 130]];
	const star = (x: number, y: number, r: number) =>
		`M${x} ${y - r} L${x + r * 0.3} ${y - r * 0.3} L${x + r} ${y} L${x + r * 0.3} ${y + r * 0.3} L${x} ${y + r} L${x - r * 0.3} ${y + r * 0.3} L${x - r} ${y} L${x - r * 0.3} ${y - r * 0.3} Z`;
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A night sky with twinkling stars above a house"
>
	<rect width="680" height="360" fill="#3E4770" />
	<path d="M0 300 Q170 286 340 300 Q510 286 680 298 L680 360 L0 360 Z" fill="#2F3A2F" opacity="0.6" />
	<!-- House (always) -->
	<polygon points="80,270 130,232 180,270" fill="#FFB89A" />
	<rect x="92" y="268" width="76" height="46" fill="#FFF4E0" />
	<rect x="108" y="278" width="20" height="18" fill="#FFE4A3" />

	<!-- Layer: the stars, very far away -->
	<g class="layer" style:opacity={op('stars')} fill="#FFF4E0">
		{#each stars as [x, y], i (i)}
			<path class:twinkle={shown.has('twinkle')} d={star(x, y, 7)} style:animation-delay="-{(i * 0.37) % 1.5}s" />
		{/each}
	</g>

	<!-- Layer: the moving blanket of air -->
	<g class="layer" style:opacity={op('air')} stroke="#8E9AC8" stroke-width="3" fill="none" stroke-linecap="round">
		<path class="drift" d="M-20 170 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" />
		<path class="drift" d="M-20 210 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" style:animation-delay="-1s" />
		<path class="drift" d="M-20 250 q40 -16 80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0 t80 0" style:animation-delay="-2s" />
	</g>

	<!-- Layer: a star's light wobbling down through the air -->
	<g class="layer" style:opacity={op('bend')} stroke="#FFE4A3" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 6">
		<path class="flow" d="M300 34 L290 150 L310 190 L286 230 L306 266 L150 290" />
	</g>

	<!-- Layer: twinkle sparkles -->
	<g class="layer" style:opacity={op('twinkle')} stroke="#FFF4E0" stroke-width="2" stroke-linecap="round">
		<path class="twinkle" d="M300 14 L300 22 M300 38 L300 46 M284 30 L292 30 M308 30 L316 30" />
		<path class="twinkle" d="M540 16 L540 24 M540 40 L540 48 M524 36 L532 36 M548 36 L556 36" style:animation-delay="-0.6s" />
	</g>

	<!-- Layer: a planet — close by, so it shines steadily -->
	<g class="layer" style:opacity={op('planet')}>
		<circle cx="580" cy="200" r="16" fill="#FFD27A" />
		<circle cx="580" cy="200" r="24" fill="none" stroke="#FFD27A" stroke-width="2" opacity="0.4" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .twinkle {
			animation: twinkle 1.5s ease-in-out infinite;
		}
		.animate .drift {
			animation: drift 3s linear infinite;
		}
		.animate .flow {
			animation: flow 1.4s linear infinite;
		}
	}
	@keyframes twinkle {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.25;
		}
	}
	@keyframes drift {
		to {
			transform: translateX(-80px);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -24;
		}
	}
</style>
