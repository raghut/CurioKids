<script lang="ts">
	/**
	 * Milk teeth, as a cut-away of the gum: a smiling milk tooth, the adult tooth growing
	 * underneath, the milk tooth's root shrinking until it wobbles out, and the adult tooth
	 * taking its place. The milk-tooth states (`milk`, `wobbly`) and the adult states
	 * (`bud`, `rising`, `peek`, `grown`) are separate layers so a section shows one moment.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const TOOTH = '#FFFFFF';
	const EDGE = '#D9CFC4';
	const GUM_Y = 150;
</script>

{#snippet face(x: number, y: number)}
	<circle cx={x - 9} cy={y} r="3" fill="#4E3A2E" />
	<circle cx={x + 9} cy={y} r="3" fill="#4E3A2E" />
	<path d="M{x - 8} {y + 10} Q{x} {y + 17} {x + 8} {y + 10}" stroke="#4E3A2E" stroke-width="2.5" fill="none" stroke-linecap="round" />
{/snippet}

{#snippet sideTooth(x: number)}
	<path d="M{x - 30} {GUM_Y - 70} Q{x} {GUM_Y - 86} {x + 30} {GUM_Y - 70} L{x + 26} {GUM_Y + 6} L{x + 12} {GUM_Y + 60} L{x - 12} {GUM_Y + 60} L{x - 26} {GUM_Y + 6} Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Inside the gum: a milk tooth and a new tooth growing underneath"
>
	<!-- Mouth (always) -->
	<rect width="680" height="360" fill="#FFF4EE" />
	<!-- Gum, then jaw bone below -->
	<rect y={GUM_Y - 16} width="680" height="230" fill="#F7C6C0" />
	<path d="M0 {GUM_Y - 16} Q340 {GUM_Y - 40} 680 {GUM_Y - 16}" fill="#F7C6C0" />
	<rect y="236" width="680" height="124" fill="#F6E6D8" />
	<g fill="#EFD8C4"><circle cx="120" cy="290" r="5" /><circle cx="560" cy="300" r="5" /><circle cx="460" cy="330" r="4" /></g>

	<!-- Neighbouring milk teeth (always) -->
	{@render sideTooth(170)}
	{@render sideTooth(510)}

	<!-- Layer: adult tooth, still a small bud deep in the jaw -->
	<g class="layer" style:opacity={op('bud')}>
		<path d="M310 256 Q340 238 370 256 L364 300 L316 300 Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
	</g>

	<!-- Layer: adult tooth, bigger and pushing up -->
	<g class="layer" style:opacity={op('rising')}>
		<path d="M302 206 Q340 186 378 206 L372 262 L356 320 L324 320 L308 262 Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
		<path class="nudge" d="M340 184 L340 166 M330 176 L340 164 L350 176" stroke="#FFB89A" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
	</g>

	<!-- Layer: the milk tooth, long root, smiling -->
	<g class="layer" style:opacity={op('milk')}>
		<path d="M306 {GUM_Y - 74} Q340 {GUM_Y - 92} 374 {GUM_Y - 74} L370 {GUM_Y + 6} L354 {GUM_Y + 70} L326 {GUM_Y + 70} L310 {GUM_Y + 6} Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
		{@render face(340, GUM_Y - 44)}
	</g>

	<!-- Layer: the milk tooth with its root melted away, wobbling -->
	<g class="layer" style:opacity={op('wobbly')}>
		<g class="wobble" style:transform-origin="340px {GUM_Y}px">
			<path d="M306 {GUM_Y - 74} Q340 {GUM_Y - 92} 374 {GUM_Y - 74} L370 {GUM_Y + 6} Q340 {GUM_Y + 22} 310 {GUM_Y + 6} Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
			{@render face(340, GUM_Y - 44)}
		</g>
	</g>

	<!-- Layer: the gap — adult tooth just peeking through the gum -->
	<g class="layer" style:opacity={op('peek')}>
		<path d="M304 {GUM_Y - 18} Q340 {GUM_Y - 34} 376 {GUM_Y - 18} L370 236 L310 236 Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
		<g fill="#FFD27A">
			<path d="M286 70 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
			<path d="M396 56 l3 7 7 3 -7 3 -3 7 -3 -7 -7 -3 7 -3 Z" />
		</g>
	</g>

	<!-- Layer: the adult tooth fully grown in -->
	<g class="layer" style:opacity={op('grown')}>
		<path d="M300 {GUM_Y - 86} Q340 {GUM_Y - 106} 380 {GUM_Y - 86} L376 {GUM_Y + 6} L360 {GUM_Y + 90} L320 {GUM_Y + 90} L304 {GUM_Y + 6} Z" fill={TOOTH} stroke={EDGE} stroke-width="2.5" />
		{@render face(340, GUM_Y - 52)}
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .wobble {
			animation: wobble 1.4s ease-in-out infinite;
		}
		.animate .nudge {
			animation: nudge 1.6s ease-in-out infinite;
		}
	}
	@keyframes wobble {
		0%,
		100% {
			transform: rotate(-5deg);
		}
		50% {
			transform: rotate(5deg);
		}
	}
	@keyframes nudge {
		0%,
		100% {
			transform: translateY(0);
			opacity: 0.5;
		}
		50% {
			transform: translateY(-6px);
			opacity: 1;
		}
	}
</style>
