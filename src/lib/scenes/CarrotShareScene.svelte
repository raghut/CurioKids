<script lang="ts">
	/**
	 * Mishti shares a carrot: a garden, a tree with a rock under it, Mishti the rabbit and
	 * Dheera the tortoise. Sky, ground, garden, tree and rock are always drawn; the layers in
	 * SCENE_CATALOG['carrot-share'] move the story along page by page.
	 *
	 * Mishti keeps her locked look (white, brown eyes, tiny red scarf — drawn in coral, the
	 * palette's red). No text in the picture. Motion is slow and stops under
	 * prefers-reduced-motion or `still`.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: {
		layers?: string[];
		/** No motion at all — used for the small card thumbnail. */
		still?: boolean;
		/** Fill a box by cropping (thumbnail) instead of fitting the whole scene. */
		cover?: boolean;
	} = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);
	// Mishti sits by the rock on every page after the first, holding either the whole
	// carrot or her half; one drawing for both keeps her from dimming mid-fade.
	const atRock = $derived(Math.max(op('carrot'), op('share')));

	const rays = [0, 45, 90, 135, 180, 225, 270, 315];
	const hearts = [
		{ x: 392, d: 0 },
		{ x: 418, d: 1.4 },
		{ x: 372, d: 2.7 }
	];
</script>

