<script lang="ts">
	/**
	 * A volcano, cut away: heat deep below, melted rock (magma) collecting in a chamber,
	 * rising through the vent, erupting as lava and ash, flowing down, and cooling into new
	 * rock with a plant. Warm tints only — coral is the hottest colour, never bright red.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const LAVA = '#FF8B7B';
	const HOT = '#FFB89A';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A volcano cut open to show melted rock rising inside it"
>
	<rect width="680" height="230" fill="#EAF6FB" />
	<!-- Underground layers (always) -->
	<rect y="220" width="680" height="140" fill="#E9C9AE" />
	<rect y="270" width="680" height="90" fill="#DDB497" />
	<rect y="320" width="680" height="40" fill="#CFA084" />

	<!-- Layer: great heat deep inside the Earth -->
	<g class="layer" style:opacity={op('heat')}>
		<rect y="318" width="680" height="42" fill={HOT} opacity="0.8" />
		<g stroke="#FFE4A3" stroke-width="3" fill="none" stroke-linecap="round">
			<path class="shimmer" d="M120 340 q6 -10 0 -20 q-6 -10 0 -20" />
			<path class="shimmer" d="M560 340 q6 -10 0 -20 q-6 -10 0 -20" style:animation-delay="-0.8s" />
		</g>
	</g>

	<!-- Volcano cone (always) -->
	<path d="M150 224 L300 74 L380 74 L530 224 Z" fill="#C9A58C" />
	<path d="M300 74 L380 74 L372 86 L308 86 Z" fill="#A9866E" />

	<!-- Magma chamber shape (always, empty) -->
	<ellipse cx="340" cy="290" rx="110" ry="34" fill="#C49A80" />
	<path d="M330 260 L326 86 L354 86 L350 260 Z" fill="#B8917A" />

	<!-- Layer: melted rock collecting in the chamber -->
	<g class="layer" style:opacity={op('magma')}>
		<ellipse class="glow" cx="340" cy="290" rx="110" ry="34" fill={LAVA} />
		<ellipse cx="340" cy="290" rx="70" ry="18" fill={HOT} />
	</g>

	<!-- Layer: magma rising up the vent -->
	<g class="layer" style:opacity={op('rise')}>
		<path d="M330 260 L326 86 L354 86 L350 260 Z" fill={LAVA} />
		<path class="flow" d="M340 256 L340 92" stroke="#FFE4A3" stroke-width="4" stroke-dasharray="8 12" stroke-linecap="round" />
	</g>

	<!-- Layer: eruption — a lava fountain and an ash cloud -->
	<g class="layer" style:opacity={op('erupt')}>
		<path d="M400 70 a22 22 0 0 1 14 -28 a32 32 0 0 1 60 -2 a28 28 0 0 1 50 8 a20 20 0 0 1 20 22 Z" fill="#B9B4AE" />
		<path d="M372 66 Q384 50 404 56" stroke="#B9B4AE" stroke-width="12" fill="none" stroke-linecap="round" />
		<g class="spurt" style:transform-origin="340px 80px">
			<path d="M340 80 Q318 46 300 64 M340 80 Q340 36 340 44 M340 80 Q362 46 380 64" stroke={LAVA} stroke-width="9" fill="none" stroke-linecap="round" />
		</g>
		<g fill={LAVA}><circle cx="296" cy="56" r="6" /><circle cx="388" cy="54" r="6" /><circle cx="340" cy="34" r="6" /></g>
	</g>

	<!-- Layer: lava flowing down the sides -->
	<g class="layer" style:opacity={op('flow')}>
		<path d="M306 80 Q276 130 262 170 Q252 200 230 222 L252 222 Q270 200 280 172 Q296 130 318 84 Z" fill={LAVA} />
		<path d="M374 80 Q404 130 418 170 Q430 200 452 222 L430 222 Q412 200 402 172 Q386 130 362 84 Z" fill={LAVA} />
		<path class="flow" d="M312 86 Q284 140 260 210" stroke="#FFE4A3" stroke-width="3" stroke-dasharray="6 12" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: lava cooled into new rock, with a little plant -->
	<g class="layer" style:opacity={op('cool')}>
		<path d="M160 224 Q210 200 250 214 Q240 224 160 224 Z" fill="#7E7570" />
		<path d="M520 224 Q470 200 430 214 Q440 224 520 224 Z" fill="#7E7570" />
		<path d="M200 214 L200 196" stroke="#5FAE72" stroke-width="3" stroke-linecap="round" />
		<path d="M200 200 q-12 -8 -16 2 q10 6 16 -2 Z M200 202 q12 -10 18 0 q-10 8 -18 0 Z" fill="#7DC68E" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .glow {
			animation: glow 2.6s ease-in-out infinite;
		}
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
		.animate .spurt {
			animation: spurt 1.6s ease-in-out infinite;
		}
		.animate .shimmer {
			animation: glow 2s ease-in-out infinite;
		}
	}
	@keyframes glow {
		0%,
		100% {
			opacity: 0.75;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: 40;
		}
	}
	@keyframes spurt {
		0%,
		100% {
			transform: scaleY(0.9);
		}
		50% {
			transform: scaleY(1.12);
		}
	}
</style>
