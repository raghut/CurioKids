<script lang="ts">
	/**
	 * Where food goes: a simple body outline with the mouth, food pipe, stomach and
	 * intestines drawn faintly. Each stage layer colours its part and shows the food there;
	 * `energy` sends the good parts out to the arms and legs.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const PIPE = 'M340 112 L340 168 Q342 182 352 190';
	const STOMACH = 'M346 186 Q392 170 404 204 Q412 236 376 244 Q350 246 352 224 Q354 206 340 200 Z';
	const SMALL = 'M300 266 q14 -12 28 0 q14 12 28 0 q14 -12 28 0 M300 286 q14 -12 28 0 q14 12 28 0 q14 -12 28 0 M300 306 q14 -12 28 0 q14 12 28 0 q14 -12 28 0';
	const BIG = 'M290 316 L290 254 L392 254 L392 324';
	const FAINT = '#F0D2C6';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A body outline showing the path food takes from the mouth to the tummy"
>
	<rect width="680" height="360" fill="#FFF8F0" />

	<!-- Body (always) -->
	<g fill="#FFE8DA" stroke="#F0C4AE" stroke-width="3">
		<rect x="248" y="130" width="184" height="226" rx="70" />
		<rect x="200" y="150" width="40" height="150" rx="20" />
		<rect x="440" y="150" width="40" height="150" rx="20" />
		<circle cx="340" cy="78" r="50" />
	</g>
	<circle cx="322" cy="70" r="5" fill="#4E3A2E" />
	<circle cx="358" cy="70" r="5" fill="#4E3A2E" />

	<!-- Organs, faint (always) -->
	<g fill="none" stroke={FAINT} stroke-width="8" stroke-linecap="round" stroke-linejoin="round">
		<path d={PIPE} />
		<path d={BIG} />
		<path d={SMALL} stroke-width="6" />
	</g>
	<path d={STOMACH} fill={FAINT} />
	<path d="M326 96 Q340 104 354 96" stroke="#C26B54" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Layer: food in the mouth, being chewed -->
	<g class="layer" style:opacity={op('mouth')}>
		<g class="chew">
			<circle cx="400" cy="102" r="14" fill="#FF8B7B" />
			<path d="M400 88 q4 -8 10 -8" stroke="#7DC68E" stroke-width="3" fill="none" stroke-linecap="round" />
		</g>
		<path d="M322 94 Q340 110 358 94" fill="#FFB89A" stroke="#C26B54" stroke-width="2.5" />
	</g>

	<!-- Layer: swallowed, sliding down the food pipe -->
	<g class="layer" style:opacity={op('pipe')}>
		<path d={PIPE} stroke="#FFB89A" stroke-width="8" fill="none" stroke-linecap="round" />
		<circle class="slide" cx="340" cy="120" r="7" fill="#FF8B7B" />
	</g>

	<!-- Layer: the stomach churning it into mush -->
	<g class="layer" style:opacity={op('stomach')}>
		<g class="churn" style:transform-origin="376px 212px">
			<path d={STOMACH} fill="#FFB89A" stroke="#F09A7E" stroke-width="2.5" />
			<g fill="#FF8B7B"><circle cx="370" cy="204" r="5" /><circle cx="386" cy="222" r="4" /><circle cx="364" cy="228" r="4" /></g>
		</g>
	</g>

	<!-- Layer: the long tube taking out the good parts -->
	<g class="layer" style:opacity={op('intestine')}>
		<path d={BIG} stroke="#F6CDB8" stroke-width="8" fill="none" stroke-linecap="round" stroke-linejoin="round" />
		<path d={SMALL} stroke="#FFB89A" stroke-width="6" fill="none" stroke-linecap="round" />
		<path class="flow" d={SMALL} stroke="#FFE4A3" stroke-width="2.5" stroke-dasharray="4 10" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: energy spreading out to the whole body -->
	<g class="layer" style:opacity={op('energy')} stroke="#FFD27A" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
		<path class="flow" d="M330 280 Q260 230 220 170" />
		<path class="flow" d="M350 280 Q420 230 460 170" />
		<path class="flow" d="M320 300 Q300 330 290 350" />
		<path class="flow" d="M360 300 Q380 330 390 350" />
		<g fill="#FFD27A" stroke="none">
			<path d="M200 120 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z" />
			<path d="M480 120 l4 9 9 4 -9 4 -4 9 -4 -9 -9 -4 9 -4 Z" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .chew {
			animation: chew 1.2s ease-in-out infinite;
		}
		.animate .slide {
			animation: slide 2s ease-in infinite;
		}
		.animate .churn {
			animation: churn 2.4s ease-in-out infinite;
		}
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
	}
	@keyframes chew {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-10px);
		}
	}
	@keyframes slide {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(60px);
			opacity: 0;
		}
	}
	@keyframes churn {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -28;
		}
	}
</style>
