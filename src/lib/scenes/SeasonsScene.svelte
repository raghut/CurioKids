<script lang="ts">
	/**
	 * Seasons: the sun in the middle, the Earth going round it on a long trip, always
	 * leaning the same way. On the left our half leans towards the sun (summer, strong
	 * straight light); on the right it leans away (winter, weak slanting light). A rain
	 * cloud marks the monsoon that follows summer in India.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const L = { x: 120, y: 180 };
	const R = { x: 560, y: 180 };
	const TILT = 23;
</script>

{#snippet earth(c: { x: number; y: number })}
	<circle cx={c.x} cy={c.y} r="44" fill="#A8D8EA" stroke="#DDF0F8" stroke-width="2" />
	<path d="M{c.x - 20} {c.y - 26} q20 -8 30 6 q-6 16 -24 12 q-12 -6 -6 -18 Z M{c.x + 6} {c.y + 10} q14 -4 18 8 q-8 10 -18 2 Z" fill="#B8E6C1" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="The Earth going around the sun, leaning towards it and then away"
>
	<rect width="680" height="360" fill="#46507A" />
	<g fill="#FFFFFF" opacity="0.5"><circle cx="300" cy="40" r="1.6" /><circle cx="420" cy="320" r="1.6" /><circle cx="60" cy="320" r="1.4" /><circle cx="640" cy="40" r="1.4" /></g>

	<!-- Layer: the Earth's long trip round the sun -->
	<g class="layer" style:opacity={op('orbit')}>
		<ellipse cx="340" cy="180" rx="220" ry="70" fill="none" stroke="#A9B1D6" stroke-width="2" stroke-dasharray="6 9" />
		<path d="M330 252 L346 250 M336 244 L348 250 L336 256" stroke="#A9B1D6" stroke-width="2.5" fill="none" stroke-linecap="round" />
	</g>

	<!-- Sun (always) -->
	<circle cx="340" cy="180" r="50" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
	<circle cx="328" cy="172" r="4" fill="#A0674E" /><circle cx="352" cy="172" r="4" fill="#A0674E" />
	<path d="M326 190 Q340 202 354 190" stroke="#A0674E" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Earths (always) -->
	{@render earth(L)}
	{@render earth(R)}

	<!-- Layer: the Earth leans, always the same way -->
	<g class="layer" style:opacity={op('tilt')} stroke="#FFFFFF" stroke-width="3" stroke-linecap="round">
		<line x1={L.x} y1={L.y - 62} x2={L.x} y2={L.y + 62} transform="rotate({TILT} {L.x} {L.y})" />
		<line x1={R.x} y1={R.y - 62} x2={R.x} y2={R.y + 62} transform="rotate({TILT} {R.x} {R.y})" />
	</g>

	<!-- Layer: summer — our top half leans towards the sun, strong straight light -->
	<g class="layer" style:opacity={op('summer')}>
		<g stroke="#FFD27A" stroke-width="5" stroke-linecap="round">
			<line class="flow" x1="288" y1="150" x2="176" y2="150" stroke-dasharray="10 8" />
			<line class="flow" x1="288" y1="170" x2="170" y2="170" stroke-dasharray="10 8" />
		</g>
		<path d="M{L.x - 44} {L.y} A44 44 0 0 1 {L.x + 44} {L.y} Z" fill="#FFE4A3" opacity="0.4" transform="rotate({TILT} {L.x} {L.y})" />
		<circle cx={L.x} cy="96" r="14" fill="#FFE4A3" stroke="#FFB89A" stroke-width="2" />
	</g>

	<!-- Layer: winter — our top half leans away, weaker slanting light -->
	<g class="layer" style:opacity={op('winter')}>
		<g stroke="#FFE4A3" stroke-width="2" stroke-linecap="round" opacity="0.6">
			<line class="flow" x1="392" y1="190" x2="512" y2="210" stroke-dasharray="6 10" />
		</g>
		<path d="M{R.x - 44} {R.y} A44 44 0 0 1 {R.x + 44} {R.y} Z" fill="#46507A" opacity="0.45" transform="rotate({TILT} {R.x} {R.y})" />
		<g stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" transform="translate({R.x} 96)">
			<path d="M0 -14 L0 14 M-12 -7 L12 7 M-12 7 L12 -7" />
		</g>
	</g>

	<!-- Layer: monsoon — rain clouds roll in after summer -->
	<g class="layer" style:opacity={op('monsoon')}>
		<path d="M150 300 a14 14 0 0 1 10 -24 a22 22 0 0 1 42 -4 a16 16 0 0 1 26 16 a12 12 0 0 1 -2 12 Z" fill="#DDE6EC" />
		<g stroke="#A8D8EA" stroke-width="3" stroke-linecap="round">
			<line class="fall" x1="170" y1="308" x2="166" y2="320" />
			<line class="fall" x1="190" y1="308" x2="186" y2="320" style:animation-delay="-0.4s" />
			<line class="fall" x1="210" y1="308" x2="206" y2="320" style:animation-delay="-0.8s" />
		</g>
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
		.animate .fall {
			animation: fall 1.2s linear infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: 36;
		}
	}
	@keyframes fall {
		0% {
			transform: translateY(-6px);
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			transform: translateY(14px);
			opacity: 0;
		}
	}
</style>
