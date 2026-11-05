<script lang="ts">
	/**
	 * Water cycle: sun, sea, land, a mountain, and a stream back to the sea. The sky,
	 * ground and sun are always drawn; the layers listed in SCENE_CATALOG['water-cycle']
	 * fade in and out as the child moves between sections.
	 *
	 * Locked palette (peach, sky blue, mint, butter) plus tints and shades of it. No text
	 * inside the picture — every word lives in the section text, so Telugu needs nothing
	 * here. Motion is slow and stops entirely under prefers-reduced-motion or `still`.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: {
		layers?: string[];
		/** No motion at all — used for the small card thumbnail. */
		still?: boolean;
		/** Fill a box by cropping (thumbnail) instead of fitting the whole scene. */
		cover?: boolean;
	} = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const rays = [0, 45, 90, 135, 180, 225, 270, 315];
	const vapor = [
		{ x: 70, d: 0, r: 6 },
		{ x: 120, d: 1.6, r: 5 },
		{ x: 170, d: 3.1, r: 6 },
		{ x: 220, d: 0.8, r: 5 },
		{ x: 265, d: 2.4, r: 6 }
	];
	const drops = [
		{ x: 300, d: 0 },
		{ x: 330, d: 0.9 },
		{ x: 360, d: 0.4 },
		{ x: 390, d: 1.3 },
		{ x: 420, d: 0.7 },
		{ x: 315, d: 1.6 },
		{ x: 375, d: 1.1 },
		{ x: 405, d: 0.2 }
	];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A picture of the sun, the sea, a cloud and a mountain"
>
	<!-- Sky -->
	<rect width="680" height="360" fill="#EAF6FB" />

	<!-- Sun (always) -->
	<g stroke="#FFB89A" stroke-width="5" stroke-linecap="round">
		{#each rays as a (a)}
			<line x1="90" y1="26" x2="90" y2="14" transform="rotate({a} 90 72)" />
		{/each}
	</g>
	<circle cx="90" cy="72" r="34" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
	<circle cx="79" cy="66" r="3.5" fill="#A0674E" />
	<circle cx="101" cy="66" r="3.5" fill="#A0674E" />
	<path d="M76 80 Q90 92 104 80" stroke="#A0674E" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Mountain and land (always) -->
	<polygon points="420,290 550,120 680,290" fill="#F6CDB8" />
	<polygon points="550,120 520,160 538,152 551,166 566,152 582,162" fill="#FFFFFF" />
	<rect x="280" y="282" width="400" height="78" fill="#B8E6C1" />

	<!-- Sea (always) -->
	<path d="M0 282 L300 282 Q318 320 302 360 L0 360 Z" fill="#A8D8EA" />
	<g stroke="#EAF6FB" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M30 308 q10 -8 20 0 t20 0 t20 0" />
		<path d="M150 334 q10 -8 20 0 t20 0 t20 0" />
		<path d="M210 300 q10 -8 20 0 t20 0" />
	</g>

	<!-- Stream bed (always), so the sea visibly continues up the hill -->
	<path d="M520 298 Q430 336 304 320" stroke="#A8D8EA" stroke-width="10" fill="none" stroke-linecap="round" />

	<!-- Layer: sunbeams warming the sea -->
	<g class="layer" style:opacity={op('sunbeams')} stroke="#FFB89A" stroke-width="3" stroke-linecap="round" fill="none">
		<line class="flow" stroke-dasharray="6 10" x1="104" y1="114" x2="118" y2="270" />
		<line class="flow" stroke-dasharray="6 10" x1="122" y1="108" x2="180" y2="270" />
		<line class="flow" stroke-dasharray="6 10" x1="140" y1="98" x2="244" y2="270" />
	</g>

	<!-- Layer: vapor rising from the sea -->
	<g class="layer" style:opacity={op('vapor')}>
		<g stroke="#7FC3DC" stroke-width="3" stroke-linecap="round" fill="none">
			<path d="M95 262 L95 206 M87 214 L95 204 L103 214" />
			<path d="M245 262 L245 206 M237 214 L245 204 L253 214" />
		</g>
		{#each vapor as v (v.x)}
			<g transform="translate({v.x} 270)">
				<circle class="rise" r={v.r} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5" style:animation-delay="-{v.d}s" />
			</g>
		{/each}
	</g>

	<!-- Layer: a light, white cloud -->
	<g class="layer" style:opacity={op('cloud')} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="2">
		<path d="M268 132 a24 24 0 0 1 14 -44 a36 36 0 0 1 68 -14 a28 28 0 0 1 52 22 a18 18 0 0 1 -4 36 Z" />
	</g>

	<!-- Layer: the cloud grown heavy and grey -->
	<g class="layer" style:opacity={op('rain-cloud')} fill="#C9D3DA" stroke="#AAB8C2" stroke-width="2">
		<path d="M262 136 a26 26 0 0 1 14 -48 a40 40 0 0 1 76 -16 a30 30 0 0 1 58 24 a20 20 0 0 1 -4 40 Z" />
	</g>

	<!-- Layer: rain falling from the cloud to the land -->
	<g class="layer" style:opacity={op('rain')} fill="#7FC3DC">
		{#each drops as dr (dr.x)}
			<g transform="translate({dr.x} 146)">
				<path class="fall" d="M0 -8 Q6 2 0 7 Q-6 2 0 -8Z" style:animation-delay="-{dr.d}s" />
			</g>
		{/each}
	</g>

	<!-- Layer: water flowing down the stream into the sea -->
	<g class="layer" style:opacity={op('stream')}>
		<path class="flow" d="M520 298 Q430 336 304 320" stroke="#FFFFFF" stroke-width="3" stroke-dasharray="2 14" fill="none" stroke-linecap="round" />
	</g>
</svg>

<style>
	/* Scoped keyframes: Tailwind has no utility for these paths. Only opacity and
	   transform change, and only slowly — the closest this scene gets to the
	   "soft fades only" rule while still showing water moving. */
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .rise {
			animation: rise 4.5s linear infinite;
		}
		.animate .fall {
			animation: fall 2s linear infinite;
		}
		.animate .flow {
			animation: flow 2.4s linear infinite;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20%,
		80% {
			opacity: 1;
		}
		100% {
			transform: translateY(-120px);
			opacity: 0;
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
			transform: translateY(130px);
			opacity: 0;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -32;
		}
	}
</style>
