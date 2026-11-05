<script lang="ts">
	/**
	 * A chick hatching: an egg in a nest, the mother hen keeping it warm, a look inside at
	 * the yolk and the tiny chick, the chick grown and curled up, the shell cracking, and
	 * the chick out beside the broken shell.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const E = { x: 340, y: 196 };
	const SHELL = '#FFF4E0';
	const SHELL_EDGE = '#E8D2B0';
	const CHICK = '#FFE07A';
	const CHICK_EDGE = '#E8B868';
</script>

{#snippet egg()}
	<ellipse cx={E.x} cy={E.y} rx="56" ry="72" fill={SHELL} stroke={SHELL_EDGE} stroke-width="3" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="An egg in a nest and a chick hatching from it"
>
	<rect width="680" height="360" fill="#FFF8F0" />
	<rect y="296" width="680" height="64" fill="#F6E6C8" />

	<!-- Layer: the mother hen sitting close, keeping the egg warm -->
	<g class="layer" style:opacity={op('hen')}>
		<path d="M120 270 Q100 180 170 150 Q230 128 250 200 Q260 250 230 280 Z" fill="#FFFFFF" stroke="#E5DCD2" stroke-width="2.5" />
		<circle cx="196" cy="128" r="30" fill="#FFFFFF" stroke="#E5DCD2" stroke-width="2.5" />
		<path d="M186 98 q6 -14 12 0 q6 -14 12 0" fill="#FF8B7B" />
		<path d="M224 128 L242 134 L224 140 Z" fill="#FFD27A" />
		<circle cx="206" cy="122" r="3.5" fill="#4E3A2E" />
		<g stroke="#FFB89A" stroke-width="3" fill="none" stroke-linecap="round">
			<path class="pulse" d="M264 170 q8 -8 0 -16 M276 180 q10 -12 0 -24" />
		</g>
	</g>

	<!-- Nest (always) -->
	<path d="M240 260 Q340 330 440 260 Q430 300 340 304 Q250 300 240 260 Z" fill="#D9B08C" stroke="#C49A75" stroke-width="2" />
	<g stroke="#C49A75" stroke-width="2" fill="none"><path d="M256 274 Q340 300 424 274 M266 288 Q340 306 414 288" /></g>

	<!-- Layer: the whole egg -->
	<g class="layer" style:opacity={op('egg')}>{@render egg()}</g>

	<!-- Layer: inside the egg — yolk and a tiny new chick -->
	<g class="layer" style:opacity={op('inside')}>
		{@render egg()}
		<ellipse cx={E.x} cy={E.y} rx="46" ry="60" fill="#FFFDF7" />
		<circle cx={E.x} cy={E.y + 12} r="30" fill="#FFD27A" />
		<path d="M{E.x - 8} {E.y + 4} q-8 10 2 18 q10 4 10 -8 Z" fill="#FFB89A" />
	</g>

	<!-- Layer: inside, the chick has grown and fills the egg -->
	<g class="layer" style:opacity={op('growing')}>
		{@render egg()}
		<ellipse cx={E.x} cy={E.y} rx="46" ry="60" fill="#FFFDF7" />
		<circle cx={E.x} cy={E.y + 4} r="38" fill={CHICK} stroke={CHICK_EDGE} stroke-width="2" />
		<circle cx={E.x + 10} cy={E.y - 16} r="4" fill="#4E3A2E" />
		<path d="M{E.x + 24} {E.y - 12} l10 4 -10 4 Z" fill="#FFB84D" />
	</g>

	<!-- Layer: the shell cracking as the chick pecks -->
	<g class="layer" style:opacity={op('crack')}>
		<g class="wobble" style:transform-origin="{E.x}px {E.y + 70}px">
			{@render egg()}
			<path d="M{E.x - 40} {E.y - 20} l14 10 l10 -12 l12 12 l12 -10 l12 12 l12 -8" stroke="#C9A77E" stroke-width="3" fill="none" stroke-linejoin="round" />
			<path d="M{E.x + 10} {E.y - 26} l10 -6 l-2 10 Z" fill="#FFB84D" />
		</g>
	</g>

	<!-- Layer: the chick out, beside its broken shell -->
	<g class="layer" style:opacity={op('chick')}>
		<path d="M226 270 q24 -40 52 0 l-8 -10 l-8 10 l-8 -10 l-8 10 l-8 -10 Z" fill={SHELL} stroke={SHELL_EDGE} stroke-width="2" />
		<path d="M420 270 q24 -40 52 0 l-8 -10 l-8 10 l-8 -10 l-8 10 l-8 -10 Z" fill={SHELL} stroke={SHELL_EDGE} stroke-width="2" transform="rotate(180 446 256)" />
		<g class="hop">
			<ellipse cx={E.x} cy={E.y + 40} rx="44" ry="38" fill={CHICK} stroke={CHICK_EDGE} stroke-width="2" />
			<circle cx={E.x} cy={E.y - 12} r="28" fill={CHICK} stroke={CHICK_EDGE} stroke-width="2" />
			<circle cx={E.x - 9} cy={E.y - 16} r="4" fill="#4E3A2E" />
			<circle cx={E.x + 9} cy={E.y - 16} r="4" fill="#4E3A2E" />
			<path d="M{E.x - 7} {E.y - 6} L{E.x} {E.y + 4} L{E.x + 7} {E.y - 6} Z" fill="#FFB84D" />
			<path d="M{E.x - 44} {E.y + 30} q-16 6 -8 18 M{E.x + 44} {E.y + 30} q16 6 8 18" stroke={CHICK_EDGE} stroke-width="3" fill="none" stroke-linecap="round" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .wobble {
			animation: wobble 1.2s ease-in-out infinite;
		}
		.animate .hop {
			animation: hop 2s ease-in-out infinite;
		}
		.animate .pulse {
			animation: pulse 2s ease-in-out infinite;
		}
	}
	@keyframes wobble {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(4deg);
		}
	}
	@keyframes hop {
		0%,
		80%,
		100% {
			transform: translateY(0);
		}
		90% {
			transform: translateY(-8px);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
</style>
