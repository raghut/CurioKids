<script lang="ts">
	import '../layout.css';
	import { LayoutGrid, LogOut, Menu, X } from 'lucide-svelte';
	let { children, data } = $props();
	let drawerOpen = $state(false);

	const isLogin = $derived((data?.pathname ?? '').startsWith('/admin/login'));
</script>

{#if isLogin}
	{@render children()}
{:else}
	<div class="min-h-screen bg-slate-50 text-slate-800">
		<!-- Top bar (mobile) -->
		<header class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
			<button
				aria-label="Open menu"
				class="grid h-11 w-11 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
				onclick={() => (drawerOpen = true)}
			>
				<Menu size={22} strokeWidth={1.5} />
			</button>
			<span class="font-[family-name:var(--font-fraunces)] text-lg font-bold">CurioKids Admin</span>
			<span class="w-11"></span>
		</header>

		<div class="lg:flex">
			<!-- Sidebar (desktop) -->
			<aside class="hidden w-60 shrink-0 border-r border-slate-200 bg-white p-4 lg:block">
				{@render nav()}
			</aside>

			<!-- Drawer (mobile) -->
			{#if drawerOpen}
				<div class="fixed inset-0 z-40 lg:hidden">
					<button
						aria-label="Close menu"
						class="absolute inset-0 bg-slate-900/30"
						onclick={() => (drawerOpen = false)}
					></button>
					<aside class="absolute left-0 top-0 h-full w-64 bg-white p-4 shadow-xl">
						<div class="mb-4 flex items-center justify-between">
							<span class="font-[family-name:var(--font-fraunces)] text-lg font-bold">Admin</span>
							<button
								aria-label="Close menu"
								class="grid h-10 w-10 place-items-center rounded-lg text-slate-600 hover:bg-slate-100"
								onclick={() => (drawerOpen = false)}
							>
								<X size={20} strokeWidth={1.5} />
							</button>
						</div>
						{@render nav()}
					</aside>
				</div>
			{/if}

			<main class="min-w-0 flex-1 p-4 lg:p-8">
				{@render children()}
			</main>
		</div>
	</div>
{/if}

{#snippet nav()}
	<nav class="flex h-full flex-col gap-1">
		<a
			href="/admin"
			class="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
			onclick={() => (drawerOpen = false)}
		>
			<LayoutGrid size={18} strokeWidth={1.5} /> Stories
		</a>
		<form method="POST" action="/admin/login?/logout" class="mt-auto">
			<button
				type="submit"
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-100"
			>
				<LogOut size={18} strokeWidth={1.5} /> Sign out
			</button>
		</form>
	</nav>
{/snippet}
