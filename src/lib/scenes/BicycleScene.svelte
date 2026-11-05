<script lang="ts">
	/**
	 * A bicycle, side on: pedals turning, the chain carrying the turn backwards, the back
	 * wheel spinning, the big and small gear wheels, and the bike rolling forward.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const BACK = { x: 200, y: 240 };
	const FRONT = { x: 480, y: 240 };
	const CRANK = { x: 330, y: 250 };
	const FRAME = '#FF8B7B';
	const spokes = Array.from({ length: 8 }, (_, i) => (i * Math.PI) / 4);
	const CHAIN = `M${CRANK.x} ${CRANK.y - 26} L${BACK.x} ${BACK.y - 12} A12 12 0 0 0 ${BACK.x} ${BACK.y + 12} L${CRANK.x} ${CRANK.y + 26} A26 26 0 0 0 ${CRANK.x} ${CRANK.y - 26} Z`;
</script>

{#snippet wheel(c: { x: number; y: number }, spin: boolean)}
	<circle cx={c.x} cy={c.y} r="72" fill="none" stroke="#6B6B6B" stroke-width="10" />
	<g class:spin style:transform-origin="{c.x}px {c.y}px">
		{#each spokes as t (t)}
			<line x1={c.x} y1={c.y} x2={c.x + Math.cos(t) * 66} y2={c.y + Math.sin(t) * 66} stroke="#B9B4AE" stroke-width="2" />
		{/each}
	</g>
	<circle cx={c.x} cy={c.y} r="6" fill="#8E8A84" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A bicycle with its pedals, chain and wheels"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y="312" width="680" height="48" fill="#C9C3BA" />
	<g class:road={shown.has('move')} stroke="#FFFFFF" stroke-width="4" stroke-dasharray="30 30">
		<line x1="0" y1="336" x2="740" y2="336" />
	</g>

	<!-- Layer: motion lines — the bike is rolling forward -->
	<g class="layer" style:opacity={op('move')} stroke="#A9B6C0" stroke-width="3" stroke-linecap="round">
		<line x1="40" y1="200" x2="100" y2="200" /><line x1="20" y1="240" x2="100" y2="240" /><line x1="50" y1="280" x2="100" y2="280" />
	</g>

	{@render wheel(BACK, shown.has('wheel') || shown.has('move'))}
	{@render wheel(FRONT, shown.has('move'))}

	<!-- Frame (always) -->
	<g stroke={FRAME} stroke-width="9" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M{BACK.x} {BACK.y} L{CRANK.x} {CRANK.y} L430 140 L270 140 Z" />
		<path d="M270 140 L{CRANK.x} {CRANK.y}" />
		<path d="M430 140 L{FRONT.x} {FRONT.y}" />
		<path d="M420 120 L440 120 L436 100 L470 96" />
	</g>
	<path d="M250 128 L296 128" stroke="#6B4A3A" stroke-width="10" stroke-linecap="round" />

	<!-- Chain (always, faint) -->
	<path d={CHAIN} stroke="#B9B4AE" stroke-width="3" fill="none" />

	<!-- Layer: the chain carrying the turn to the back wheel -->
	<g class="layer" style:opacity={op('chain')}>
		<path class="flow" d={CHAIN} stroke="#FFD27A" stroke-width="4" stroke-dasharray="6 6" fill="none" />
	</g>

	<!-- Gear wheels (always) -->
	<circle cx={CRANK.x} cy={CRANK.y} r="26" fill="#FFFFFF" stroke="#8E8A84" stroke-width="3" />
	<circle cx={BACK.x} cy={BACK.y} r="12" fill="#FFFFFF" stroke="#8E8A84" stroke-width="3" />

	<!-- Layer: big gear in front, small gear at the back -->
	<g class="layer" style:opacity={op('gears')}>
		<circle cx={CRANK.x} cy={CRANK.y} r="30" fill="none" stroke="#FFB89A" stroke-width="4" stroke-dasharray="4 4" />
		<circle cx={BACK.x} cy={BACK.y} r="16" fill="none" stroke="#FFB89A" stroke-width="4" stroke-dasharray="4 4" />
	</g>

	<!-- Pedals (always), turning while `pedal` is on -->
	<g class:spin={shown.has('pedal') || shown.has('move')} style:transform-origin="{CRANK.x}px {CRANK.y}px">
		<line x1={CRANK.x} y1={CRANK.y - 40} x2={CRANK.x} y2={CRANK.y + 40} stroke="#6B6B6B" stroke-width="6" stroke-linecap="round" />
		<rect x={CRANK.x - 14} y={CRANK.y - 46} width="28" height="10" rx="3" fill="#4E4E4E" />
		<rect x={CRANK.x - 14} y={CRANK.y + 36} width="28" height="10" rx="3" fill="#4E4E4E" />
	</g>

	<!-- Layer: the back wheel turning (it spins too) -->
	<g class="layer" style:opacity={op('wheel')} stroke="#FFB89A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M{BACK.x - 60} {BACK.y - 92} A96 96 0 0 1 {BACK.x + 60} {BACK.y - 92}" />
		<path d="M{BACK.x + 50} {BACK.y - 100} L{BACK.x + 62} {BACK.y - 91} L{BACK.x + 48} {BACK.y - 84}" />
	</g>

	<!-- Layer: feet pushing the pedals round -->
	<g class="layer" style:opacity={op('pedal')} stroke="#FFB89A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M372 210 A50 50 0 0 1 372 290" />
		<path d="M364 282 L373 292 L382 282" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .spin {
			animation: spin 2.4s linear infinite;
		}
		.animate .flow {
			animation: flow 0.8s linear infinite;
		}
		.animate .road {
			animation: road 0.8s linear infinite;
		}
	}
	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -24;
		}
	}
	@keyframes road {
		to {
			transform: translateX(-60px);
		}
	}
</style>
