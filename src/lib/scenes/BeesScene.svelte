<script lang="ts">
	/**
	 * Bees making honey: flowers on the left, a hive hanging on the right. Layers show a
	 * bee sipping nectar, pollen on its body, the flight home, the wax cells filling, bees
	 * fanning, and honey ready. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const PATH = 'M150 150 Q300 40 470 120';

	// Honeycomb close-up: a small grid of hexagons.
	const hex = (cx: number, cy: number, r: number) =>
		[0, 60, 120, 180, 240, 300]
			.map((a) => {
				const t = (a * Math.PI) / 180;
				return `${(cx + r * Math.cos(t)).toFixed(1)},${(cy + r * Math.sin(t)).toFixed(1)}`;
			})
			.join(' ');
	const cells = [
		[0, 0], [1, 0.5], [2, 0], [0, 1], [1, 1.5], [2, 1]
	].map(([c, r], i) => ({ x: 300 + c * 27, y: 236 + r * 31, full: i % 3 !== 2 }));
</script>

{#snippet bee(x: number, y: number, s: number)}
	<g transform="translate({x} {y}) scale({s})">
		<ellipse class="wing" cx="-3" cy="-11" rx="7" ry="10" fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5" />
		<ellipse class="wing" cx="6" cy="-11" rx="7" ry="10" fill="#FFFFFF" stroke="#A8D8EA" stroke-width="1.5" />
		<ellipse cx="0" cy="0" rx="14" ry="10" fill="#FFD27A" stroke="#6B4A3A" stroke-width="1.5" />
		<path d="M-5 -9 L-5 9 M3 -10 L3 10" stroke="#6B4A3A" stroke-width="3" />
		<circle cx="15" cy="0" r="5" fill="#6B4A3A" />
	</g>
{/snippet}

{#snippet flower(x: number, y: number, c: string)}
	<path d="M{x} {y} L{x} 304" stroke="#5FAE72" stroke-width="4" />
	<g fill={c} stroke="#FF8B7B" stroke-width="1.5">
		{#each [0, 72, 144, 216, 288] as a (a)}
			<ellipse cx={x} cy={y - 16} rx="10" ry="15" transform="rotate({a} {x} {y})" />
		{/each}
	</g>
	<circle cx={x} cy={y} r="9" fill="#FFE4A3" stroke="#F5CF7E" stroke-width="2" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Flowers, a bee and a beehive"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y="300" width="680" height="60" fill="#B8E6C1" />

	<!-- Flowers (always) -->
	{@render flower(70, 220, '#FFB89A')}
	{@render flower(150, 190, '#F7C6D2')}
	{@render flower(230, 236, '#FFB89A')}

	<!-- Tree branch and hive (always) -->
	<path d="M680 40 Q600 50 520 44" stroke="#C79A7C" stroke-width="12" fill="none" stroke-linecap="round" />
	<line x1="560" y1="46" x2="560" y2="66" stroke="#C79A7C" stroke-width="4" />
	<g fill="#FFE4A3" stroke="#E8B868" stroke-width="2">
		<rect x="518" y="64" width="84" height="34" rx="17" />
		<rect x="506" y="94" width="108" height="38" rx="19" />
		<rect x="512" y="128" width="96" height="36" rx="18" />
		<rect x="526" y="160" width="68" height="30" rx="15" />
	</g>
	<ellipse cx="560" cy="146" rx="12" ry="8" fill="#B07A5A" />

	<!-- Layer: a bee drinking nectar from a flower -->
	<g class="layer" style:opacity={op('nectar')}>
		{@render bee(162, 168, 1.1)}
		<path class="sip" d="M150 182 q-3 -6 0 -10 q3 4 0 10 Z" fill="#FFD27A" />
	</g>

	<!-- Layer: yellow pollen dusting the bee and the flowers -->
	<g class="layer" style:opacity={op('pollen')} fill="#F5CF7E">
		<circle cx="150" cy="178" r="2.5" /><circle cx="168" cy="176" r="2.5" /><circle cx="160" cy="180" r="2" />
		<circle class="sip" cx="76" cy="212" r="2.5" /><circle class="sip" cx="236" cy="228" r="2.5" />
	</g>

	<!-- Layer: the bee flying home to the hive -->
	<g class="layer" style:opacity={op('fly')}>
		<path d={PATH} stroke="#FFB89A" stroke-width="3" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
		<g class="buzz">{@render bee(470, 120, 1)}</g>
		{@render bee(320, 74, 1)}
	</g>

	<!-- Layer: a close-up of wax cells filling with honey -->
	<g class="layer" style:opacity={op('cells')}>
		<rect x="270" y="200" width="140" height="110" rx="16" fill="#FFFFFF" stroke="#E8B868" stroke-width="2.5" />
		{#each cells as c, i (i)}
			<polygon points={hex(c.x + 16, c.y, 16)} fill={c.full ? '#FFD27A' : '#FFF4E0'} stroke="#E8B868" stroke-width="2" />
		{/each}
		<line x1="410" y1="226" x2="506" y2="150" stroke="#E8B868" stroke-width="2" stroke-dasharray="4 6" />
	</g>

	<!-- Layer: bees fanning their wings to dry the honey -->
	<g class="layer" style:opacity={op('fan')}>
		{@render bee(486, 196, 0.9)}
		{@render bee(630, 196, 0.9)}
		<g stroke="#A8D8EA" stroke-width="2" stroke-linecap="round" class="fanlines">
			<path d="M466 176 l-10 -6 M466 186 l-12 0 M650 176 l10 -6 M650 186 l12 0" />
		</g>
	</g>

	<!-- Layer: thick honey dripping from the hive -->
	<g class="layer" style:opacity={op('honey')}>
		<path d="M560 190 q-8 18 0 30 q8 -12 0 -30 Z" fill="#FFB84D" />
		<path class="drip" d="M560 224 q-6 10 0 16 q6 -6 0 -16 Z" fill="#FFB84D" />
		<rect x="534" y="254" width="52" height="46" rx="8" fill="#FFD27A" stroke="#E8B868" stroke-width="2" />
		<rect x="530" y="246" width="60" height="12" rx="4" fill="#F6CDB8" stroke="#E8B49A" stroke-width="2" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .wing {
			animation: wing 0.4s ease-in-out infinite;
		}
		.animate .buzz {
			animation: buzz 2.2s ease-in-out infinite;
		}
		.animate .sip {
			animation: sip 1.6s ease-in-out infinite;
		}
		.animate .drip {
			animation: drip 2.4s ease-in infinite;
		}
		.animate .fanlines {
			animation: sip 0.8s ease-in-out infinite;
		}
	}
	@keyframes wing {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.4;
		}
	}
	@keyframes buzz {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(-6px, -6px);
		}
	}
	@keyframes sip {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes drip {
		0% {
			transform: translateY(0);
			opacity: 1;
		}
		100% {
			transform: translateY(22px);
			opacity: 0;
		}
	}
</style>
