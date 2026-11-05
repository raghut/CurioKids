<script lang="ts">
	/**
	 * What makes the wind: the sun warms the land, warm air rises, cooler air from the sea
	 * rushes in to take its place (the breeze), and up high it loops back. A kite and a
	 * leaning tree show the wind blowing.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const ARROW = '#7FB6E0';
</script>

{#snippet arrowHead(x: number, y: number, rot: number, c: string)}
	<path d="M-9 -8 L0 0 L-9 8" transform="translate({x} {y}) rotate({rot})" stroke={c} stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="The sun warming the land beside the sea, with air moving in a loop"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<!-- Land on the left, sea on the right (always) -->
	<path d="M0 270 Q200 258 360 272 L360 360 L0 360 Z" fill="#B8E6C1" />
	<rect x="360" y="272" width="320" height="88" fill="#A8D8EA" />
	<g stroke="#DDF0F8" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M420 300 q10 -8 20 0 t20 0" /><path d="M560 324 q10 -8 20 0 t20 0" />
	</g>

	<!-- Sun (always), over the land -->
	<g stroke="#FFB89A" stroke-width="4" stroke-linecap="round">
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line x1="80" y1="22" x2="80" y2="14" transform="rotate({a} 80 60)" />
		{/each}
	</g>
	<circle cx="80" cy="60" r="28" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />

	<!-- Layer: the sun warming the land, heat shimmering up -->
	<g class="layer" style:opacity={op('warm')}>
		<g stroke="#FFD27A" stroke-width="3" stroke-linecap="round">
			<line class="flow" stroke-dasharray="8 10" x1="96" y1="88" x2="150" y2="250" />
			<line class="flow" stroke-dasharray="8 10" x1="110" y1="84" x2="250" y2="250" />
		</g>
		<rect y="262" width="360" height="14" fill="#FFE4A3" opacity="0.6" />
		<g stroke="#FFB89A" stroke-width="2.5" fill="none" stroke-linecap="round">
			<path class="shimmer" d="M180 256 q6 -10 0 -20 q-6 -10 0 -20" />
			<path class="shimmer" d="M280 256 q6 -10 0 -20 q-6 -10 0 -20" style:animation-delay="-0.7s" />
		</g>
	</g>

	<!-- Layer: warm air rising over the land -->
	<g class="layer" style:opacity={op('rise')} stroke="#FFB89A" stroke-width="3.5" fill="none" stroke-linecap="round">
		<path class="flow" d="M230 220 L230 110" stroke-dasharray="10 10" />
		{@render arrowHead(230, 108, -90, '#FFB89A')}
	</g>

	<!-- Layer: cool sea breeze rushing in low -->
	<g class="layer" style:opacity={op('breeze')} stroke={ARROW} stroke-width="3.5" fill="none" stroke-linecap="round">
		<path class="flow" d="M620 238 L262 238" stroke-dasharray="12 10" />
		<path class="flow" d="M600 214 L300 214" stroke-dasharray="12 10" opacity="0.6" />
		{@render arrowHead(260, 238, 180, ARROW)}
	</g>

	<!-- Layer: high up, the air loops back over the sea -->
	<g class="layer" style:opacity={op('loop')} stroke="#A9B6C0" stroke-width="3" fill="none" stroke-linecap="round">
		<path class="flow" d="M240 92 Q430 50 600 100 Q640 150 624 226" stroke-dasharray="10 10" />
		{@render arrowHead(624, 228, 96, '#A9B6C0')}
	</g>

	<!-- Layer: a kite and a leaning tree, showing the wind -->
	<g class="layer" style:opacity={op('kite')}>
		<path d="M100 270 L100 208" stroke="#C79A7C" stroke-width="8" stroke-linecap="round" />
		<g class="lean" style:transform-origin="100px 208px">
			<ellipse cx="88" cy="182" rx="40" ry="32" fill="#9ED6AA" stroke="#6DBA80" stroke-width="2" />
		</g>
		<path d="M150 266 Q250 210 320 120" stroke="#A9A39B" stroke-width="1.5" fill="none" />
		<g class="flutter" style:transform-origin="320px 120px">
			<path d="M320 120 L296 94 L320 66 L344 94 Z" fill="#FFB89A" stroke="#FF8B7B" stroke-width="2" />
			<path d="M320 120 Q310 140 322 156 Q312 170 320 186" stroke="#FF8B7B" stroke-width="2" fill="none" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
		.animate .shimmer {
			animation: shimmer 2s ease-in-out infinite;
		}
		.animate .lean {
			animation: lean 3s ease-in-out infinite;
		}
		.animate .flutter {
			animation: flutter 2.2s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -40;
		}
	}
	@keyframes shimmer {
		0%,
		100% {
			opacity: 0.3;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes lean {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(-10deg);
		}
	}
	@keyframes flutter {
		0%,
		100% {
			transform: rotate(-4deg);
		}
		50% {
			transform: rotate(6deg);
		}
	}
</style>
