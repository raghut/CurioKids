<script lang="ts">
	/**
	 * A rocket launch: on the pad, its fuel tanks, fire pushing down, the push-up it gets
	 * back, flying up with a trail, and dark space with stars above the sky. The rocket is
	 * drawn twice (on the pad, flying) as two layers, so sections pick one.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);
</script>

{#snippet rocket(x: number, y: number)}
	<g transform="translate({x} {y})">
		<path d="M-24 -40 Q0 -120 24 -40 L24 60 L-24 60 Z" fill="#FFFFFF" stroke="#C9D3DA" stroke-width="2.5" />
		<path d="M-24 20 L-46 70 L-24 60 Z M24 20 L46 70 L24 60 Z" fill="#FF8B7B" />
		<circle cx="0" cy="-30" r="11" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="2" />
		<rect x="-14" y="60" width="28" height="10" fill="#9AA6B2" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A rocket launching from the ground into space"
>
	<rect width="680" height="360" fill="#DDF0F8" />

	<!-- Layer: dark space above the sky -->
	<g class="layer" style:opacity={op('space')}>
		<rect width="680" height="140" fill="#46507A" />
		<rect y="120" width="680" height="40" fill="#8E9AC8" opacity="0.6" />
		<g fill="#FFF4E0"><circle cx="80" cy="40" r="2.5" /><circle cx="200" cy="80" r="2" /><circle cx="520" cy="30" r="2.5" /><circle cx="620" cy="90" r="2" /><circle cx="420" cy="60" r="1.8" /></g>
	</g>

	<rect y="318" width="680" height="42" fill="#C9C3BA" />
	<!-- Launch tower (always) -->
	<g stroke="#A9A39B" stroke-width="4" fill="none"><path d="M420 318 L420 150 M450 318 L450 150 M420 180 L450 210 M450 180 L420 210 M420 240 L450 270 M450 240 L420 270" /></g>

	<!-- Layer: rocket on the launch pad -->
	<g class="layer" style:opacity={op('pad')}>{@render rocket(340, 240)}</g>

	<!-- Layer: inside, the big fuel tanks -->
	<g class="layer" style:opacity={op('fuel')}>
		<rect x="326" y="210" width="28" height="80" rx="6" fill="#FFE4A3" stroke="#E8B868" stroke-width="2" />
		<line x1="340" y1="224" x2="340" y2="278" stroke="#E8B868" stroke-width="2" stroke-dasharray="4 4" />
	</g>

	<!-- Layer: fire and smoke pushing down hard -->
	<g class="layer" style:opacity={op('fire')}>
		<g class="flicker">
			<path d="M326 310 Q340 360 354 310 Z" fill="#FFB89A" />
			<path d="M332 310 Q340 340 348 310 Z" fill="#FFE4A3" />
		</g>
		<g fill="#E6E2DC"><circle cx="290" cy="320" r="22" /><circle cx="390" cy="320" r="22" /><circle cx="256" cy="330" r="16" /><circle cx="424" cy="330" r="16" /></g>
	</g>

	<!-- Layer: push down, and the push back up -->
	<g class="layer" style:opacity={op('push')} stroke-width="5" fill="none" stroke-linecap="round" stroke-linejoin="round">
		<path d="M250 210 L250 270 M236 256 L250 272 L264 256" stroke="#A9A39B" />
		<path d="M250 190 L250 130 M236 144 L250 128 L264 144" stroke="#7DC68E" />
	</g>

	<!-- Layer: flying up, leaving a trail -->
	<g class="layer" style:opacity={op('flying')}>
		<path d="M340 360 Q336 260 340 200" stroke="#E6E2DC" stroke-width="22" fill="none" stroke-linecap="round" />
		<g class="flicker"><path d="M326 186 Q340 236 354 186 Z" fill="#FFB89A" /></g>
		<g class="climb">{@render rocket(340, 116)}</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flicker {
			animation: flicker 0.4s ease-in-out infinite;
		}
		.animate .climb {
			animation: climb 2.4s ease-in-out infinite;
		}
	}
	@keyframes flicker {
		0%,
		100% {
			opacity: 0.7;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes climb {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
</style>
