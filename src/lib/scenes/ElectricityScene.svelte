<script lang="ts">
	/**
	 * Electricity to a home: a power station with a spinning wheel, tall towers, a pole
	 * with a transformer box, and a house whose bulb lights up. Flow is drawn as soft
	 * moving dashes along the wires. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	// High wire: station -> tower 1 -> tower 2 -> pole. Low wire: pole -> house.
	const HIGH = 'M150 120 Q200 100 245 92 Q320 120 395 92 Q450 110 500 124';
	const LOW = 'M500 140 Q540 158 572 176';
	const WIRE = '#8E8A84';
</script>

{#snippet tower(x: number)}
	<g stroke="#A9A39B" stroke-width="3" stroke-linecap="round" fill="none">
		<path d="M{x - 26} 300 L{x} 92 L{x + 26} 300" />
		<path d="M{x - 20} 250 L{x + 20} 250 M{x - 14} 200 L{x + 14} 200 M{x - 8} 150 L{x + 8} 150" />
		<path d="M{x - 20} 250 L{x + 14} 200 M{x + 20} 250 L{x - 14} 200 M{x - 14} 200 L{x + 8} 150 M{x + 14} 200 L{x - 8} 150" />
		<path d="M{x - 24} 100 L{x + 24} 100" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A power station, tall towers and wires bringing electricity to a house"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y="296" width="680" height="64" fill="#B8E6C1" />

	<!-- Power station (always) -->
	<rect x="30" y="150" width="120" height="146" rx="6" fill="#F6CDB8" stroke="#E8B49A" stroke-width="2" />
	<rect x="50" y="110" width="22" height="44" fill="#E8B49A" />
	<circle cx="90" cy="226" r="34" fill="#FFFFFF" stroke="#E8B49A" stroke-width="3" />
	<g class="spin" style:transform-origin="90px 226px">
		<g stroke="#FFB89A" stroke-width="6" stroke-linecap="round">
			<line x1="90" y1="200" x2="90" y2="252" />
			<line x1="64" y1="226" x2="116" y2="226" />
			<line x1="72" y1="208" x2="108" y2="244" />
			<line x1="108" y1="208" x2="72" y2="244" />
		</g>
	</g>
	<circle cx="90" cy="226" r="7" fill="#FFB89A" />

	<!-- Towers, pole and wires (always) -->
	{@render tower(245)}
	{@render tower(395)}
	<line x1="500" y1="118" x2="500" y2="300" stroke="#C9A58C" stroke-width="7" stroke-linecap="round" />
	<rect x="484" y="128" width="32" height="30" rx="4" fill="#DDE6EC" stroke="#A9A39B" stroke-width="2" />
	<path d={HIGH} stroke={WIRE} stroke-width="2.5" fill="none" />
	<path d={LOW} stroke={WIRE} stroke-width="2.5" fill="none" />

	<!-- House (always) -->
	<polygon points="560,200 616,150 672,200" fill="#FFB89A" />
	<rect x="572" y="198" width="88" height="98" fill="#FFF4E0" stroke="#F0D9B5" stroke-width="2" />
	<rect x="584" y="214" width="34" height="30" rx="3" fill="#DDE6EC" stroke="#C9B9A8" stroke-width="2" />
	<rect x="628" y="246" width="22" height="50" rx="2" fill="#F6CDB8" />

	<!-- Layer: electricity flowing along the tall wires -->
	<g class="layer" style:opacity={op('flow-high')}>
		<path class="flow" d={HIGH} stroke="#FFD27A" stroke-width="5" stroke-dasharray="6 14" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: the transformer box making it gentler for homes -->
	<g class="layer" style:opacity={op('transformer')}>
		<rect class="pulse" x="476" y="120" width="48" height="46" rx="8" fill="none" stroke="#FFD27A" stroke-width="4" />
	</g>

	<!-- Layer: electricity flowing into the house -->
	<g class="layer" style:opacity={op('flow-home')}>
		<path class="flow" d={LOW} stroke="#FFD27A" stroke-width="5" stroke-dasharray="6 14" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: the bulb glowing in the window -->
	<g class="layer" style:opacity={op('bulb')}>
		<rect x="584" y="214" width="34" height="30" rx="3" fill="#FFE4A3" stroke="#FFB89A" stroke-width="2" />
		<circle cx="601" cy="226" r="7" fill="#FFF4E0" stroke="#FFB89A" stroke-width="2" />
		<rect x="598" y="232" width="6" height="5" fill="#E8B49A" />
		<g stroke="#FFD27A" stroke-width="2.5" stroke-linecap="round">
			<line x1="601" y1="204" x2="601" y2="196" />
			<line x1="580" y1="210" x2="574" y2="204" />
			<line x1="622" y1="210" x2="628" y2="204" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .spin {
			animation: spin 4s linear infinite;
		}
		.animate .flow {
			animation: flow 1.4s linear infinite;
		}
		.animate .pulse {
			animation: pulse 2s ease-in-out infinite;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -40;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
</style>
