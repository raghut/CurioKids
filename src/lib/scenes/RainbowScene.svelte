<script lang="ts">
	/**
	 * Rainbow: sun behind, rain ahead, a close-up of one raindrop splitting sunlight into
	 * colours, and the arc itself. Soft tints stand in for the seven colours so nothing
	 * is a bright red. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	// Red to violet, as soft tints.
	const BANDS = ['#FF8B7B', '#FFB89A', '#FFE4A3', '#B8E6C1', '#A8D8EA', '#9DB4E8', '#C9B3E6'];
	const drops = [400, 440, 480, 520, 560, 600, 640, 420, 500, 580, 620].map((x, i) => ({
		x,
		d: (i * 0.37) % 1.8
	}));
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="The sun, rain, a raindrop and a rainbow"
>
	<rect width="680" height="360" fill="#EAF6FB" />

	<!-- Sun (always), low on the left, behind the viewer -->
	<g stroke="#FFB89A" stroke-width="5" stroke-linecap="round">
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line x1="70" y1="40" x2="70" y2="28" transform="rotate({a} 70 82)" />
		{/each}
	</g>
	<circle cx="70" cy="82" r="32" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
	<circle cx="60" cy="77" r="3.2" fill="#A0674E" />
	<circle cx="80" cy="77" r="3.2" fill="#A0674E" />
	<path d="M58 90 Q70 100 82 90" stroke="#A0674E" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Rain cloud (always), on the right -->
	<path d="M420 92 a26 26 0 0 1 16 -48 a42 42 0 0 1 80 -14 a32 32 0 0 1 62 22 a24 24 0 0 1 22 40 Z" fill="#DDE6EC" stroke="#C5D3DC" stroke-width="2" />

	<!-- Layer: the rainbow arc -->
	<g class="layer" style:opacity={op('rainbow')} fill="none" stroke-width="11">
		{#each BANDS as c, i (c)}
			<path d="M{350 + i * 11} 330 A{170 - i * 11} {170 - i * 11} 0 0 1 {690 - i * 11} 330" stroke={c} />
		{/each}
	</g>

	<!-- Hills (always), in front of the arc's feet -->
	<path d="M0 300 Q120 262 250 296 Q400 250 540 290 Q620 270 680 284 L680 360 L0 360 Z" fill="#B8E6C1" />

	<!-- Layer: rain falling ahead -->
	<g class="layer" style:opacity={op('rain')} fill="#7FC3DC">
		{#each drops as dr (dr.x)}
			<g transform="translate({dr.x} 108)">
				<path class="fall" d="M0 -7 Q5 2 0 6 Q-5 2 0 -7Z" style:animation-delay="-{dr.d}s" />
			</g>
		{/each}
	</g>

	<!-- Layer: sunlight streaming towards the rain -->
	<g class="layer" style:opacity={op('sunlight')} stroke="#FFD27A" stroke-width="4" stroke-linecap="round" fill="none">
		<line class="flow" stroke-dasharray="8 12" x1="110" y1="96" x2="200" y2="170" />
		<line class="flow" stroke-dasharray="8 12" x1="112" y1="112" x2="200" y2="188" />
	</g>

	<!-- Layer: one raindrop up close — white light in, colours out -->
	<g class="layer" style:opacity={op('drop')}>
		<path d="M262 92 Q316 160 300 210 Q262 252 224 210 Q208 160 262 92 Z" fill="#DDF0F8" stroke="#A8D8EA" stroke-width="3" />
		<path d="M150 170 L232 180 L290 206" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" />
		<path d="M150 170 L232 180 L290 206" stroke="#FFD27A" stroke-width="2" fill="none" stroke-linecap="round" />
		<g stroke-width="4" stroke-linecap="round">
			{#each BANDS as c, i (c)}
				<line x1="290" y1="206" x2={214 - i * 3} y2={232 + i * 10} stroke={c} />
			{/each}
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .fall {
			animation: fall 1.8s linear infinite;
		}
		.animate .flow {
			animation: flow 1.6s linear infinite;
		}
	}
	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		15%,
		85% {
			opacity: 1;
		}
		100% {
			transform: translateY(160px);
			opacity: 0;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -40;
		}
	}
</style>
