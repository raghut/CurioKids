<script lang="ts">
	/**
	 * A frog's life in a pond, left to right: eggs (frogspawn), a tadpole, a tadpole with
	 * legs, a froglet on a stone, and a frog on a lily pad. `cycle` joins them in a circle.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const FROG = '#8BCB6A';
	const FROG_EDGE = '#6CA94F';
	const W = 150;
</script>

{#snippet tadpole(x: number, y: number, legs: boolean)}
	<g transform="translate({x} {y})">
		<path class="tail" d="M10 0 Q34 -10 50 0 Q34 10 10 0 Z" fill="#6B5A4E" style:transform-origin="10px 0px" />
		<ellipse cx="0" cy="0" rx="16" ry="12" fill="#6B5A4E" />
		<circle cx="-7" cy="-4" r="2.5" fill="#FFFFFF" />
		{#if legs}
			<path d="M10 8 l6 10 l6 -2 M4 10 l2 12 l6 0" stroke="#6B5A4E" stroke-width="3" fill="none" stroke-linecap="round" />
		{/if}
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A pond with frog eggs, tadpoles and a frog"
>
	<rect width="680" height={W} fill="#EAF6FB" />
	<rect y={W} width="680" height={360 - W} fill="#BFE3EF" />
	<path d="M0 330 Q170 316 340 330 Q510 318 680 328 L680 360 L0 360 Z" fill="#CFE8C2" />
	<g stroke="#7DC68E" stroke-width="5" fill="none" stroke-linecap="round">
		<path d="M30 340 Q22 300 36 270" /><path d="M650 340 Q660 300 646 268" />
	</g>
	<!-- Stone and lily pad (always) -->
	<ellipse cx="470" cy={W + 4} rx="46" ry="16" fill="#C9C3BA" />
	<path d="M560 {W} a52 14 0 1 0 100 0 L610 {W} Z" fill="#9ED6AA" stroke="#6DBA80" stroke-width="2" />

	<!-- Layer: a jelly clump of eggs -->
	<g class="layer" style:opacity={op('eggs')}>
		{#each [[80, 190], [100, 182], [92, 202], [112, 198], [72, 208], [120, 214], [96, 222], [84, 228]] as [x, y] (`${x}${y}`)}
			<circle cx={x} cy={y} r="9" fill="#EAF6FB" stroke="#A8D8EA" stroke-width="1.5" />
			<circle cx={x} cy={y} r="3" fill="#4E3A2E" />
		{/each}
	</g>

	<!-- Layer: a tadpole swimming -->
	<g class="layer" style:opacity={op('tadpole')}>
		<g class="swim">{@render tadpole(220, 236, false)}</g>
	</g>

	<!-- Layer: a tadpole growing back legs -->
	<g class="layer" style:opacity={op('legs')}>
		<g class="swim" style:animation-delay="-1s">{@render tadpole(330, 206, true)}</g>
	</g>

	<!-- Layer: a froglet, still with a little tail, on the stone -->
	<g class="layer" style:opacity={op('froglet')}>
		<g transform="translate(470 {W - 14})">
			<path d="M10 4 Q24 0 30 6" stroke={FROG_EDGE} stroke-width="5" fill="none" stroke-linecap="round" />
			<ellipse cx="0" cy="0" rx="18" ry="12" fill={FROG} stroke={FROG_EDGE} stroke-width="2" />
			<circle cx="-8" cy="-10" r="5" fill={FROG} stroke={FROG_EDGE} stroke-width="1.5" />
			<circle cx="-8" cy="-10" r="2" fill="#4E3A2E" />
		</g>
	</g>

	<!-- Layer: a grown frog on the lily pad -->
	<g class="layer" style:opacity={op('frog')}>
		<g class="hop" transform="translate(610 {W - 26})">
			<path d="M-30 18 Q-40 4 -24 0 M30 18 Q40 4 24 0" stroke={FROG_EDGE} stroke-width="7" fill="none" stroke-linecap="round" />
			<ellipse cx="0" cy="6" rx="32" ry="22" fill={FROG} stroke={FROG_EDGE} stroke-width="2" />
			<circle cx="-14" cy="-14" r="10" fill={FROG} stroke={FROG_EDGE} stroke-width="2" />
			<circle cx="14" cy="-14" r="10" fill={FROG} stroke={FROG_EDGE} stroke-width="2" />
			<circle cx="-14" cy="-14" r="4" fill="#4E3A2E" />
			<circle cx="14" cy="-14" r="4" fill="#4E3A2E" />
			<path d="M-10 10 Q0 18 10 10" stroke="#4E7A3A" stroke-width="2.5" fill="none" stroke-linecap="round" />
		</g>
	</g>

	<!-- Layer: arrows joining the stages into a circle of life -->
	<g class="layer" style:opacity={op('cycle')} stroke="#FF8B7B" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
		<path d="M130 200 Q170 210 196 228" />
		<path d="M268 230 Q300 224 312 214" />
		<path d="M378 200 Q420 180 446 150" />
		<path d="M516 140 Q540 132 560 134" />
		<path d="M620 176 Q400 340 100 250" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .tail {
			animation: tail 0.8s ease-in-out infinite;
		}
		.animate .swim {
			animation: swim 3s ease-in-out infinite;
		}
		.animate .hop {
			animation: hop 2.4s ease-in-out infinite;
		}
	}
	@keyframes tail {
		0%,
		100% {
			transform: rotate(-12deg);
		}
		50% {
			transform: rotate(12deg);
		}
	}
	@keyframes swim {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(-14px, 6px);
		}
	}
	@keyframes hop {
		0%,
		70%,
		100% {
			transform: translate(610px, 124px);
		}
		80% {
			transform: translate(610px, 112px);
		}
	}
</style>
