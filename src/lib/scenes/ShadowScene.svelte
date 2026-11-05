<script lang="ts">
	/**
	 * Shadows: one tree, and the sun at three times of day. Morning sun low on the left
	 * casts a long shadow to the right; noon sun overhead casts a short one; evening sun
	 * low on the right casts a long one to the left. `rays` draws straight light lines for
	 * the morning sun, grazing the treetop to the shadow's tip.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SHADE = '#8FC79C';
	const GROUND = 300;
</script>

{#snippet sun(x: number, y: number)}
	<g stroke="#FFB89A" stroke-width="4" stroke-linecap="round">
		{#each [0, 45, 90, 135, 180, 225, 270, 315] as a (a)}
			<line x1={x} y1={y - 38} x2={x} y2={y - 30} transform="rotate({a} {x} {y})" />
		{/each}
	</g>
	<circle cx={x} cy={y} r="24" fill="#FFE4A3" stroke="#FFB89A" stroke-width="3" />
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A tree and its shadow, with the sun in different places"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y={GROUND} width="680" height="60" fill="#B8E6C1" />

	<!-- Layer: morning — sun low on the left, long shadow to the right -->
	<g class="layer" style:opacity={op('morning')}>
		{@render sun(60, 230)}
		<path d="M332 {GROUND} L348 {GROUND} L548 {GROUND + 12} L534 {GROUND + 30} Z" fill={SHADE} />
		<ellipse cx="590" cy={GROUND + 22} rx="70" ry="16" fill={SHADE} />
	</g>

	<!-- Layer: noon — sun high overhead, short shadow under the tree -->
	<g class="layer" style:opacity={op('noon')}>
		{@render sun(340, 46)}
		<ellipse cx="340" cy={GROUND + 10} rx="58" ry="10" fill={SHADE} />
	</g>

	<!-- Layer: evening — sun low on the right, long shadow to the left -->
	<g class="layer" style:opacity={op('evening')}>
		{@render sun(620, 230)}
		<path d="M348 {GROUND} L332 {GROUND} L132 {GROUND + 12} L146 {GROUND + 30} Z" fill={SHADE} />
		<ellipse cx="90" cy={GROUND + 22} rx="70" ry="16" fill={SHADE} />
	</g>

	<!-- Layer: light travels in straight lines (morning sun) -->
	<g class="layer" style:opacity={op('rays')} stroke="#FFD27A" stroke-width="3" stroke-linecap="round" fill="none">
		<line class="flow" stroke-dasharray="8 10" x1="86" y1="226" x2="290" y2="150" />
		<line class="flow" stroke-dasharray="8 10" x1="86" y1="236" x2="292" y2="232" />
		<line class="flow" stroke-dasharray="8 10" x1="86" y1="246" x2="300" y2="290" />
		<line stroke-dasharray="4 8" x1="390" y1="130" x2="650" y2="314" stroke="#E8C98A" stroke-width="2" />
	</g>

	<!-- Tree (always, drawn last so it stands in front of its shadow) -->
	<rect x="332" y="190" width="16" height={GROUND - 188} rx="4" fill="#C79A7C" />
	<circle cx="340" cy="160" r="52" fill="#9ED6AA" stroke="#6DBA80" stroke-width="2.5" />
	<circle cx="310" cy="176" r="30" fill="#9ED6AA" stroke="#6DBA80" stroke-width="2.5" />
	<circle cx="372" cy="178" r="30" fill="#9ED6AA" stroke="#6DBA80" stroke-width="2.5" />
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.8s linear infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -36;
		}
	}
</style>
