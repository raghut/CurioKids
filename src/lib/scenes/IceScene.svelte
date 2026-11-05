<script lang="ts">
	/**
	 * Why ice floats: an ice cube bobbing in a glass, a close-up of water's tiny bits
	 * jumbled close together vs ice's bits locked in a roomy pattern, a bottle bulging as
	 * its water freezes, and a frozen pond with fish safe underneath.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const jumble = [[0, 0], [14, 4], [28, -2], [6, 14], [20, 16], [34, 12], [-4, 26], [12, 28], [26, 30], [38, 26]];
	const lattice = Array.from({ length: 9 }, (_, i) => {
		const r = Math.floor(i / 3), c = i % 3;
		return [c * 26 + (r % 2) * 13, r * 22];
	});
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="An ice cube floating in a glass of water"
>
	<rect width="680" height="360" fill="#F7FBFC" />
	<rect y="310" width="680" height="50" fill="#E9D6C0" />

	<!-- Glass of water (always) -->
	<path d="M70 120 L190 120 L178 310 L82 310 Z" fill="#FFFFFF" stroke="#C9D3DA" stroke-width="3" />
	<path d="M75 170 L185 170 L178 310 L82 310 Z" fill="#CDEBF5" />

	<!-- Layer: an ice cube floating at the top -->
	<g class="layer" style:opacity={op('cube')}>
		<g class="bob">
			<rect x="104" y="146" width="50" height="46" rx="8" fill="#EAF6FB" stroke="#A8D8EA" stroke-width="2.5" />
			<path d="M114 156 L126 156" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" />
		</g>
	</g>

	<!-- Layer: water's tiny bits, jumbled close together -->
	<g class="layer" style:opacity={op('water-bits')}>
		<circle cx="300" cy="110" r="66" fill="#FFFFFF" stroke="#A8D8EA" stroke-width="3" />
		<g transform="translate(282 92)">
			{#each jumble as [x, y], i (i)}
				<circle class="jiggle" cx={x} cy={y} r="7" fill="#7FB6E0" style:animation-delay="-{i * 0.15}s" />
			{/each}
		</g>
	</g>

	<!-- Layer: ice's bits, locked in a roomy pattern -->
	<g class="layer" style:opacity={op('ice-bits')}>
		<circle cx="460" cy="110" r="66" fill="#FFFFFF" stroke="#A8D8EA" stroke-width="3" />
		<g transform="translate(428 88)" stroke="#C9D3DA" stroke-width="2">
			{#each lattice as [x, y], i (i)}
				{#if i % 3 !== 2}<line x1={x} y1={y} x2={x + 26} y2={y} />{/if}
				{#if i < 6}<line x1={x} y1={y} x2={x + 13} y2={y + 22} />{/if}
			{/each}
			{#each lattice as [x, y], i (i)}
				<circle cx={x} cy={y} r="7" fill="#CDEBF5" stroke="#7FB6E0" />
			{/each}
		</g>
	</g>

	<!-- Layer: a full bottle bulging as its water freezes -->
	<g class="layer" style:opacity={op('expand')}>
		<rect x="290" y="200" width="28" height="20" rx="3" fill="#A8D8EA" />
		<path d="M276 220 Q256 230 260 260 L260 300 Q260 310 270 310 L338 310 Q348 310 348 300 L348 260 Q352 230 332 220 Z" fill="#EAF6FB" stroke="#A8D8EA" stroke-width="3" />
		<path d="M296 200 Q304 184 312 200" fill="#EAF6FB" stroke="#A8D8EA" stroke-width="2.5" />
		<g stroke="#7FB6E0" stroke-width="2.5" fill="none" stroke-linecap="round"><path d="M248 268 L238 268 M360 268 L370 268" /></g>
	</g>

	<!-- Layer: a frozen pond — ice on top, fish safe below -->
	<g class="layer" style:opacity={op('pond')}>
		<rect x="420" y="220" width="240" height="90" rx="10" fill="#A8D8EA" />
		<rect x="420" y="220" width="240" height="20" rx="6" fill="#EAF6FB" stroke="#CDEBF5" stroke-width="2" />
		<g class="swim">
			<ellipse cx="520" cy="275" rx="20" ry="10" fill="#FFB89A" />
			<path d="M538 275 L552 265 L552 285 Z" fill="#FFB89A" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .bob {
			animation: bob 2.6s ease-in-out infinite;
		}
		.animate .jiggle {
			animation: jiggle 0.9s ease-in-out infinite;
		}
		.animate .swim {
			animation: swim 4s ease-in-out infinite;
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
	@keyframes jiggle {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(2px, -2px);
		}
	}
	@keyframes swim {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(60px);
		}
	}
</style>
