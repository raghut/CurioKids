<script lang="ts">
	/**
	 * Lightning and thunder, kept calm: a storm cloud, a soft (never flashing) bolt, fast
	 * straight light reaching the house at once, slow sound rings following, and three
	 * dots for counting the seconds in between. The house window glows: indoors is safe.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const B = { x: 170, y: 300 };
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A storm cloud with lightning far away and a house"
>
	<rect width="680" height="360" fill="#C9D3E6" />
	<path d="M0 300 Q200 284 400 300 Q560 288 680 296 L680 360 L0 360 Z" fill="#A9D3B2" />

	<!-- House (always) -->
	<polygon points="520,226 584,176 648,226" fill="#FFB89A" />
	<rect x="532" y="224" width="104" height="80" fill="#FFF4E0" stroke="#F0D9B5" stroke-width="2" />
	<rect x="548" y="240" width="32" height="28" rx="3" fill="#DDE6EC" stroke="#C9B9A8" stroke-width="2" />
	<rect x="596" y="254" width="24" height="50" rx="2" fill="#F6CDB8" />

	<!-- Layer: the storm cloud -->
	<g class="layer" style:opacity={op('storm')}>
		<path d="M60 120 a34 34 0 0 1 22 -62 a52 52 0 0 1 100 -18 a40 40 0 0 1 76 28 a30 30 0 0 1 10 52 Z" fill="#8E9AB4" stroke="#7A86A0" stroke-width="2" />
	</g>

	<!-- Layer: a soft lightning bolt -->
	<g class="layer" style:opacity={op('lightning')}>
		<circle class="glow" cx="170" cy="210" r="90" fill="#FFE4A3" opacity="0.35" />
		<path d="M176 122 L146 206 L176 206 L150 298 L214 186 L182 186 L206 122 Z" fill="#FFE4A3" stroke="#FFD27A" stroke-width="3" stroke-linejoin="round" />
	</g>

	<!-- Layer: light zooming straight to the house -->
	<g class="layer" style:opacity={op('light')} stroke="#FFD27A" stroke-width="3" stroke-linecap="round">
		<line class="fast" x1="226" y1="200" x2="520" y2="230" stroke-dasharray="14 10" />
		<line class="fast" x1="226" y1="226" x2="520" y2="256" stroke-dasharray="14 10" />
	</g>

	<!-- Layer: sound travelling outwards, slowly -->
	<g class="layer" style:opacity={op('sound')} fill="none" stroke="#FFFFFF" stroke-width="3">
		{#each [0, 1, 2] as i (i)}
			<circle class="ring" cx={B.x} cy={B.y} r="40" style:transform-origin="{B.x}px {B.y}px" style:animation-delay="-{i * 1.2}s" />
		{/each}
	</g>

	<!-- Layer: three dots — count one, two, three -->
	<g class="layer" style:opacity={op('count')} fill="#FFFFFF" stroke="#7A86A0" stroke-width="2">
		<circle class="tick" cx="300" cy="330" r="9" />
		<circle class="tick" cx="360" cy="330" r="9" style:animation-delay="1s" />
		<circle class="tick" cx="420" cy="330" r="9" style:animation-delay="2s" />
	</g>

	<!-- Layer: warm and safe indoors -->
	<g class="layer" style:opacity={op('safe')}>
		<rect x="548" y="240" width="32" height="28" rx="3" fill="#FFE4A3" stroke="#FFB89A" stroke-width="2" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .glow {
			animation: glow 3s ease-in-out infinite;
		}
		.animate .fast {
			animation: fast 0.6s linear infinite;
		}
		.animate .ring {
			animation: ring 3.6s ease-out infinite;
		}
		.animate .tick {
			animation: tick 3s step-end infinite;
		}
	}
	@keyframes glow {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 0.6;
		}
	}
	@keyframes fast {
		to {
			stroke-dashoffset: -48;
		}
	}
	@keyframes ring {
		0% {
			transform: scale(0.4);
			opacity: 0.9;
		}
		100% {
			transform: scale(5);
			opacity: 0;
		}
	}
	@keyframes tick {
		0% {
			fill: #ffffff;
		}
		33% {
			fill: #ffe4a3;
		}
	}
</style>
