<script lang="ts">
	/**
	 * An elephant and everything its trunk can do. The body is always drawn; each trunk
	 * pose is its own layer (hanging, smelling, drinking, spraying, lifting, trumpeting),
	 * so every section must switch on exactly one pose.
	 */
	let {
		layers = [],
		still = false,
		cover = false
	}: { layers?: string[]; still?: boolean; cover?: boolean } = $props();

	const shown = $derived(new Set(layers));
	const op = (name: string) => (shown.has(name) ? 1 : 0);

	const SKIN = '#BFC3CC';
	const EDGE = '#9AA0AC';
	// Where every trunk starts, at the front of the head.
	const T = { x: 222, y: 150 };
</script>

<svg
	viewBox="0 0 680 360"
	class="block h-full w-full"
	class:animate={!still}
	preserveAspectRatio={cover ? 'xMidYMid slice' : 'xMidYMid meet'}
	role="img"
	aria-label="An elephant using its trunk"
>
	<rect width="680" height="360" fill="#EAF6FB" />
	<rect y="296" width="680" height="64" fill="#E9D6A8" />
	<!-- Water pool (always) -->
	<ellipse cx="120" cy="312" rx="96" ry="18" fill="#A8D8EA" />

	<!-- Body (always) -->
	<g fill={SKIN} stroke={EDGE} stroke-width="2.5">
		<rect x="290" y="226" width="40" height="76" rx="10" />
		<rect x="430" y="226" width="40" height="76" rx="10" />
		<ellipse cx="380" cy="190" rx="130" ry="86" />
		<rect x="260" y="234" width="40" height="68" rx="10" />
		<rect x="400" y="234" width="40" height="68" rx="10" />
		<circle cx="250" cy="140" r="58" />
	</g>
	<path d="M266 102 Q330 96 324 168 Q300 196 268 178 Z" fill="#D3D6DE" stroke={EDGE} stroke-width="2" />
	<circle cx="232" cy="128" r="5" fill="#4E3A2E" />
	<path d="M506 170 q20 10 16 36" stroke={EDGE} stroke-width="4" fill="none" stroke-linecap="round" />
	<path d="M226 168 q-8 14 6 18" stroke="#FFFFFF" stroke-width="7" fill="none" stroke-linecap="round" />

	<!-- Layer: trunk hanging down -->
	<g class="layer" style:opacity={op('trunk')}>
		<path class="sway" d="M{T.x} {T.y} Q196 200 204 260 Q206 280 196 288" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" style:transform-origin="{T.x}px {T.y}px" />
	</g>

	<!-- Layer: trunk raised, sniffing the air -->
	<g class="layer" style:opacity={op('smell')}>
		<path d="M{T.x} {T.y} Q170 140 160 90 Q156 66 172 56" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" />
		<g stroke="#FFB89A" stroke-width="3" fill="none" stroke-linecap="round">
			<path class="pulse" d="M150 40 q-10 -8 0 -16 M174 30 q-10 -8 0 -16 M130 52 q-10 -8 0 -16" />
		</g>
	</g>

	<!-- Layer: trunk down in the pool, sucking up water -->
	<g class="layer" style:opacity={op('drink')}>
		<path d="M{T.x} {T.y} Q180 210 150 280 Q144 296 140 306" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" />
		<path class="up" d="M140 304 Q150 270 176 214" stroke="#5FA3D6" stroke-width="4" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
	</g>

	<!-- Layer: trunk up, spraying water over its back -->
	<g class="layer" style:opacity={op('spray')}>
		<path d="M{T.x} {T.y} Q190 110 214 70 Q230 48 250 46" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" />
		<path class="flow" d="M260 44 Q360 0 450 90" stroke="#5FA3D6" stroke-width="4" stroke-dasharray="6 10" fill="none" stroke-linecap="round" />
		<g fill="#A8D8EA"><circle cx="420" cy="84" r="5" /><circle cx="450" cy="104" r="4" /><circle cx="400" cy="102" r="4" /></g>
	</g>

	<!-- Layer: trunk curled around a log, lifting it -->
	<g class="layer" style:opacity={op('lift')}>
		<g class="lift">
			<rect x="92" y="170" width="120" height="30" rx="14" fill="#C79A7C" stroke="#A97E62" stroke-width="2" />
			<path d="M{T.x} {T.y} Q180 180 172 200 Q166 218 150 206" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" />
		</g>
	</g>

	<!-- Layer: trunk up, trumpeting -->
	<g class="layer" style:opacity={op('trumpet')}>
		<path d="M{T.x} {T.y} Q186 110 176 70 Q172 50 156 40" stroke={SKIN} stroke-width="26" fill="none" stroke-linecap="round" />
		<g stroke="#FFB89A" stroke-width="3.5" fill="none" stroke-linecap="round">
			<path class="pulse" d="M128 30 q-14 14 0 28" />
			<path class="pulse" d="M110 18 q-22 22 0 50" style:animation-delay="-0.4s" />
			<path class="pulse" d="M92 8 q-30 30 0 70" style:animation-delay="-0.8s" />
		</g>
	</g>
</svg>

<style>
	.layer {
		transition: opacity 0.7s ease;
	}
	@media (prefers-reduced-motion: no-preference) {
		.animate .sway {
			animation: sway 3s ease-in-out infinite;
		}
		.animate .pulse {
			animation: pulse 1.6s ease-in-out infinite;
		}
		.animate .up {
			animation: up 1.4s linear infinite;
		}
		.animate .flow {
			animation: flow 1.4s linear infinite;
		}
		.animate .lift {
			animation: lift 2.4s ease-in-out infinite;
		}
	}
	@keyframes sway {
		0%,
		100% {
			transform: rotate(-3deg);
		}
		50% {
			transform: rotate(3deg);
		}
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 0.25;
		}
		50% {
			opacity: 1;
		}
	}
	@keyframes up {
		to {
			stroke-dashoffset: 32;
		}
	}
	@keyframes flow {
		to {
			stroke-dashoffset: -32;
		}
	}
	@keyframes lift {
		0%,
		100% {
			transform: translateY(0);
		}
		50% {
			transform: translateY(-6px);
		}
	}
</style>
