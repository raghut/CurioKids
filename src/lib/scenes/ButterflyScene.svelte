<script lang="ts">
	/**
	 * A butterfly's life, left to right along one branch: eggs on a leaf, a caterpillar
	 * eating, a chrysalis hanging, and the butterfly flying off. `cycle` adds arrows
	 * joining the stages. Same contract as the other scenes.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const LEAF = '#9ED6AA';
	const VEIN = '#6DBA80';
</script>

{#snippet leaf(x: number, rot: number)}
	<g transform="translate({x} 112) rotate({rot})">
		<path d="M0 0 q-30 40 0 92 q30 -52 0 -92 Z" fill={LEAF} stroke={VEIN} stroke-width="2" />
		<path d="M0 6 L0 86" stroke={VEIN} stroke-width="1.5" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A branch with eggs, a caterpillar, a chrysalis and a butterfly"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y="300" width="680" height="60" fill="#B8E6C1" />

	<!-- Branch and leaves (always) -->
	<path d="M0 108 Q200 96 360 110 Q520 124 680 104" stroke="#C79A7C" stroke-width="10" fill="none" stroke-linecap="round" />
	{@render leaf(110, -8)}
	{@render leaf(260, 6)}
	{@render leaf(540, -4)}

	<!-- Layer: tiny eggs on the first leaf -->
	<g class="layer" style:opacity={op('egg')} fill="#FFF4E0" stroke="#E8C9A0" stroke-width="1.5">
		<circle cx="108" cy="150" r="5" /><circle cx="118" cy="160" r="5" /><circle cx="104" cy="166" r="5" />
		<circle cx="114" cy="176" r="5" />
	</g>

	<!-- Layer: a caterpillar munching the second leaf -->
	<g class="layer" style:opacity={op('caterpillar')}>
		<g class="wiggle">
			{#each [0, 1, 2, 3, 4, 5] as i (i)}
				<circle cx={238 + i * 11} cy={176 - (i % 2) * 3} r="8" fill={i === 5 ? '#8BCB6A' : '#A5D97E'} stroke="#7CB45C" stroke-width="1.5" />
			{/each}
			<circle cx="296" cy="171" r="2" fill="#4E3A2E" />
			<path d="M294 164 l4 -8 M300 166 l6 -6" stroke="#4E3A2E" stroke-width="2" stroke-linecap="round" />
		</g>
		<path d="M262 152 q8 -6 14 0" stroke="#EAF6FB" stroke-width="6" fill="none" />
	</g>

	<!-- Layer: a chrysalis hanging from the branch -->
	<g class="layer" style:opacity={op('chrysalis')}>
		<line x1="410" y1="116" x2="410" y2="132" stroke="#C79A7C" stroke-width="2" />
		<g class="sway" style:transform-origin="410px 116px">
			<path d="M410 130 q22 30 8 74 q-8 14 -16 0 q-14 -44 8 -74 Z" fill="#C9E4A8" stroke="#94BE6E" stroke-width="2" />
			<path d="M404 160 q6 4 12 0 M402 178 q8 4 16 0" stroke="#94BE6E" stroke-width="1.5" fill="none" />
		</g>
	</g>

	<!-- Layer: the butterfly flying -->
	<g class="layer" style:opacity={op('butterfly')}>
		<g class="drift">
			<g transform="translate(610 210)">
				<g class="flap">
					<path d="M0 0 q-40 -44 -50 -10 q-4 26 50 10 Z" fill="#FFB89A" stroke="#FF8B7B" stroke-width="2" />
					<path d="M0 0 q-34 30 -36 10 q-2 -12 36 -10 Z" fill="#FFE4A3" stroke="#FF8B7B" stroke-width="2" />
					<path d="M0 0 q40 -44 50 -10 q4 26 -50 10 Z" fill="#FFB89A" stroke="#FF8B7B" stroke-width="2" />
					<path d="M0 0 q34 30 36 10 q2 -12 -36 -10 Z" fill="#FFE4A3" stroke="#FF8B7B" stroke-width="2" />
				</g>
				<ellipse cx="0" cy="2" rx="4" ry="16" fill="#6B4A3A" />
				<path d="M-2 -12 q-6 -12 -12 -14 M2 -12 q6 -12 12 -14" stroke="#6B4A3A" stroke-width="2" fill="none" stroke-linecap="round" />
			</g>
		</g>
	</g>

	<!-- Layer: arrows joining the four stages into a circle of life -->
	<g class="layer" style:opacity={op('cycle')} stroke="#FF8B7B" stroke-width="3" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="6 8">
		<path d="M140 240 Q190 270 236 236" />
		<path d="M310 236 Q360 262 396 226" />
		<path d="M432 222 Q500 262 568 248" />
		<path d="M590 280 Q340 350 100 270" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flap {
			animation: flap 0.9s ease-in-out infinite;
			transform-box: fill-box;
			transform-origin: center;
		}
		.animate .drift {
			animation: drift 4s ease-in-out infinite;
		}
		.animate .wiggle {
			animation: wiggle 2s ease-in-out infinite;
		}
		.animate .sway {
			animation: sway 3s ease-in-out infinite;
		}
	}
	@keyframes flap {
		0%,
		100% {
			transform: scaleX(1);
		}
		50% {
			transform: scaleX(0.45);
		}
	}
	@keyframes drift {
		0%,
		100% {
			transform: translate(0, 0);
		}
		50% {
			transform: translate(-14px, -18px);
		}
	}
	@keyframes wiggle {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(4px);
		}
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
</style>
