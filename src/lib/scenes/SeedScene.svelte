<script lang="ts">
	/**
	 * A seed growing, as a cut-away of the soil: seed, water soaking in, roots going down,
	 * a shoot coming up, leaves, and finally a flower. Each growth stage is its own layer
	 * so a section can show exactly one moment. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const GREEN = '#7DC68E';
	const STEM = '#5FAE72';
	const drops = [300, 340, 380, 320, 360].map((x, i) => ({ x, d: i * 0.35 }));
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A seed under the soil growing into a plant"
>
	<rect width="680" height="200" fill="#EAF6FB" />
	<!-- Soil, cut away (always) -->
	<rect y="200" width="680" height="160" fill="#EBCDB4" />
	<rect y="196" width="680" height="10" fill="#B8E6C1" />
	<g fill="#DDB79A">
		<circle cx="60" cy="250" r="5" /><circle cx="150" cy="310" r="4" /><circle cx="520" cy="240" r="5" />
		<circle cx="600" cy="320" r="4" /><circle cx="460" cy="300" r="3" /><circle cx="220" cy="236" r="3" />
	</g>

	<!-- Sun (always) -->
	<g stroke="#FFB89A" stroke-width="5" stroke-linecap="round">
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line x1="80" y1="22" x2="80" y2="12" transform="rotate({a} 80 62)" />
		{/each}
	</g>
	<circle cx="80" cy="62" r="30" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />

	<!-- Layer: sunlight reaching the leaves -->
	<g class="layer" style:opacity={op('sunlight')} stroke="#FFD27A" stroke-width="4" stroke-linecap="round">
		<line class="flow" stroke-dasharray="8 12" x1="118" y1="72" x2="290" y2="110" />
		<line class="flow" stroke-dasharray="8 12" x1="112" y1="94" x2="290" y2="146" />
	</g>

	<!-- Layer: water soaking down to the seed -->
	<g class="layer" style:opacity={op('water')}>
		<path d="M290 60 a18 18 0 0 1 12 -32 a30 30 0 0 1 58 -8 a22 22 0 0 1 40 24 a14 14 0 0 1 -6 16 Z" fill="#FFFFFF" stroke="#A8D8EA" stroke-width="2" />
		<g fill="#7FC3DC">
			{#each drops as dr (dr.x)}
				<g transform="translate({dr.x} 74)">
					<path class="fall" d="M0 -7 Q5 2 0 6 Q-5 2 0 -7Z" style:animation-delay="-{dr.d}s" />
				</g>
			{/each}
		</g>
		<ellipse cx="340" cy="262" rx="70" ry="26" fill="#D9AE90" opacity="0.8" />
	</g>

	<!-- Layer: roots growing down -->
	<g class="layer" style:opacity={op('root')} stroke="#C79A7C" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M340 270 Q336 300 342 340" />
		<path d="M340 286 Q322 300 308 324" />
		<path d="M341 292 Q360 306 374 330" />
		<path d="M338 312 Q326 320 320 336" />
	</g>

	<!-- Seed (always) -->
	<ellipse cx="340" cy="262" rx="16" ry="11" fill="#B07A5A" stroke="#8E5F44" stroke-width="2" />

	<!-- Layer: a tiny shoot just through the soil -->
	<g class="layer" style:opacity={op('shoot')} fill="none" stroke-linecap="round">
		<path d="M340 252 Q338 220 344 186 Q352 176 346 170" stroke={STEM} stroke-width="4" />
		<path d="M344 186 q12 -10 20 -4 q-8 10 -20 4 Z" fill={GREEN} stroke={STEM} stroke-width="1.5" />
	</g>

	<!-- Layer: a young plant with leaves -->
	<g class="layer" style:opacity={op('leaves')} stroke-linecap="round">
		<path d="M340 252 Q336 190 340 120" stroke={STEM} stroke-width="5" fill="none" />
		<path d="M339 170 q-40 -26 -64 -6 q26 26 64 6 Z" fill={GREEN} stroke={STEM} stroke-width="2" />
		<path d="M340 140 q40 -30 66 -8 q-28 28 -66 8 Z" fill={GREEN} stroke={STEM} stroke-width="2" />
		<path d="M340 122 q-10 -20 0 -30 q10 12 0 30 Z" fill={GREEN} stroke={STEM} stroke-width="2" />
	</g>

	<!-- Layer: a grown plant with a flower -->
	<g class="layer" style:opacity={op('flower')} stroke-linecap="round">
		<path d="M340 252 Q334 170 340 70" stroke={STEM} stroke-width="5" fill="none" />
		<path d="M338 190 q-46 -28 -74 -6 q30 30 74 6 Z" fill={GREEN} stroke={STEM} stroke-width="2" />
		<path d="M340 150 q46 -32 76 -8 q-32 32 -76 8 Z" fill={GREEN} stroke={STEM} stroke-width="2" />
		<g fill="#FFB89A" stroke="#FF8B7B" stroke-width="1.5">
			{#each [0, 72, 144, 216, 288] as a (a)}
				<ellipse cx="340" cy="44" rx="11" ry="18" transform="rotate({a} 340 62)" />
			{/each}
		</g>
		<circle cx="340" cy="62" r="11" fill="#FFE4A3" stroke="#F5CF7E" stroke-width="2" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .fall {
			animation: fall 1.6s linear infinite;
		}
		.animate .flow {
			animation: flow 1.8s linear infinite;
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
			transform: translateY(150px);
			opacity: 0;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -40;
		}
	}
</style>
