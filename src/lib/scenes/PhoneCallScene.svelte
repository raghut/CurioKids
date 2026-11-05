<script lang="ts">
	/**
	 * A phone call: a voice going into one phone, invisible radio waves to a tower, the
	 * call travelling on to a far tower, waves down to the other phone, and the voice
	 * coming out of it.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const T1 = 230;
	const T2 = 450;
</script>

{#snippet phone(x: number)}
	<rect x={x - 26} y="200" width="52" height="92" rx="10" fill="#6B6B6B" />
	<rect x={x - 20} y="210" width="40" height="66" rx="4" fill="#CDEBF5" />
	<circle cx={x} cy="284" r="3" fill="#B9B4AE" />
{/snippet}

{#snippet tower(x: number)}
	<g stroke="#A9A39B" stroke-width="3" fill="none" stroke-linecap="round">
		<path d="M{x - 22} 300 L{x} 90 L{x + 22} 300 M{x - 16} 240 L{x + 16} 240 M{x - 10} 180 L{x + 10} 180 M{x - 16} 240 L{x + 10} 180 M{x + 16} 240 L{x - 10} 180" />
	</g>
	<rect x={x - 6} y="96" width="12" height="26" rx="2" fill="#FFFFFF" stroke="#A9A39B" stroke-width="2" />
	<circle cx={x} cy="86" r="5" fill="#FF8B7B" />
{/snippet}

{#snippet waves(x: number, y: number, dir: number)}
	{#each [0, 1, 2] as i (i)}
		<path class="pulse" d="M{x + dir * (14 + i * 14)} {y - 14 - i * 8} Q{x + dir * (22 + i * 16)} {y} {x + dir * (14 + i * 14)} {y + 14 + i * 8}" style:animation-delay="-{i * 0.3}s" />
	{/each}
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Two phones far apart, connected by waves through phone towers"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<path d="M0 300 Q170 290 340 300 Q510 290 680 300 L680 360 L0 360 Z" fill="#B8E6C1" />

	{@render tower(T1)}
	{@render tower(T2)}
	{@render phone(80)}
	{@render phone(600)}

	<!-- Layer: a voice going into the first phone -->
	<g class="layer" style:opacity={op('voice')} stroke="#FFB89A" stroke-width="3" fill="none" stroke-linecap="round">
		{@render waves(80, 170, 1)}
		<circle cx="60" cy="150" r="14" fill="#FFE8DA" stroke="#F0C4AE" />
	</g>

	<!-- Layer: invisible waves from the phone up to the tower -->
	<g class="layer" style:opacity={op('signal')} stroke="#C9B3E6" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
		<path class="flow" d="M100 200 Q160 120 {T1 - 8} 110" />
	</g>

	<!-- Layer: the call travelling from tower to tower -->
	<g class="layer" style:opacity={op('network')} stroke="#C9B3E6" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
		<path class="flow" d="M{T1 + 8} 100 Q340 50 {T2 - 8} 100" />
		<path class="flow" d="M{T1} 300 L{T1} 330 L{T2} 330 L{T2} 300" opacity="0.6" />
	</g>

	<!-- Layer: waves down to the second phone -->
	<g class="layer" style:opacity={op('arrive')} stroke="#C9B3E6" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="6 8">
		<path class="flow" d="M{T2 + 8} 110 Q540 120 580 200" />
	</g>

	<!-- Layer: the voice coming out of the second phone -->
	<g class="layer" style:opacity={op('hear')} stroke="#FFB89A" stroke-width="3" fill="none" stroke-linecap="round">
		{@render waves(600, 170, -1)}
		<rect x="580" y="210" width="40" height="66" rx="4" fill="#FFE4A3" stroke="none" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.2s linear infinite;
		}
		.animate .pulse {
			animation: pulse 1.4s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -28;
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
	}
</style>
