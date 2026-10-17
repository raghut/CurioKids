<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<div class="max-w-5xl mx-auto p-6">
	<h1 class="text-2xl font-bold mb-2">Themes</h1>
	<p class="text-sm text-slate-600 mb-6">
		Defaults live in code; anything you change here is saved as an override. Reset removes the
		override. A theme's id can never change — it is stored inside every story that used it.
	</p>

	{#if data.loadError}
		<p class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
			Could not read saved themes. Has <code>npm run db:init</code> been run?
		</p>
	{/if}

	{#if form?.error}
		<p class="mb-4 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-800">
			{form.error}
		</p>
	{/if}

	{#if data.activeCount > data.softLimit}
		<p class="mb-4 rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
			{data.activeCount} active themes. Above {data.softLimit}, the "Make my story" button on the
			child's create screen falls below the fold.
		</p>
	{/if}

	<div class="space-y-4">
		{#each data.rows as t (t.id)}
			<form
				method="POST"
				action="?/save"
				use:enhance
				class="rounded-xl border border-slate-200 p-4 {t.archived ? 'bg-slate-50' : 'bg-white'}"
			>
				<input type="hidden" name="id" value={t.id} />

				<div class="flex items-baseline justify-between mb-3">
					<code class="text-xs text-slate-500">{t.id}</code>
					<span class="text-xs text-slate-500">
						{t.isEdited ? 'edited' : 'default'} ·
						{t.storyCount} {t.storyCount === 1 ? 'story' : 'stories'}
						{#if t.archived}· archived{/if}
					</span>
				</div>

				<div class="grid gap-3 sm:grid-cols-2">
					<label class="block">
						<span class="text-xs font-medium text-slate-600">English label</span>
						<input
							name="label_en"
							value={t.label_en}
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>
					<label class="block">
						<span class="text-xs font-medium text-slate-600">Telugu label</span>
						<input
							name="label_te"
							value={t.label_te}
							lang="te"
							class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>
				</div>

				<label class="mt-3 block">
					<span class="text-xs font-medium text-slate-600">
						Goal hint — goes into the story prompt (max {data.goalHintMax} chars)
					</span>
					<input
						name="goal_hint"
						value={t.goal_hint}
						maxlength={data.goalHintMax}
						class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
					/>
				</label>

				<div class="mt-3 flex flex-wrap items-end gap-3">
					<label class="block">
						<span class="text-xs font-medium text-slate-600">Sort</span>
						<input
							name="sort_order"
							type="number"
							value={t.sort_order}
							class="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
						/>
					</label>

					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name="archived" checked={t.archived} />
						Archived
					</label>

					<button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
						Save
					</button>

					{#if t.hasDefault}
						{#if t.isEdited}
							<button
								formaction="?/remove"
								class="rounded-lg border border-slate-300 px-4 py-2 text-sm"
							>
								Reset to default
							</button>
						{/if}
					{:else if t.storyCount === 0}
						<button
							formaction="?/remove"
							class="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-700"
						>
							Delete
						</button>
					{:else}
						<span class="text-xs text-slate-500">
							Used by {t.storyCount} {t.storyCount === 1 ? 'story' : 'stories'} — archive instead of
							deleting.
						</span>
					{/if}
				</div>
			</form>
		{/each}
	</div>

	<form
		method="POST"
		action="?/create"
		use:enhance
		class="mt-8 rounded-xl border-2 border-dashed border-slate-300 p-4"
	>
		<h2 class="mb-3 font-bold">Add a theme</h2>
		<div class="grid gap-3 sm:grid-cols-2">
			<label class="block">
				<span class="text-xs font-medium text-slate-600">English label</span>
				<input name="label_en" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
			</label>
			<label class="block">
				<span class="text-xs font-medium text-slate-600">Telugu label</span>
				<input
					name="label_te"
					lang="te"
					class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
				/>
			</label>
		</div>
		<label class="mt-3 block">
			<span class="text-xs font-medium text-slate-600">
				Goal hint (max {data.goalHintMax} chars)
			</span>
			<input
				name="goal_hint"
				maxlength={data.goalHintMax}
				class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
			/>
		</label>
		<div class="mt-3 flex flex-wrap items-end gap-3">
			<label class="block">
				<span class="text-xs font-medium text-slate-600">id (blank = from the English label)</span>
				<input name="id" placeholder="good_habits" class="mt-1 w-56 rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
			</label>
			<label class="block">
				<span class="text-xs font-medium text-slate-600">Sort</span>
				<input
					name="sort_order"
					type="number"
					value="100"
					class="mt-1 w-24 rounded-lg border border-slate-300 px-3 py-2"
				/>
			</label>
			<button class="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white">
				Add theme
			</button>
		</div>
	</form>
</div>
