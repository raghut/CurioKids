# Print Stories — Design

_2026-07-19_

## Goal

Let parents print a story onto paper so kids can read/hear it **off-screen** — directly serving
the app's anti-screen-time mission. Works for both curated and generated stories.

## Approach

A **print-only layout** rendered with `@media print` (Tailwind `print:` variants) on the existing
story viewer (`src/routes/stories/[id]/+page.svelte`). A printer icon in the header calls
`window.print()`; the browser's native dialog handles color/B&W, paper size, and "Save as PDF".

- **No new dependency**, no PDF library, no extra route.
- Rejected: a dedicated `/print` route (needless duplicate fetch — the viewer already holds the
  story) and jsPDF/pdf-lib (new dependency, YAGNI, violates "ask before deps").

## Layout (picture-book, one page per sheet)

- **Sheet 1** — story title (large, Fraunces display) + cover image (if present).
- **Sheets 2…N** — one story page each: image on top (if present), big storybook text below.
  Each sheet uses `break-after: page` + `break-inside: avoid` so pages never split.
- **Last sheet** — moral + reflection question + a small "Made with CurioKids ✨" footer.

Storybook-scale type: title ~`text-4xl`, page text ~`text-3xl` with relaxed leading. Plain black
text on white (no reliance on background colors, which browsers drop in print by default).

## Components

### `src/lib/components/PrintableStory.svelte` (new)
Keeps the viewer focused. Pure presentational; hidden on screen (`hidden print:block`).

Props:
```ts
{
  title: string;
  cover: string;                 // image URL/path, "" if none
  pages: Array<{ text: string; image: string }>;  // image "" if none
  moral: string;
  reflectionQuestion: string;
  language: 'en' | 'te';
}
```
- Omits any image whose value is `""` (curated content currently has empty image paths → renders
  text-only, no broken `<img>`).
- Telugu: text containers get `lang="te"` (inherits Noto Sans Telugu + line-height 1.6 from global
  CSS).

### `src/routes/stories/[id]/+page.svelte` (modified)
- Add a `Printer` (lucide) icon button beside the X → `onclick={() => window.print()}`,
  `aria-label="Print"`.
- Wrap the interactive reader in `print:hidden`.
- Add a `printData` derived that normalizes both sources into `PrintableStory` props:
  - generated: `cover_image_url`, `pages[].image_url`, `moral`, `reflection_question`.
  - curated: `cover_image`, `pages[].image`, `moral`, `reflection_question`.
- Render `<PrintableStory {...printData} language={$language} />`.

## Scope

- **Stories only** (curated + generated). Facts (the "Why?" pillar) are out of scope for now.
- No parent gate on the button — printing is harmless; a curious child tapping it just opens the
  print dialog.

## Testing / verification

CSS/UI feature — no unit tests. Verify in-browser: the printer icon triggers the dialog, and under
print-media emulation the printable layout shows title+cover, one page per sheet at large type,
and the final moral/reflection/footer sheet. `npm run check` stays clean.
