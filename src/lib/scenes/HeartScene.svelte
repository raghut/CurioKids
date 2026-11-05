<script lang="ts">
	/**
	 * The heart: a body outline with the heart beating in the chest, pushing blood out,
	 * blood travelling round the body and back, the lungs adding fresh air to it, and a
	 * close-up of the beat you can feel at your wrist.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const LOOP = 'M330 176 Q240 150 226 220 Q216 290 270 330 L410 330 Q464 290 454 220 Q440 150 352 176';
	const HEART = 'M340 214 C300 186 300 150 322 146 C334 144 340 154 340 160 C340 154 346 144 358 146 C380 150 380 186 340 214 Z';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A body with the heart pumping blood around it"
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
	<path d="M326 94 Q340 104 354 94" stroke="#C26B54" stroke-width="3" fill="none" stroke-linecap="round" />

	<!-- Layer: the lungs, adding fresh air to the blood -->
	<g class="layer" style:opacity={op('lungs')}>
		<path d="M300 150 Q268 170 272 230 Q290 244 316 226 L316 160 Z" fill="#CDE8F2" stroke="#A8D8EA" stroke-width="2" />
		<path d="M380 150 Q412 170 408 230 Q390 244 364 226 L364 160 Z" fill="#CDE8F2" stroke="#A8D8EA" stroke-width="2" />
		<g fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1"><circle class="pulse" cx="292" cy="196" r="4" /><circle class="pulse" cx="388" cy="196" r="4" style:animation-delay="-0.7s" /></g>
	</g>

	<!-- Layer: blood travelling round the body and back -->
	<g class="layer" style:opacity={op('blood')}>
		<path d={LOOP} stroke="#F7B3A9" stroke-width="8" fill="none" stroke-linecap="round" />
		<path class="flow" d={LOOP} stroke="#FF8B7B" stroke-width="3" stroke-dasharray="6 12" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: blood pushed out of the heart -->
	<g class="layer" style:opacity={op('pump')} stroke="#FF8B7B" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path class="push" d="M300 176 L270 168 M278 160 L268 168 L278 176" />
		<path class="push" d="M380 176 L410 168 M402 160 L412 168 L402 176" />
	</g>

	<!-- Layer: the heart, beating -->
	<g class="layer" style:opacity={op('heart')}>
		<g class="beat" style:transform-origin="340px 180px">
			<path d={HEART} fill="#FF8B7B" stroke="#E86F5E" stroke-width="2.5" />
			<path d="M326 160 q4 -6 10 -4" stroke="#FFD3BF" stroke-width="3" fill="none" stroke-linecap="round" />
		</g>
	</g>

	<!-- Layer: feel the beat at your wrist -->
	<g class="layer" style:opacity={op('pulse-wrist')}>
		<circle cx="580" cy="250" r="72" fill="#FFFFFF" stroke="#FFB89A" stroke-width="3" />
		<rect x="520" y="230" width="120" height="40" rx="20" fill="#FFE8DA" stroke="#F0C4AE" stroke-width="2" />
		<path class="trace" d="M520 210 L548 210 L556 192 L566 228 L574 210 L612 210 L620 194 L630 226 L638 210" stroke="#FF8B7B" stroke-width="3" fill="none" stroke-linejoin="round" />
		<line x1="460" y1="250" x2="480" y2="240" stroke="#FFB89A" stroke-width="2.5" stroke-linecap="round" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .beat {
			animation: beat 1s ease-in-out infinite;
		}
		.animate .flow {
			animation: flow 2s linear infinite;
		}
		.animate .push {
			animation: pulse 1s ease-in-out infinite;
		}
		.animate .pulse {
			animation: pulse 2s ease-in-out infinite;
		}
		.animate .trace {
			animation: pulse 1s ease-in-out infinite;
		}
	}
	@keyframes beat {
		0%,
		60%,
		100% {
			transform: scale(1);
		}
		15% {
			transform: scale(1.12);
		}
		35% {
			transform: scale(1.06);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -36;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 1;
		}
	}
</style>
