# Scene stories: animated stories without OpenAI

A **scene story** is a gallery story whose pictures come from an animated SVG scene instead of
generated images. It works the same way as [scene facts](scene-facts.md). The scene stays on
screen while the child turns pages, and each page switches parts of it on or off (Dheera
walking in, the carrot breaking in two, the sunset).

On the kid side, nothing new is needed. `/api/stories` serves the story like any other.
`StoryReader` draws the scene when the story has one, and the grid tile shows the scene's
cover moment. Stories without a scene look exactly as before.

## How a scene story gets into the app

| Part | Lives in | Gets there by |
|---|---|---|
| Words (English and/or Telugu) | `stories` table, one row per language | `/admin/stories/import`: paste one, or choose several files |
| The scene (the drawing) | `src/lib/scenes/` | code: a commit and a Vercel deploy |

There is **no OpenAI call and no Blob upload**. The import:

- checks the character against the six locked animals,
- checks the theme against the **active** themes,
- checks the age band (`2-4`, `5-6` or `7-8`),
- checks the scene id and every layer name against `src/lib/scenes/catalog.ts`,
- saves each language as a **draft**.

Preview the story, then publish it from `/admin` as usual. Each language is published
separately.

An import never overwrites. The same file always gives the same story ids, so importing it twice
is refused. If any language already exists, the whole file is refused.
To replace a story, delete it first.

## The JSON

See `content/stories/carrot-share.json` for a complete example.

```jsonc
{
  "id": "story-carrot-share",      // optional. Each language gets a fixed uuid made from "<id>-en" / "<id>-te".
  "character_id": "rabbit",        // rabbit | peacock | elephant | monkey | tortoise | parrot
  "theme_id": "sharing",           // an ACTIVE theme id (see /admin/themes)
  "age_tag": "5-6",                // 2-4 | 5-6 | 7-8, which the filter chips read
  "scene": {                       // optional
    "id": "carrot-share",          // must be in src/lib/scenes/catalog.ts
    "page_layers": [               // ONE list per page, in the same order as the pages
      ["day", "pull"],
      ["day", "carrot", "sound"]
      // …
    ]
  },
  "content": {
    "en": {
      "title": "…",
      "pages": [ { "text": "…" }, … ],   // 4 to 10 pages
      "moral": "…",
      "reflection_question": "…"
    },
    "te": { … }                    // optional. Must have the SAME number of pages as en.
  }
}
```

Every language shares one scene, so the page counts must match. Page 3 in Telugu shows the
same picture as page 3 in English.

The length rules from `CLAUDE.md` (30–50 words a page, sentences of 12 words or fewer, a title
of 8 words or fewer) still apply to the writing. The import only checks hard limits by
character count, so keep to those rules when writing.

## Editing

`/admin/stories/[id]` still edits page text for free. For a scene story it hides the
picture-prompt and Regenerate controls, because the pictures are code and change only
with a deploy.

## Available story scenes

| id | Layers | Used by |
|---|---|---|
| `carrot-share` | `day`, `pull`, `carrot`, `sound`, `tortoise`, `share`, `sunset`, `hearts` | carrot-share (Mishti and Dheera, en + te) |

Fact scenes and story scenes share one catalog. A story may use a fact scene if it fits.

`storyImport.test.ts` checks every file in `content/stories/` with the same rules the import
page uses, so a broken file fails `npm test` before it reaches the admin.

## Adding a story scene

Follow the steps in [scene-facts.md](scene-facts.md#adding-a-scene), with these additions for
stories:

- **Keep the locked look of each character.** Mishti is white, has brown eyes and wears a tiny
  red scarf (drawn in coral). The scene is the only picture the child sees, so a character
  must look the same on every page.
- **Draw a character once if it appears across several layers.** Fade it with
  `Math.max(op('a'), op('b'))` so it doesn't dim mid-fade. See `atRock` in
  `CarrotShareScene.svelte`.
- **Make the characters big.** At phone width the scene is about 340px wide. Draw characters
  about 1.5× the size you'd first pick.

## Print

A scene story prints with its pictures. The title sheet shows the scene's cover moment, and each
page's sheet shows the scene at that page's layers. The pictures are still, because paper can't
move.

## Writing both languages

Write `en` and `te` together in one file, page for page, so page 3 means the same thing in
both languages and matches the same picture. Have the Telugu read by someone fluent on the edit
page before publishing.
