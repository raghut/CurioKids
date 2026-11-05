<script lang="ts">
	/**
	 * A spider building its web between two branches: the first bridge line, the frame,
	 * the spokes, the sticky spiral (with dew), the spider waiting in the middle, and a
	 * close-up of silk coming out of its body. Each building step is its own layer.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const C = { x: 340, y: 190 };
	const FRAME = [
		[200, 62], [480, 62], [616, 190], [480, 320], [200, 320], [62, 190]
	];
	// Spokes run from the centre to points on the frame and between them.
	const spokes = Array.from({ length: 12 }, (_, i) => {
		const t = (i / 12) * Math.PI * 2;
		return { x: C.x + Math.cos(t) * 200, y: C.y + Math.sin(t) * 128 };
	});
	// The spiral, drawn as rings joining the spokes.
	const rings = [0.25, 0.4, 0.55, 0.7, 0.85].map((k) =>
		spokes.map((s) => `${(C.x + (s.x - C.x) * k).toFixed(1)},${(C.y + (s.y - C.y) * k).toFixed(1)}`).join(' ')
	);
	const SILK = '#9AA6B2';
</script>

{#snippet spider(x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		<g stroke="#4E3A2E" stroke-width="2.5" fill="none" stroke-linecap="round">
			<path d="M-6 -4 Q-20 -18 -30 -10 M-6 0 Q-22 -6 -32 2 M-6 4 Q-22 8 -30 18 M-4 8 Q-16 20 -22 30" />
			<path d="M6 -4 Q20 -18 30 -10 M6 0 Q22 -6 32 2 M6 4 Q22 8 30 18 M4 8 Q16 20 22 30" />
		</g>
		<circle cx="0" cy="12" r="11" fill="#6B4A3A" />
		<circle cx="0" cy="-6" r="8" fill="#6B4A3A" />
		<circle cx="-3" cy="-8" r="2" fill="#FFFFFF" /><circle cx="3" cy="-8" r="2" fill="#FFFFFF" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A spider spinning a web between two branches"
>
	<rect width="680" height="360" fill="#EEF7EF" />
	<!-- Branches (always) -->
	<g stroke="#C79A7C" stroke-width="12" fill="none" stroke-linecap="round">
		<!-- Trunks stand outside the web so no wood crosses the silk. -->
		<path d="M0 30 Q120 40 210 58" />
		<path d="M680 30 Q560 40 470 58" />
		<path d="M66 34 L58 360" />
		<path d="M614 34 L622 360" />
	</g>
	<g fill="#9ED6AA" stroke="#6DBA80" stroke-width="2">
		<ellipse cx="60" cy="24" rx="26" ry="11" transform="rotate(-18 60 24)" />
		<ellipse cx="620" cy="24" rx="26" ry="11" transform="rotate(18 620 24)" />
		<ellipse cx="40" cy="300" rx="22" ry="9" transform="rotate(30 40 300)" />
	</g>

	<!-- Layer: the first bridge thread, floated across on the wind -->
	<g class="layer" style:opacity={op('bridge')}>
		<line x1="200" y1="62" x2="480" y2="62" stroke={SILK} stroke-width="2.5" />
		<path class="flow" d="M200 62 L480 62" stroke="#FFFFFF" stroke-width="2" stroke-dasharray="3 14" />
	</g>

	<!-- Layer: the outer frame -->
	<g class="layer" style:opacity={op('frame')}>
		<polygon points={FRAME.map((p) => p.join(',')).join(' ')} fill="none" stroke={SILK} stroke-width="2" />
	</g>

	<!-- Layer: spokes, like a wheel -->
	<g class="layer" style:opacity={op('spokes')} stroke={SILK} stroke-width="1.6">
		{#each spokes as s, i (i)}
			<line x1={C.x} y1={C.y} x2={s.x} y2={s.y} />
		{/each}
	</g>

	<!-- Layer: the sticky spiral, with dew drops -->
	<g class="layer" style:opacity={op('spiral')}>
		{#each rings as pts, i (i)}
			<polygon points={pts} fill="none" stroke={SILK} stroke-width="1.4" />
		{/each}
		<g fill="#CDEBF5" stroke="#A8D8EA" stroke-width="1">
			<circle class="glint" cx="412" cy="148" r="3.5" /><circle class="glint" cx="268" cy="226" r="3.5" style:animation-delay="-0.8s" />
			<circle class="glint" cx="436" cy="232" r="3" style:animation-delay="-1.6s" /><circle class="glint" cx="282" cy="140" r="3" style:animation-delay="-2.2s" />
		</g>
	</g>

	<!-- Layer: the spider waiting in the middle -->
	<g class="layer" style:opacity={op('spider')}>
		<line x1={C.x} y1="62" x2={C.x} y2={C.y - 10} stroke={SILK} stroke-width="1.4" />
		<g class="bob">{@render spider(C.x, C.y, 1.3)}</g>
	</g>

	<!-- Layer: close-up — silk comes out of the back of the spider's body -->
	<g class="layer" style:opacity={op('silk')}>
		<circle cx="590" cy="250" r="72" fill="#FFFFFF" stroke="#FFB89A" stroke-width="3" />
		{@render spider(578, 228, 2.4)}
		<path class="flow" d="M578 262 Q586 290 600 314" stroke={SILK} stroke-width="3" stroke-dasharray="6 6" fill="none" stroke-linecap="round" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
		.animate .glint {
			animation: glint 2.4s ease-in-out infinite;
		}
		.animate .bob {
			animation: bob 3s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -34;
		}
	}
	@keyframes glint {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(4px);
		}
	}
</style>