{#snippet rabbit()}
	<!-- Origin = between her feet. -->
	<ellipse cx="22" cy="-22" rx="8" ry="8" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
	<ellipse cx="0" cy="-30" rx="26" ry="30" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
	<ellipse cx="-13" cy="-3" rx="11" ry="5" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
	<ellipse cx="13" cy="-3" rx="11" ry="5" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
	<g transform="rotate(-10 -8 -88)">
		<ellipse cx="-8" cy="-108" rx="7" ry="22" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
		<ellipse cx="-8" cy="-106" rx="3.5" ry="15" fill="#FFD3C2" />
	</g>
	<g transform="rotate(12 8 -88)">
		<ellipse cx="8" cy="-108" rx="7" ry="22" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
		<ellipse cx="8" cy="-106" rx="3.5" ry="15" fill="#FFD3C2" />
	</g>
	<circle cx="0" cy="-72" r="21" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
	<circle cx="-7" cy="-75" r="3.5" fill="#7A4E3A" />
	<circle cx="7" cy="-75" r="3.5" fill="#7A4E3A" />
	<circle cx="-6" cy="-76" r="1" fill="#FFFFFF" />
	<circle cx="8" cy="-76" r="1" fill="#FFFFFF" />
	<path d="M-2.5 -67 L2.5 -67 L0 -64 Z" fill="#FF8B7B" />
	<path d="M-4 -62 Q0 -59 4 -62" stroke="#A0674E" stroke-width="1.5" fill="none" stroke-linecap="round" />
	<!-- The tiny red scarf -->
	<rect x="-17" y="-55" width="34" height="8" rx="4" fill="#FF8B7B" />
	<path d="M8 -50 L16 -36 L22 -40 L14 -51 Z" fill="#FF8B7B" />
{/snippet}

{#snippet carrot(len: number)}
	<!-- Point down; origin = the top of the root. -->
	<path d="M-7 0 L7 0 L0 {len} Z" fill="#F7A072" stroke="#E08A5E" stroke-width="1.5" stroke-linejoin="round" />
	<g stroke="#E08A5E" stroke-width="1.2" stroke-linecap="round">
		<line x1="-4" y1={len * 0.3} x2="0" y2={len * 0.3} />
		<line x1="1" y1={len * 0.55} x2="3" y2={len * 0.55} />
	</g>
{/snippet}

{#snippet leaves()}
	<g fill="#8FCF9C" stroke="#6FB07D" stroke-width="1.2">
		<path d="M0 0 Q-12 -14 -8 -26 Q-2 -14 0 0Z" />
		<path d="M0 0 Q0 -18 4 -30 Q6 -14 0 0Z" />
		<path d="M0 0 Q10 -12 14 -22 Q6 -8 0 0Z" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A picture of a white rabbit and a tortoise in a garden under a tree"
>
	<!-- Sky -->
	<rect width="680" height="360" fill="#EAF6FB" />

	<!-- Layer: evening glow -->
	<g class="layer" style:opacity={op('sunset')}>
		<rect width="680" height="280" fill="#FFE4A3" opacity="0.55" />
		<rect y="150" width="680" height="130" fill="#FFB89A" opacity="0.4" />
		<circle cx="120" cy="262" r="38" fill="#FFB89A" stroke="#F59E78" stroke-width="3" />
	</g>

	<!-- Layer: the morning sun -->
	<g class="layer" style:opacity={op('day')}>
		<g stroke="#FFB89A" stroke-width="5" stroke-linecap="round">
			{#each rays as a (a)}
				<line x1="90" y1="24" x2="90" y2="12" transform="rotate({a} 90 66)" />
			{/each}
		</g>
		<circle cx="90" cy="66" r="32" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
	</g>

	<!-- Ground -->
	<rect y="272" width="680" height="88" fill="#B8E6C1" />
	<g stroke="#8FCF9C" stroke-width="2" stroke-linecap="round">
		<path d="M250 300 l4 -8 M262 312 l3 -7 M560 330 l4 -8 M300 340 l3 -7 M620 300 l4 -8" />
	</g>

	<!-- Garden bed (always), with two carrots still growing -->
	<ellipse cx="140" cy="300" rx="120" ry="22" fill="#D9B49A" />
	<path d="M40 298 Q140 290 240 298" stroke="#C69C80" stroke-width="2" fill="none" />
	<g transform="translate(70 294)">{@render leaves()}</g>
	<g transform="translate(225 296)">{@render leaves()}</g>

	<!-- Tree and rock (always) -->
	<rect x="584" y="150" width="26" height="126" rx="8" fill="#C69C80" />
	<g fill="#B8E6C1" stroke="#8FCF9C" stroke-width="3">
		<circle cx="560" cy="140" r="46" />
		<circle cx="636" cy="132" r="44" />
		<circle cx="598" cy="96" r="50" />
	</g>
	<path d="M250 280 Q256 232 310 230 Q366 228 372 280 Z" fill="#DCD3CC" stroke="#C3B8AF" stroke-width="2" />

	<!-- Layer: Mishti pulling the carrot out of the garden -->
	<g class="layer" style:opacity={op('pull')}>
		<g transform="translate(120 318) scale(1.45)">
			<g transform="translate(38 -6)">
				{@render leaves()}
				<g transform="translate(0 2)">{@render carrot(10)}</g>
			</g>
			<g class="tug">
				<g transform="rotate(-8)">{@render rabbit()}</g>
				<ellipse cx="30" cy="-26" rx="8" ry="6" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
			</g>
		</g>
	</g>

	<!-- Mishti by the rock (carrot or share) -->
	<g class="layer" style:opacity={atRock}>
		<g transform="translate(320 330) scale(1.5)">{@render rabbit()}</g>
	</g>

	<!-- Layer: the whole big carrot in her paws -->
	<g class="layer" style:opacity={op('carrot')}>
		<g transform="translate(320 330) scale(1.5)">
			<g transform="translate(0 -46) rotate(-20)">
				<g transform="translate(0 -14)">{@render leaves()}</g>
				{@render carrot(48)}
			</g>
			<ellipse cx="-14" cy="-40" rx="8" ry="6" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
			<ellipse cx="14" cy="-36" rx="8" ry="6" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
		</g>
	</g>

	<!-- Layer: a small sad sound from beyond the tree -->
	<g class="layer" style:opacity={op('sound')} stroke="#7FC3DC" stroke-width="3" fill="none" stroke-linecap="round">
		<g class="pulse">
			<path d="M520 236 q-8 6 0 12" />
			<path d="M508 230 q-12 12 0 24" />
			<path d="M496 224 q-16 18 0 36" />
		</g>
	</g>

	<!-- Layer: Dheera the tortoise, facing Mishti -->
	<g class="layer" style:opacity={op('tortoise')}>
		<g transform="translate(505 330) scale(1.5)">
			<g class="bob">
				<rect x="-36" y="-10" width="16" height="14" rx="6" fill="#D9EFC9" stroke="#9CC79A" stroke-width="2" />
				<rect x="20" y="-10" width="16" height="14" rx="6" fill="#D9EFC9" stroke="#9CC79A" stroke-width="2" />
				<circle cx="-58" cy="-20" r="15" fill="#D9EFC9" stroke="#9CC79A" stroke-width="2" />
				<circle cx="-63" cy="-24" r="2.8" fill="#5E7A57" />
				<path d="M-68 -14 Q-63 -10 -58 -13" stroke="#5E7A57" stroke-width="1.5" fill="none" stroke-linecap="round" />
				<path d="M-46 -4 Q-46 -58 0 -58 Q46 -58 46 -4 Z" fill="#9ED6A8" stroke="#6FB07D" stroke-width="2.5" />
				<g stroke="#6FB07D" stroke-width="2" fill="none">
					<path d="M-14 -46 L14 -46 L22 -26 L0 -14 L-22 -26 Z" />
					<path d="M-22 -26 L-40 -14 M22 -26 L40 -14 M0 -14 L0 -4 M-14 -46 L-26 -52 M14 -46 L26 -52" />
				</g>
			</g>
		</g>
	</g>

	<!-- Layer: the carrot shared, one half each -->
	<g class="layer" style:opacity={op('share')}>
		<g transform="translate(320 330) scale(1.5)">
			<g transform="translate(0 -44) rotate(-30)">
				<g transform="translate(0 -12)">{@render leaves()}</g>
				{@render carrot(22)}
			</g>
			<ellipse cx="-12" cy="-40" rx="8" ry="6" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
			<ellipse cx="12" cy="-38" rx="8" ry="6" fill="#FFFFFF" stroke="#D8DEE2" stroke-width="2" />
		</g>
		<g transform="translate(372 318) rotate(80) scale(1.4)">{@render carrot(26)}</g>
	</g>

	<!-- Layer: small hearts rising between them -->
	<g class="layer" style:opacity={op('hearts')}>
		{#each hearts as h (h.x)}
			<g transform="translate({h.x} 200)">
				<path
					class="rise"
					d="M0 6 C-12 -2 -8 -12 0 -6 C8 -12 12 -2 0 6Z"
					fill="#FF8B7B"
					opacity="0.85"
					style:animation-delay="-{h.d}s"
				/>
			</g>
		{/each}
	</g>
</svg>

<style>
	/* Scoped keyframes: Tailwind has no utility for these. Opacity and transform only,
	   slow, and off unless the device allows motion. */
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .tug {
			animation: tug 2.4s ease-in-out infinite;
		}
		.animate .bob {
			animation: bob 3s ease-in-out infinite;
		}
		.animate .pulse {
			animation: pulse 2.6s ease-in-out infinite;
		}
		.animate .rise {
			animation: rise 4.2s linear infinite;
		}
	}
	@keyframes tug {
		0%,
		100% {
			transform: translateX(0);
		}
		50% {
			transform: translateX(-4px);
		}
	}
	@keyframes bob {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-2px);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes rise {
		0% {
			transform: translateY(0);
			opacity: 0;
		}
		20%,
		75% {
			opacity: 0.85;
		}
		100% {
			transform: translateY(-50px);
			opacity: 0;
		}
	}
</style>
