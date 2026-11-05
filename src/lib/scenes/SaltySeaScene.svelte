<script lang="ts">
	/**
	 * Why the sea is salty: rain falls on rocky hills, rivers carry tiny bits of salt down
	 * to the sea, the salt collects there, the sun lifts only the water back up (leaving the
	 * salt behind), and salt pans on the shore where people collect it.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const RIVER = 'M120 170 Q160 220 220 236 Q300 256 370 268 Q420 276 440 286';
	const seaSalt = [[480, 300], [520, 320], [560, 296], [600, 318], [640, 300], [500, 340], [580, 340], [620, 336], [540, 312]];
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A river carrying salt from rocky hills down to the sea"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<!-- Hills and land (always) -->
	<path d="M0 220 L80 110 L150 180 L220 120 L300 230 L0 230 Z" fill="#C9B6A6" />
	<path d="M80 110 L66 130 L94 130 Z M220 120 L206 140 L234 140 Z" fill="#FFFFFF" />
	<path d="M0 228 Q200 240 440 270 L440 360 L0 360 Z" fill="#B8E6C1" />
	<!-- Sea (always) -->
	<path d="M440 270 Q560 270 680 270 L680 360 L440 360 Z" fill="#A8D8EA" />
	<g stroke="#DDF0F8" stroke-width="3" fill="none" stroke-linecap="round"><path d="M500 290 q10 -8 20 0 t20 0" /><path d="M600 330 q10 -8 20 0 t20 0" /></g>
	<!-- River (always) -->
	<path d={RIVER} stroke="#A8D8EA" stroke-width="12" fill="none" stroke-linecap="round" />

	<!-- Sun (always) -->
	<circle cx="600" cy="70" r="28" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />

	<!-- Layer: rain falling on the rocky hills -->
	<g class="layer" style:opacity={op('rain')}>
		<path d="M70 70 a14 14 0 0 1 10 -24 a22 22 0 0 1 42 -4 a16 16 0 0 1 26 16 a12 12 0 0 1 -2 12 Z" fill="#DDE6EC" />
		<g fill="#7FC3DC">
			{#each [90, 110, 130] as x, i (x)}
				<g transform="translate({x} 82)"><path class="fall" d="M0 -6 Q4 2 0 5 Q-4 2 0 -6 Z" style:animation-delay="-{i * 0.4}s" /></g>
			{/each}
		</g>
	</g>

	<!-- Layer: the river carrying tiny bits of salt -->
	<g class="layer" style:opacity={op('river')}>
		<path class="flow" d={RIVER} stroke="#FFFFFF" stroke-width="4" stroke-dasharray="2 14" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: salt collecting in the sea -->
	<g class="layer" style:opacity={op('salt')} fill="#FFFFFF" stroke="#C9D3DA" stroke-width="1">
		{#each seaSalt as [x, y] (`${x}${y}`)}
			<rect x={x - 3} y={y - 3} width="6" height="6" transform="rotate(45 {x} {y})" />
		{/each}
	</g>

	<!-- Layer: the sun lifting only the water back up -->
	<g class="layer" style:opacity={op('evaporate')} fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5">
		{#each [500, 560, 620] as x, i (x)}
			<g transform="translate({x} 262)"><circle class="rise" r="5" style:animation-delay="-{i * 0.8}s" /></g>
		{/each}
	</g>

	<!-- Layer: salt pans on the shore -->
	<g class="layer" style:opacity={op('pans')}>
		<rect x="300" y="300" width="60" height="30" fill="#DDF0F8" stroke="#C9B6A6" stroke-width="3" />
		<rect x="370" y="300" width="60" height="30" fill="#DDF0F8" stroke="#C9B6A6" stroke-width="3" />
		<path d="M250 340 L270 310 L290 340 Z M226 340 L242 318 L258 340 Z" fill="#FFFFFF" stroke="#E6E2DC" stroke-width="2" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.6s linear infinite;
		}
		.animate .fall {
			animation: fall 1.4s linear infinite;
		}
		.animate .rise {
			animation: rise 3s linear infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -32;
		}
	}
	@keyframes fall {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20%,
		80% {
			opacity: 1;
		}
		100% {
			transform: translateY(70px);
			opacity: 0;
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
</style>
