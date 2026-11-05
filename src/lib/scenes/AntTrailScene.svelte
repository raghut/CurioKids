<script lang="ts">
	/**
	 * Ants, seen from above: a nest on the left, a crumb on the right, and the scent
	 * trail between them. Used by the ants fact, which covers both walking in a line and
	 * carrying heavy loads. Same contract as WaterCycleScene: no text, locked palette and its tints,
	 * slow opacity/transform motion only, none under reduced motion or `still`.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	// The trail is a straight line, so a row of evenly spaced ants shifted by exactly one
	// gap loops seamlessly — it reads as an endless line walking to the nest.
	const A = { x: 548, y: 150 };
	const B = { x: 150, y: 232 };
	const N = 8;
	const angle = (Math.atan2(B.y - A.y, B.x - A.x) * 180) / Math.PI;
	const marchers = Array.from({ length: N }, (_, i) => ({
		x: A.x + ((B.x - A.x) * i) / N,
		y: A.y + ((B.y - A.y) * i) / N
	}));
	const gap = { x: (B.x - A.x) / N, y: (B.y - A.y) / N };
	const BODY = '#6B4A3A';
</script>

{#snippet ant(x: number, y: number, s: number, rot: number)}
	<g transform="translate({x} {y}) rotate({rot}) scale({s})">
		<g stroke={BODY} stroke-width="1.6" stroke-linecap="round" fill="none">
			<path d="M0 0 L-4 -8 M0 0 L1 -9 M0 0 L5 -8 M0 0 L-4 8 M0 0 L1 9 M0 0 L5 8" />
			<path d="M10 -1 Q14 -6 18 -7 M10 1 Q14 6 18 7" />
		</g>
		<ellipse cx="-9" cy="0" rx="6.5" ry="4.8" fill={BODY} />
		<ellipse cx="0" cy="0" rx="3.8" ry="3" fill={BODY} />
		<circle cx="7.5" cy="0" r="3.8" fill={BODY} />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	style:--gx="{gap.x}px"
	style:--gy="{gap.y}px"
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="Ants walking on the ground between their nest and some food"
>
	<!-- Ground, pebbles and grass (always) -->
	<rect width="680" height="360" fill="#D7F0DC" />
	<g fill="#C4E6CB">
		<ellipse cx="300" cy="80" rx="60" ry="22" />
		<ellipse cx="610" cy="300" rx="70" ry="26" />
		<ellipse cx="80" cy="330" rx="80" ry="24" />
	</g>
	<g fill="#F3E3D6" stroke="#E5CDBB" stroke-width="1.5">
		<ellipse cx="420" cy="60" rx="14" ry="10" />
		<ellipse cx="640" cy="90" rx="10" ry="8" />
		<ellipse cx="260" cy="320" rx="12" ry="9" />
	</g>
	<g stroke="#8CCB98" stroke-width="3" stroke-linecap="round" fill="none">
		<path d="M30 60 l6 -16 M40 62 l2 -18 M50 60 l-4 -14" />
		<path d="M600 210 l6 -16 M610 212 l2 -18 M620 210 l-4 -14" />
	</g>

	<!-- Nest (always): a mound with a hole -->
	<ellipse cx="120" cy="240" rx="62" ry="40" fill="#F6CDB8" stroke="#E8B49A" stroke-width="2" />
	<ellipse cx="120" cy="240" rx="16" ry="11" fill="#7A5240" />

	<!-- Food (always): a crumb -->
	<path d="M548 112 q30 -14 52 6 q16 22 -4 44 q-28 18 -52 -2 q-18 -24 4 -48 Z" fill="#FFE4A3" stroke="#FFB89A" stroke-width="2" />
	<g fill="#F5CF7E">
		<circle cx="566" cy="130" r="3" />
		<circle cx="584" cy="146" r="3" />
		<circle cx="570" cy="150" r="2.5" />
	</g>

	<!-- Layer: the scent trail -->
	<g class="layer" style:opacity={op('trail')} stroke-linecap="round" fill="none">
		<line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#FFB89A" stroke-width="16" opacity="0.35" />
		<line class="flow" x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke="#FF8B7B" stroke-width="2.5" stroke-dasharray="3 12" opacity="0.8" />
	</g>

	<!-- Layer: one scout ant that found the food -->
	<g class="layer" style:opacity={op('scout')}>
		{@render ant(520, 168, 1.2, angle)}
	</g>

	<!-- Layer: the line of ants walking home along the trail -->
	<g class="layer" style:opacity={op('line')}>
		<g class="march">
			{#each marchers as m, i (i)}
				{@render ant(m.x, m.y, 1, angle)}
			{/each}
		</g>
	</g>

	<!-- Layer: a close-up of an ant's feelers smelling the trail -->
	<g class="layer" style:opacity={op('smell')}>
		<circle cx="300" cy="96" r="62" fill="#FFFFFF" stroke="#FFB89A" stroke-width="3" />
		<line x1="270" y1="141" x2="246" y2="168" stroke="#FFB89A" stroke-width="3" stroke-linecap="round" />
		{@render ant(282, 104, 3, 0)}
		<g fill="#FF8B7B">
			<circle class="sniff" cx="344" cy="76" r="4" />
			<circle class="sniff" cx="352" cy="96" r="3.5" style:animation-delay="-0.6s" />
			<circle class="sniff" cx="342" cy="118" r="4" style:animation-delay="-1.2s" />
		</g>
	</g>

	<!-- Layer: one ant lifting a leaf much bigger than itself -->
	<g class="layer" style:opacity={op('carry')}>
		<g class="lift">
			<path d="M196 262 q34 -40 70 -6 q-34 30 -70 6 Z" fill="#8CCB98" stroke="#5FAE72" stroke-width="2" />
			<path d="M200 262 q30 -6 62 -4" stroke="#5FAE72" stroke-width="1.5" fill="none" />
		</g>
		{@render ant(228, 290, 1.6, 0)}
	</g>

	<!-- Layer: a team of ants carrying a big crumb together -->
	<g class="layer" style:opacity={op('team')}>
		<g class="lift">
			<path d="M410 266 q46 -20 92 2 q10 24 -6 40 q-44 14 -86 -2 q-14 -20 0 -40 Z" fill="#FFE4A3" stroke="#FFB89A" stroke-width="2" />
		</g>
		{@render ant(404, 286, 1.2, 180)}
		{@render ant(510, 282, 1.2, 0)}
		{@render ant(436, 322, 1.2, 90)}
		{@render ant(478, 324, 1.2, 90)}
		{@render ant(456, 256, 1.2, -90)}
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .march {
			animation: march 2.4s linear infinite;
		}
		.animate .flow {
			animation: flow 2.4s linear infinite;
		}
		.animate .sniff {
			animation: sniff 1.8s ease-in-out infinite;
		}
		.animate .lift {
			animation: lift 2.6s ease-in-out infinite;
		}
	}
	@keyframes march {
		to {
			transform: translate(var(--gx), var(--gy));
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -30;
		}
	}
	@keyframes sniff {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes lift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-3px);
		}
	}
</style>
