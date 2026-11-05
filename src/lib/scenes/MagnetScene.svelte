<script lang="ts">
	/**
	 * Magnets: a horseshoe magnet with its invisible pull drawn as dashed lines, iron
	 * paper clips jumping up to it, wood and plastic staying put, and two bar magnets that
	 * pull together (different ends) or push apart (same ends). Ends are told apart by
	 * colour, never by letters.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const A = '#FF8B7B';
	const B = '#7FB6E0';
</script>

{#snippet clip(x: number, y: number, r: number)}
	<path transform="translate({x} {y}) rotate({r})" d="M0 0 L0 -26 Q0 -32 6 -32 Q12 -32 12 -26 L12 -6 Q12 -2 8 -2 Q4 -2 4 -6 L4 -22" stroke="#8E9AB4" stroke-width="3" fill="none" stroke-linecap="round" />
{/snippet}

{#snippet bar(x: number, y: number, left: string, right: string)}
	<rect x={x} y={y} width="60" height="30" rx="4" fill={left} />
	<rect x={x + 60} y={y} width="60" height="30" rx="4" fill={right} />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A magnet pulling paper clips while wood and plastic stay still"
>
	<rect width="680" height="360" fill="#F7FBFC" />
	<rect y="300" width="680" height="60" fill="#E9D6C0" />

	<!-- Horseshoe magnet (always) -->
	<path d="M180 40 L180 140 Q180 200 240 200 Q300 200 300 140 L300 40 L266 40 L266 140 Q266 166 240 166 Q214 166 214 140 L214 40 Z" fill="#C9C3BA" />
	<rect x="180" y="40" width="34" height="30" fill={A} />
	<rect x="266" y="40" width="34" height="30" fill={B} />

	<!-- Layer: the magnet's invisible pull -->
	<g class="layer" style:opacity={op('field')} stroke="#C9B3E6" stroke-width="2" fill="none" stroke-dasharray="5 7">
		<path class="flow" d="M180 70 Q120 110 140 210 Q160 280 240 280 Q320 280 340 210 Q360 110 300 70" />
		<path class="flow" d="M196 70 Q160 120 180 200 Q200 240 240 240 Q280 240 300 200 Q320 120 284 70" />
	</g>

	<!-- Layer: iron paper clips jumping up to the magnet -->
	<g class="layer" style:opacity={op('pull')}>
		<g class="jump">
			{@render clip(234, 230, 8)}
			{@render clip(214, 250, -14)}
			{@render clip(256, 248, 20)}
		</g>
		<path d="M240 290 L240 276 M234 282 L240 274 L246 282" stroke="#8E9AB4" stroke-width="2.5" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: wood, rubber and plastic stay where they are -->
	<g class="layer" style:opacity={op('stay')}>
		<rect x="380" y="262" width="60" height="38" rx="4" fill="#E2B88E" stroke="#C49A75" stroke-width="2" />
		<rect x="460" y="276" width="40" height="24" rx="6" fill="#F7C6D2" stroke="#E8A3B6" stroke-width="2" />
		<circle cx="540" cy="284" r="16" fill="#B8E6C1" stroke="#7DC68E" stroke-width="2" />
	</g>

	<!-- Layer: different ends pull together -->
	<g class="layer" style:opacity={op('attract')}>
		<g class="together">{@render bar(360, 60, A, B)}</g>
		<g class="together-r">{@render bar(490, 60, A, B)}</g>
		<g stroke="#FFB89A" stroke-width="3" fill="none" stroke-linecap="round"><path d="M470 52 L486 52 M482 46 L488 52 L482 58 M504 52 L488 52" /></g>
	</g>

	<!-- Layer: the same ends push apart -->
	<g class="layer" style:opacity={op('repel')}>
		<g class="apart">{@render bar(360, 140, A, B)}</g>
		<g class="apart-r">{@render bar(510, 140, B, A)}</g>
		<g stroke="#A9B6C0" stroke-width="3" fill="none" stroke-linecap="round"><path d="M500 155 L486 155 M492 149 L486 155 L492 161 M500 155 L514 155 M508 149 L514 155 L508 161" /></g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 2s linear infinite;
		}
		.animate .jump {
			animation: jump 2.4s ease-in-out infinite;
		}
		.animate .together {
			animation: tog 2.4s ease-in-out infinite;
		}
		.animate .together-r {
			animation: togr 2.4s ease-in-out infinite;
		}
		.animate .apart {
			animation: togr 2.4s ease-in-out infinite;
		}
		.animate .apart-r {
			animation: tog 2.4s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -24;
		}
	}
	@keyframes jump {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-14px);
		}
	}
	@keyframes tog {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(8px);
		}
	}
	@keyframes togr {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-8px);
		}
	}
</style>
