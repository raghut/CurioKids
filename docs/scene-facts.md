# Scene facts — animated Why? facts without OpenAI

A **scene fact** is a normal fact whose pictures are an animated SVG scene instead of
generated images. The scene stays on screen while the child swipes through the sections,
and each section switches parts of it on or off (the sun's rays, rising vapor, rain…).

Nothing on the kid side changes: `/api/facts` still serves the fact, flattened to one
language, and `FactReader` draws the scene when the fact has one. Facts without a scene
look exactly as before.

## How a scene fact gets into the app

| Part | Lives in | Gets there by |
|---|---|---|
| Words (English + Telugu) | `facts` table | `/admin/facts/import` — paste or upload the JSON |
| The scene (the drawing) | `src/lib/scenes/` | code: a commit and a Vercel deploy |

There is **no OpenAI call and no Blob upload**. The import runs the words through
`parseFactJson` — the same validator a generated fact faces — checks the scene id and
every layer name against `src/lib/scenes/catalog.ts`, and saves the fact as a **draft**.
Read it in the preview, then publish it from `/admin/facts` as usual.

An import never overwrites: if the `id` already exists it is refused. Delete the old
fact first if you mean to replace it.

## The JSON

The same shape the model returns for a generated fact, plus two optional fields. See
`content/facts/water-cycle.json` for a complete example.

```jsonc
{
  "id": "fact-water-cycle",            // optional; lowercase, digits, dashes. Omit for a random id.
  "topic": "water cycle",
  "scene": {                           // optional
    "id": "water-cycle",               // must be in src/lib/scenes/catalog.ts
    "section_layers": [                // ONE list per entry in "structure", same order
      ["rain-cloud", "rain"],
      ["sunbeams"]
      // …
    ]
  },
  "structure": [ { "type": "question" }, { "type": "discovery" }, … ],
  "content": {
    "en": { "title": "…", "subtitle": "…", "sections": [ { "text": "…" }, { "items": ["…"] } ],
            "reflection_question": "…", "real_world_mission": "…" },
    "te": { … }                        // optional; same number of sections
  }
}
```

The closing screen (reflection + mission) shows no scene — there is no room on a phone.
A `fun_facts` section shows the scene at half size for the same reason.

## Available scenes

| id | Layers |
|---|---|
| `water-cycle` | `sunbeams`, `vapor`, `cloud`, `rain-cloud`, `rain`, `stream` |

## Adding a scene

1. Draw it as `src/lib/scenes/<Name>Scene.svelte`, following `WaterCycleScene.svelte`:
   viewBox `0 0 680 360`, the locked palette and its tints, **no text** in the drawing,
   each switchable part wrapped in `<g class="layer" style:opacity={op('name')}>`.
   Motion is opacity/transform only, slow, and only under
   `prefers-reduced-motion: no-preference`; the `still` prop turns it off for thumbnails.
2. Add its id and layer names to `catalog.ts` and its component to `registry.ts`.
   `registry.test.ts` fails if the two disagree or a layer is never drawn.
3. Deploy, then import the fact that uses it.

## Telugu

Telugu written outside the app has the same weakness as the model's: everyday nature
words can come back wrong. Read the Telugu on the edit page before publishing.
