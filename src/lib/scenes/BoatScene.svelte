<script lang="ts">
	/**
	 * Why a boat floats: a clay ball sinks, the same clay shaped as a boat floats, water
	 * pushes up under the boat, the water it pushes aside, and a big iron ship far off.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SEA = 170;
	const CLAY = '#E8A87C';
	const CLAY_EDGE = '#C9855B';
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A clay ball sinking and a clay boat floating in water"
>
	<rect width="680" height={SEA} fill="#EAF6FB" />
	<rect y={SEA} width="680" height={360 - SEA} fill="#A8D8EA" />
	<rect y="336" width="680" height="24" fill="#F6E6C8" />
	<g stroke="#DDF0F8" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M40 {SEA + 26} q10 -8 20 0 t20 0" /><path d="M560 {SEA + 50} q10 -8 20 0 t20 0" />
	</g>

	<!-- Layer: a big iron ship far away -->
	<g class="layer" style:opacity={op('ship')}>
		<g class="bob">
			<path d="M500 {SEA - 4} L640 {SEA - 4} L620 {SEA + 14} L516 {SEA + 14} Z" fill="#9AA6B2" />
			<rect x="540" y={SEA - 30} width="60" height="26" rx="3" fill="#FFF4E0" stroke="#C9C3BA" stroke-width="1.5" />
			<rect x="580" y={SEA - 50} width="14" height="22" fill="#FF8B7B" />
			<g fill="#A8D8EA"><rect x="548" y={SEA - 24} width="10" height="8" /><rect x="564" y={SEA - 24} width="10" height="8" /></g>
		</g>
	</g>

	<!-- Layer: a clay ball sinking to the bottom -->
	<g class="layer" style:opacity={op('ball')}>
		<circle cx="160" cy="312" r="24" fill={CLAY} stroke={CLAY_EDGE} stroke-width="2.5" />
		<path class="sink" d="M160 {SEA + 30} L160 {SEA + 80} M150 {SEA + 70} L160 {SEA + 82} L170 {SEA + 70}" stroke="#7FB6E0" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
	</g>

	<!-- Layer: water pushed aside by the boat -->
	<g class="layer" style:opacity={op('push-aside')} stroke="#5FA3D6" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M262 {SEA + 22} L230 {SEA + 22} M240 {SEA + 14} L228 {SEA + 22} L240 {SEA + 30}" />
		<path d="M438 {SEA + 22} L470 {SEA + 22} M460 {SEA + 14} L472 {SEA + 22} L460 {SEA + 30}" />
		<path d="M280 {SEA} Q350 {SEA - 12} 420 {SEA}" stroke="#7FB6E0" stroke-dasharray="5 6" />
	</g>

	<!-- Layer: the clay boat floating -->
	<g class="layer" style:opacity={op('boat')}>
		<g class="bob">
			<path d="M270 {SEA - 22} L430 {SEA - 22} Q420 {SEA + 34} 350 {SEA + 34} Q280 {SEA + 34} 270 {SEA - 22} Z" fill={CLAY} stroke={CLAY_EDGE} stroke-width="2.5" />
			<path d="M286 {SEA - 22} Q350 {SEA - 4} 414 {SEA - 22}" fill="#D9925F" />
		</g>
	</g>

	<!-- Layer: water pushing up under the boat -->
	<g class="layer" style:opacity={op('push-up')} stroke="#FFFFFF" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round">
		{#each [310, 350, 390] as x (x)}
			<path class="lift" d="M{x} {SEA + 96} L{x} {SEA + 50} M{x - 9} {SEA + 60} L{x} {SEA + 48} L{x + 9} {SEA + 60}" />
		{/each}
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .bob {
			animation: bob 3s ease-in-out infinite;
		}
		.animate .lift {
			animation: lift 1.6s ease-in-out infinite;
		}
		.animate .sink {
			animation: sink 2s ease-in infinite;
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
	@keyframes lift {
		0%,
		100% {
			transform: translateY(6px);
			opacity: 0.5;
		}
		50% {
			transform: translateY(-4px);
			opacity: 1;
		}
	}
	@keyframes sink {
		0% {
			transform: translateY(-6px);
			opacity: 0;
		}
		50% {
			opacity: 1;
		}
		100% {
			transform: translateY(10px);
			opacity: 0;
		}
	}
</style>
