<script lang="ts">
	/**
	 * How we see: a flower on the left sends light into the eye; the lens bends it; a tiny
	 * upside-down picture lands at the back of the eye; and a message travels to the brain,
	 * which turns it the right way up.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const E = { x: 360, y: 190, r: 90 };
</script>

{#snippet flower(x: number, y: number, s: number, flip: boolean)}
	<g transform="translate({x} {y}) scale({s} {flip ? -s : s})">
		<path d="M0 0 L0 60" stroke="#5FAE72" stroke-width="5" stroke-linecap="round" />
		<path d="M0 36 q-18 -12 -26 0 q12 12 26 0 Z" fill="#7DC68E" />
		<g fill="#FFB89A" stroke="#FF8B7B" stroke-width="1.5">
			{#each [0, 72, 144, 216, 288] as a (a)}
				<ellipse cx="0" cy="-16" rx="9" ry="14" transform="rotate({a})" />
			{/each}
		</g>
		<circle r="9" fill="#FFE4A3" stroke="#F5CF7E" stroke-width="2" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Light from a flower going into an eye and a message going to the brain"
>
	<rect width="680" height="360" fill="#F7FBFC" />
	<!-- Flower (always) -->
	{@render flower(80, 160, 1.3, false)}

	<!-- Eye, cut away (always) -->
	<circle cx={E.x} cy={E.y} r={E.r} fill="#FFFFFF" stroke="#D9CFC4" stroke-width="4" />
	<path d="M{E.x + 60} {E.y - 66} A{E.r} {E.r} 0 0 1 {E.x + 60} {E.y + 66}" stroke="#F7C6C0" stroke-width="10" fill="none" />
	<path d="M{E.x - 88} {E.y - 26} A28 28 0 0 0 {E.x - 88} {E.y + 26}" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="2" />
	<ellipse cx={E.x - 64} cy={E.y} rx="10" ry="30" fill="#EAF6FB" stroke="#A8D8EA" stroke-width="2" />

	<!-- Brain (always) -->
	<path d="M560 110 q-30 -40 10 -56 q20 -30 50 -6 q36 -6 34 30 q24 24 -6 46 q-6 30 -44 22 q-30 14 -44 -36 Z" fill="#F9D9D2" stroke="#EDB7AD" stroke-width="2.5" />
	<path d="M580 80 q10 10 0 22 M610 70 q-8 14 6 24 M630 96 q-12 6 -4 18" stroke="#EDB7AD" stroke-width="2" fill="none" />
	<!-- Nerve (always) -->
	<path d="M{E.x + 90} {E.y} Q500 190 560 140" stroke="#F0C4AE" stroke-width="7" fill="none" stroke-linecap="round" />

	<!-- Layer: light travelling from the flower to the eye -->
	<g class="layer" style:opacity={op('light')} stroke="#FFD27A" stroke-width="3" stroke-linecap="round" stroke-dasharray="8 10">
		<line class="flow" x1="100" y1="136" x2="{E.x - 74}" y2="{E.y - 12}" />
		<line class="flow" x1="100" y1="216" x2="{E.x - 74}" y2="{E.y + 12}" />
	</g>

	<!-- Layer: the lens bending the light so the rays cross -->
	<g class="layer" style:opacity={op('lens')}>
		<ellipse cx={E.x - 64} cy={E.y} rx="10" ry="30" fill="#CDEBF5" stroke="#5FA3D6" stroke-width="3" />
		<g stroke="#FFD27A" stroke-width="3" stroke-linecap="round">
			<line x1={E.x - 60} y1={E.y - 12} x2={E.x + 80} y2={E.y + 36} />
			<line x1={E.x - 60} y1={E.y + 12} x2={E.x + 80} y2={E.y - 36} />
		</g>
	</g>

	<!-- Layer: a tiny upside-down picture at the back of the eye -->
	<g class="layer" style:opacity={op('image')}>
		{@render flower(E.x + 64, E.y + 8, 0.6, true)}
	</g>

	<!-- Layer: a message to the brain, which turns the picture the right way up -->
	<g class="layer" style:opacity={op('brain')}>
		<path class="flow" d="M{E.x + 90} {E.y} Q500 190 560 140" stroke="#FF8B7B" stroke-width="3" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
		<circle cx="606" cy="250" r="44" fill="#FFFFFF" stroke="#FFB89A" stroke-width="3" />
		{@render flower(606, 246, 0.8, false)}
		<path d="M590 160 L600 204" stroke="#FFB89A" stroke-width="2.5" stroke-linecap="round" />
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
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -36;
		}
	}
</style>
