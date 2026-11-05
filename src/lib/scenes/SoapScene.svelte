<script lang="ts">
	/**
	 * How soap cleans, up close on the skin: an oily smudge with germs in it, water alone
	 * sliding past, soap's tiny "lollipops" arriving, grabbing the dirt with their tails,
	 * the rinse washing the bundles away, and clean skin.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SKIN = 260;
	const G = { x: 340, y: 190 };
	// Soap bits ringed round the dirt: head out, tail in.
	const ring = Array.from({ length: 12 }, (_, i) => {
		const t = (i / 12) * Math.PI * 2;
		return { x: G.x + Math.cos(t) * 104, y: G.y + Math.sin(t) * 74, deg: (t * 180) / Math.PI };
	});
</script>

{#snippet germ(x: number, y: number, c: string)}
	<g transform="translate({x} {y}) scale(1.7)">
		<circle r="14" fill={c} />
		<g stroke={c} stroke-width="3" stroke-linecap="round"><path d="M0 -14 L0 -20 M12 -8 L17 -12 M-12 -8 L-17 -12 M12 8 L17 12 M-12 8 L-17 12" /></g>
		<circle cx="-5" cy="-3" r="2.5" fill="#FFFFFF" /><circle cx="5" cy="-3" r="2.5" fill="#FFFFFF" />
		<path d="M-5 5 q5 -4 10 0" stroke="#FFFFFF" stroke-width="2" fill="none" stroke-linecap="round" />
	</g>
{/snippet}

{#snippet lolly(x: number, y: number, deg: number)}
	<g transform="translate({x} {y}) rotate({deg}) scale(1.6)">
		<line x1="0" y1="0" x2="-20" y2="0" stroke="#C9B3E6" stroke-width="3" stroke-linecap="round" />
		<circle cx="4" cy="0" r="6" fill="#A8D8EA" stroke="#7FB6E0" stroke-width="1.5" />
	</g>
{/snippet}

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="A close-up of soap lifting dirt and germs off skin"
>
	<rect width="680" height={SKIN} fill="#F2FAFD" />
	<rect y={SKIN} width="680" height={360 - SKIN} fill="#FFD3BF" />
	<path d="M0 {SKIN} Q170 {SKIN - 6} 340 {SKIN} Q510 {SKIN + 6} 680 {SKIN}" stroke="#F0B49E" stroke-width="2" fill="none" />

	<!-- Layer: an oily smudge with germs stuck in it -->
	<g class="layer" style:opacity={op('germs')}>
		<ellipse cx={G.x} cy={SKIN - 8} rx="130" ry="26" fill="#D9B494" opacity="0.8" />
		{@render germ(G.x - 54, SKIN - 30, '#9ED6AA')}
		{@render germ(G.x + 50, SKIN - 26, '#C9B3E6')}
	</g>

	<!-- Layer: water alone just slides over the oil -->
	<g class="layer" style:opacity={op('water-only')}>
		<path class="flow" d="M60 {SKIN - 40} Q200 {SKIN - 50} 330 {SKIN - 64} Q460 {SKIN - 50} 620 {SKIN - 40}" stroke="#5FA3D6" stroke-width="3" stroke-dasharray="8 12" fill="none" stroke-linecap="round" />
		<g fill="#CDEBF5" stroke="#7FB6E0" stroke-width="1.5"><circle cx="140" cy={SKIN - 44} r="7" /><circle cx="520" cy={SKIN - 44} r="7" /></g>
	</g>

	<!-- Layer: soap bits arriving -->
	<g class="layer" style:opacity={op('soap')}>
		{#each [[120, 120, 20], [200, 80, -30], [480, 90, 200], [560, 130, 160], [150, 180, 60], [530, 190, 120]] as [x, y, d] (`${x}${y}`)}
			<g class="drift">{@render lolly(x, y, d)}</g>
		{/each}
		<g fill="#FFFFFF" stroke="#C9B3E6" stroke-width="1.5"><circle cx="90" cy="60" r="16" /><circle cx="600" cy="50" r="12" /><circle cx="620" cy="90" r="8" /></g>
	</g>

	<!-- Layer: soap grabbing the dirt, tails in, lifting it off -->
	<g class="layer" style:opacity={op('grab')}>
		<g class="lift">
			<ellipse cx={G.x} cy={G.y} rx="72" ry="46" fill="#D9B494" opacity="0.8" />
			{@render germ(G.x - 26, G.y, '#9ED6AA')}
			{@render germ(G.x + 28, G.y + 4, '#C9B3E6')}
			{#each ring as r, i (i)}
				{@render lolly(r.x, r.y, r.deg)}
			{/each}
		</g>
	</g>

	<!-- Layer: rinsing — water carries the bundles away -->
	<g class="layer" style:opacity={op('rinse')}>
		<path class="flow" d="M40 120 Q340 60 660 140" stroke="#5FA3D6" stroke-width="4" stroke-dasharray="10 12" fill="none" stroke-linecap="round" />
		<path class="flow" d="M40 170 Q340 110 660 190" stroke="#7FB6E0" stroke-width="3" stroke-dasharray="10 12" fill="none" stroke-linecap="round" />
		<g fill="#FFFFFF" stroke="#C9B3E6" stroke-width="1.5"><circle cx="560" cy="120" r="14" /><circle cx="600" cy="160" r="10" /><circle cx="520" cy="160" r="8" /></g>
	</g>

	<!-- Layer: clean, shiny skin -->
	<g class="layer" style:opacity={op('clean')} fill="#FFD27A">
		<path d="M200 200 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7 Z" />
		<path d="M470 210 l7 17 17 7 -17 7 -7 17 -7 -17 -17 -7 17 -7 Z" />
		<path d="M340 170 l6 14 14 6 -14 6 -6 14 -6 -14 -14 -6 14 -6 Z" />
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .flow {
			animation: flow 1.6s linear infinite;
		}
		.animate .lift {
			animation: lift 2.4s ease-in-out infinite;
		}
		.animate .drift {
			animation: drift 3s ease-in-out infinite;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -44;
		}
	}
	@keyframes lift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-8px);
		}
	}
	@keyframes drift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(6px);
		}
	}
</style>
