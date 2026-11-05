<script lang="ts">
	/**
	 * Milk to curd, in a bowl: warm milk, a spoonful of old curd added, tiny friendly
	 * bacteria multiplying, a night passing, and thick curd by morning.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const BOWL = 'M200 170 L480 170 Q470 300 340 304 Q210 300 200 170 Z';
	const bugs = [
		[270, 210], [320, 230], [380, 205], [420, 240], [300, 260], [360, 270], [250, 240], [440, 210], [340, 200]
	];
</script>

{#snippet bug(x: number, y: number)}
	<g transform="translate({x} {y})">
		<rect x="-11" y="-6" width="22" height="12" rx="6" fill="#B8E6C1" stroke="#7DC68E" stroke-width="1.5" />
		<circle cx="-4" cy="-1" r="1.6" fill="#3B6D3F" /><circle cx="4" cy="-1" r="1.6" fill="#3B6D3F" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A bowl of milk slowly turning into curd"
>
	<rect width="680" height="360" fill="#FFF8F0" />
	<rect y="300" width="680" height="60" fill="#F3E3D3" />

	<!-- Layer: night passing — a window with the moon -->
	<g class="layer" style:opacity={op('night')}>
		<rect x="540" y="40" width="100" height="90" rx="8" fill="#46507A" stroke="#C9B9A8" stroke-width="4" />
		<path d="M600 66 a16 16 0 1 0 14 22 a12 12 0 1 1 -14 -22 Z" fill="#FFF4E0" />
		<g fill="#FFE4A3"><circle cx="560" cy="60" r="2" /><circle cx="622" cy="110" r="2" /></g>
	</g>

	<!-- Layer: warm milk, steam rising -->
	<g class="layer" style:opacity={op('warm')} stroke="#E8D2B0" stroke-width="3" fill="none" stroke-linecap="round">
		<path class="rise" d="M290 150 q8 -14 0 -28 q-8 -14 0 -28" />
		<path class="rise" d="M340 146 q8 -14 0 -28 q-8 -14 0 -28" style:animation-delay="-0.7s" />
		<path class="rise" d="M390 150 q8 -14 0 -28 q-8 -14 0 -28" style:animation-delay="-1.4s" />
	</g>

	<!-- Bowl (always) with milk -->
	<path d={BOWL} fill="#FFFFFF" />
	<g class="layer" style:opacity={op('milk')}>
		<path d="M206 184 L474 184 Q466 296 340 300 Q214 296 206 184 Z" fill="#FFFDF6" />
		<ellipse cx="340" cy="184" rx="134" ry="12" fill="#FFFCF2" stroke="#F0E6D6" stroke-width="1.5" />
	</g>

	<!-- Layer: thick curd, wobbly top, spoon standing in it -->
	<g class="layer" style:opacity={op('curd')}>
		<path d="M206 184 L474 184 Q466 296 340 300 Q214 296 206 184 Z" fill="#FBF3E2" />
		<path d="M206 184 Q240 168 270 182 Q300 166 330 180 Q360 164 390 180 Q420 166 450 180 Q466 172 474 184" fill="#FBF3E2" stroke="#EADBC0" stroke-width="2" />
		<rect x="350" y="96" width="12" height="100" rx="5" fill="#C9C3BA" transform="rotate(12 356 146)" />
		<ellipse cx="340" cy="200" rx="22" ry="12" fill="#C9C3BA" transform="rotate(12 340 200)" />
	</g>

	<!-- Layer: tiny friendly bacteria at work -->
	<g class="layer" style:opacity={op('bacteria')}>
		{#each bugs as [x, y], i (i)}
			<g class="pop" style:animation-delay="-{i * 0.35}s">{@render bug(x, y)}</g>
		{/each}
	</g>

	<!-- Layer: a spoonful of old curd going in -->
	<g class="layer" style:opacity={op('starter')}>
		<g class="dip">
			<rect x="408" y="60" width="12" height="90" rx="5" fill="#C9C3BA" transform="rotate(-30 414 105)" />
			<ellipse cx="380" cy="150" rx="26" ry="14" fill="#C9C3BA" transform="rotate(-30 380 150)" />
			<ellipse cx="378" cy="146" rx="18" ry="8" fill="#FBF3E2" transform="rotate(-30 378 146)" />
		</g>
	</g>

	<!-- Bowl rim (always, drawn on top) -->
	<path d={BOWL} fill="none" stroke="#FFB89A" stroke-width="4" />
	<ellipse cx="340" cy="170" rx="140" ry="14" fill="none" stroke="#FFB89A" stroke-width="4" />
	<path d="M210 240 Q340 260 470 240" stroke="#FFD3BF" stroke-width="6" fill="none" />
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .rise {
			animation: rise 2.4s ease-in-out infinite;
		}
		.animate .pop {
			animation: pop 2.4s ease-in-out infinite;
		}
		.animate .dip {
			animation: dip 2.4s ease-in-out infinite;
		}
	}
	@keyframes rise {
		0%,
		100% {
			opacity: 0.2;
			transform: translateY(4px);
		}
		50% {
			opacity: 1;
			transform: translateY(-4px);
		}
	}
	@keyframes pop {
		0%,
		100% {
			opacity: 0.4;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes dip {
		0%,
		100% {
			transform: translateY(-6px);
		}
		50% {
			transform: translateY(6px);
		}
	}
</style>
