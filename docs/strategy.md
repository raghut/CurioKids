# CurioKids — MVP Strategy

_Working doc. Last updated: 2026-06-07_

## 1. MVP scope & constraints

**Goal:** Validate with Geethadhya (7) whether (a) curated stories + nature facts hold her attention, and (b) being able to pick her own hero animal makes story-time feel magical.

**What's in:**
- **Pillar 1A — Curated Stories**: 10 hand-crafted, bundled, offline, audio-narrated
- **Pillar 1B — Generated Stories**: child picks 1 of 6 animals + 1 of the active themes + optional name → OpenAI generates a 5-page story + DALL-E cover image. Cached locally for offline re-read.
- **Pillar 2 — Nature Facts**: 10 hand-crafted, bundled, offline, audio-narrated
- 2 languages: English + Telugu
- No login, no auth, no profile
- Single backend endpoint: `/api/generate-story` (Vercel Edge Function) — the only piece that isn't offline

**What's out:**
- Database / user accounts
- Shared library / social
- Audio narration for generated stories (text only — curated stories have audio)
- Per-page DALL-E images for generated stories (cover only)
- Custom character creation by the child (locked to 6 animals). Themes are operator-managed from `/admin/themes` as of 2026-10-17; the child still only selects one.
- Analytics, missions UI, parent dashboard
- Personalization beyond the character pick

**Why this is the right MVP:**
- Generated story is the "wow" moment that makes Geethadhya feel ownership
- Curated content keeps the app useful when offline / out of generation quota
- Costs ~₹5–7 per generated story; daily cap of 3 per device keeps it ₹500/month total even with friends testing
- You can sit with her and see which she replays — curated or "her" stories

---

## 2. UX flow (screen by screen)

App opens → 5 screens total. That's the whole product.

### Screen 1: Splash (1 second)
Logo. Auto-advances.

### Screen 2: Language picker (first launch only)
Two big buttons:
- "English"
- "తెలుగు"

Saved to localStorage. Never asked again unless reset.

### Screen 3: Home
Two large cards, each ~half the screen:
- **Card A: "Stories" / "కథలు"** — illustrated, warm color
- **Card B: "Why?" / "ఎందుకు?"** — illustrated, cool color

Bottom corner: tiny "settings" gear (language reset only).

No menus, no search, no profile, no notifications.

### Screen 4: Content list (when child taps a card)
A scrollable grid of illustrated tiles. Each tile shows:
- Cover image
- Title (1 line, large font)
- A small "✓" if she's read it before (stored in localStorage)

That's it. No filters, no sorting, no "trending."

### Screen 5: Content viewer
For both stories and facts:
- Full-screen illustration at top
- Text below, large font (min 22pt)
- Audio auto-plays when screen opens
- Play/pause button (large, bottom center)
- Swipe right → next page/section
- Swipe left → previous
- Tap "✕" top-right → back to list

At the end of a fact:
- "Try this!" — the real-world mission, one sentence
- "What do you think?" — the reflection question
- Big "Done!" button → back to grid (marks ✓)

At the end of a story:
- Moral, one line
- Reflection question
- "Done!" button

**That's the entire app.** Resist adding anything until Geethadhya has used it for 2 weeks.

---

## 3. Content data model

Store everything as JSON files bundled in the app. No DB.

### Folder structure

```
src/
  routes/
  lib/
content/
  facts/
    en/
      fact-001-ants.json
      fact-002-rainbow.json
      ...
    te/
      fact-001-ants.json
      ...
  stories/
    en/
      story-001-bunny.json
      ...
    te/
      ...
  images/
    facts/
      fact-001.png
      fact-001-detail.png
    stories/
      story-001-cover.png
      story-001-scene1.png
  audio/
    facts/
      fact-001-en.mp3
      fact-001-te.mp3
    stories/
      ...
```

### Fact schema

```json
{
  "id": "fact-001",
  "type": "nature_fact",
  "language": "en",
  "topic": "insects",
  "age_range": "5-8",
  "title": "Why do ants walk in a line?",
  "cover_image": "facts/fact-001.png",
  "audio": "facts/fact-001-en.mp3",
  "sections": [
    {
      "type": "question",
      "text": "Have you seen tiny ants walking one behind the other, like a little parade?",
      "image": "facts/fact-001.png"
    },
    {
      "type": "discovery",
      "text": "Ants leave a special smell on the ground as they walk. It's like an invisible road only they can sniff. When the next ant smells it, it knows: 'This is the right way to food!' That's why they all follow the same line.",
      "image": "facts/fact-001-detail.png"
    },
    {
      "type": "fun_facts",
      "items": [
        "An ant can lift things 50 times heavier than itself.",
        "Ants don't have ears — they feel sounds through the ground.",
        "Some ants are like farmers. They grow tiny mushrooms for food."
      ]
    },
    {
      "type": "lesson",
      "text": "When friends share what they know, everyone reaches the goal faster. That's teamwork."
    }
  ],
  "reflection_question": "If you couldn't talk, how would you tell your friend where the candy is hidden?",
  "real_world_mission": "Sit near a wall or garden for 5 minutes. Watch ants. Where are they going? Are they carrying anything?"
}
```

### Story schema

```json
{
  "id": "story-001",
  "type": "story",
  "language": "en",
  "age_range": "5-8",
  "theme": "courage",
  "title": "Bunny and the Big Mountain",
  "cover_image": "stories/story-001-cover.png",
  "audio": "stories/story-001-en.mp3",
  "pages": [
    {
      "text": "Once upon a time, a small bunny named Mishti lived at the bottom of a big mountain...",
      "image": "stories/story-001-page1.png"
    },
    {
      "text": "...",
      "image": "stories/story-001-page2.png"
    }
  ],
  "moral": "Being small doesn't mean you can't do big things.",
  "reflection_question": "What is one big thing you want to try, even if you feel small?"
}
```

---

## 4. AI content generation workflow (manual, by you)

This is the actual production process. ~45 min per fact, ~90 min per story end-to-end. Get faster with practice.

### Tools you'll use
- **Text:** Claude (this chat) or ChatGPT — both fine
- **Telugu adaptation:** same tool, with a quality check by you (you're the native speaker)
- **Illustration:** ChatGPT Plus (DALL-E 3) **or** free Bing Image Creator (also DALL-E 3) **or** Ideogram (better text rendering, free tier)
- **Audio narration:**
  - English: ElevenLabs free tier (best quality) or OpenAI TTS (cheap)
  - Telugu: Google Cloud TTS (decent Telugu) **or** AI4Bharat's Indic TTS (best for Indic languages, free, open-source) **or** record yourself / Badanika

### Step-by-step

**Step 1: Pick the topic** (5 min)

Keep a running list. For Pillar 2, start with topics that connect to things Geethadhya already sees in her day. Suggested first 10:

1. Why do ants walk in a line?
2. Why does the moon change shape?
3. Why is the sky blue?
4. Why do leaves fall?
5. How do plants drink water?
6. Why do we have shadows?
7. Why does a peacock dance before rain?
8. Why do bees make honey?
9. Why do we yawn?
10. Why does ice melt?

**Step 2: Generate the text (English)** — copy/paste this prompt

```
You are writing a curiosity-fact card for a 6–7 year old Indian child.

Topic: [TOPIC HERE]

Constraints:
- Use very simple words. A 6-year-old should understand.
- Use analogies a child knows (their toys, food, family, animals they've seen).
- Avoid science jargon. If you must use a real word like "pheromone," explain it as "a special smell."
- Indian context: examples from village/Indian life where possible (mango, neem, peacock, monsoon, bullock cart) — not Western (skateboard, hot dog).
- No scary content. No religion. No region-specific politics.

Output as JSON with these fields:
{
  "title": "Question form, max 8 words",
  "question": "1-sentence hook connecting to something the child has seen",
  "discovery": "3-sentence explanation in simple language",
  "fun_facts": ["3 short wow-facts, each under 12 words"],
  "lesson": "One sentence on the bigger meaning (teamwork, patience, nature's design)",
  "reflection_question": "One open-ended question",
  "real_world_mission": "One 5-minute activity the child can do today",
  "illustration_prompt": "Detailed visual scene for an illustrator: subject, action, setting, mood. 2-3 sentences."
}
```

**Step 3: Adapt to Telugu** — copy/paste this prompt

```
Adapt this nature fact into Telugu for a 6–7 year old child, especially one from a village or small town.

[PASTE ENGLISH JSON HERE]

Rules:
- Use spoken Telugu, not formal/literary Telugu (వ్యావహారిక భాష, not గ్రాంథిక భాష).
- Use words a Telugu grandmother would use when telling a story to her grandchild.
- Replace any Western/urban examples with rural Indian ones.
- Keep the same JSON structure. Translate values; keep keys in English.
- Don't transliterate — properly translate. (Don't write "ant" as "ant" — use "చీమ".)
```

Then **you personally review** the Telugu. AI Telugu is often awkward. You're the QA. Fix anything that sounds like a translation rather than a story.

**Step 4: Generate the illustration** — use this style guide for every image

```
Children's book illustration, flat 2D vector style, soft warm pastel palette (peach, sky blue, mint green, butter yellow, coral), cheerful and warm mood, no text in image, square 1:1 aspect ratio, simple clean shapes, friendly characters with large expressive eyes, hand-drawn feel, Indian/South Asian setting where applicable.

Style reference: blend of Beatrix Potter and modern flat design. Inviting. Calm.

Scene: [PASTE illustration_prompt FROM STEP 2]
```

Generate 4 variants. Pick the best. Re-roll if any character looks scary, sad, or "off."

**One detail image per fact** — usually a close-up of the science (e.g., ants and the pheromone trail visualized as a colorful line). Same style guide.

Total per fact: 2 images. ~10 min if using DALL-E directly.

**Step 5: Generate audio narration**

For each fact, you need 2 mp3s: one English, one Telugu. The audio reads the title → question → discovery → fun_facts → lesson → reflection question. Skip the mission (parent reads it aloud).

Recommended:
- **English narration**: ElevenLabs voice "Charlotte" or "Sarah" — warm, kid-friendly female voice. Generate as mp3. Free tier covers ~30 min/month, enough for 10 facts.
- **Telugu narration (best)**: record yourself or Badanika reading the text. Authentic > synthetic. Phone voice memo is fine.
- **Telugu narration (fallback)**: Google Cloud TTS, voice `te-IN-Standard-A` (female). Free tier covers your needs.

**Step 6: Store + name files**

Place JSON in `content/facts/en/fact-001-ants.json` and `content/facts/te/fact-001-ants.json`.
Place images in `content/images/facts/fact-001.png` and `fact-001-detail.png`.
Place audio in `content/audio/facts/fact-001-en.mp3` and `fact-001-te.mp3`.

The Svelte app reads the JSON at build time, references the image + audio paths.

### Story workflow (same idea, different prompt)

```
Write a children's story for a 6–7 year old Indian child.

Theme: [e.g., courage / kindness / curiosity / honesty]
Setting: [e.g., village / forest / kitchen / school]
Main character: [e.g., a small rabbit / a curious girl / a banyan tree]

Constraints:
- 5 short pages, ~3 sentences per page.
- Simple words. Read aloud naturally.
- Indian-rooted: names like Mishti, Arjun, Lakshmi; settings like a village pond, a mango tree, a bullock cart.
- One clear moral, but don't preach.
- No villain who is "evil." Conflict should be a challenge to overcome, not a fight.
- Ends with a reflection question for the child.

Output JSON:
{
  "title": "...",
  "theme": "...",
  "pages": [
    {"text": "page 1 text", "illustration_prompt": "scene description"},
    {"text": "page 2 text", "illustration_prompt": "..."},
    ...
  ],
  "moral": "...",
  "reflection_question": "..."
}
```

Stories need 5 illustrations (one per page) + cover. ~30 min per story including image generation.

---

## 5. Visual style guide (lock this in once, reuse forever)

**One style across the whole app** — this is what makes it feel like a product, not 10 random images stitched together.

- Palette: peach (#FFB89A), sky blue (#A8D8EA), mint green (#B8E6C1), butter yellow (#FFE4A3), coral (#FF8B7B). White background.
- Typography:
  - Display: Fraunces or Nunito (warm, rounded)
  - Body: Nunito or Inter, min 22pt for kid screens
  - Telugu: Noto Sans Telugu, bundled in app
- Character style: big eyes, soft round shapes, friendly. No realism. No anime.
- No gradients. No 3D. No photographic backgrounds.
- Animal characters preferred over human characters (avoids race/age/dress complexity).

Save this paragraph as a "negative + positive prompt" you reuse for every image generation. Consistency is what makes it feel premium.

---

## 6. Sample: one complete fact, end-to-end

### English JSON

```json
{
  "id": "fact-001",
  "type": "nature_fact",
  "language": "en",
  "topic": "insects",
  "age_range": "5-8",
  "title": "Why do ants walk in a line?",
  "cover_image": "facts/fact-001.png",
  "audio": "facts/fact-001-en.mp3",
  "sections": [
    {
      "type": "question",
      "text": "Have you seen tiny ants walking one behind the other, like a little parade?",
      "image": "facts/fact-001.png"
    },
    {
      "type": "discovery",
      "text": "Ants leave a special smell on the ground as they walk. It's like an invisible road only they can sniff. When the next ant smells it, it knows: 'This is the right way to food!' That's why they all follow the same line.",
      "image": "facts/fact-001-detail.png"
    },
    {
      "type": "fun_facts",
      "items": [
        "An ant can lift things 50 times heavier than itself.",
        "Ants don't have ears — they feel sounds through the ground.",
        "Some ants are like farmers — they grow tiny mushrooms for food."
      ]
    },
    {
      "type": "lesson",
      "text": "When friends share what they know, everyone reaches the goal faster. That's teamwork."
    }
  ],
  "reflection_question": "If you couldn't talk, how would you tell your friend where the candy is hidden?",
  "real_world_mission": "Sit near a wall or garden for 5 minutes. Watch ants. Where are they going? Are they carrying anything?"
}
```

### Telugu JSON (review before shipping — my Telugu may need your touch-ups)

```json
{
  "id": "fact-001",
  "type": "nature_fact",
  "language": "te",
  "topic": "insects",
  "age_range": "5-8",
  "title": "చీమలు వరుసగా ఎందుకు నడుస్తాయి?",
  "cover_image": "facts/fact-001.png",
  "audio": "facts/fact-001-te.mp3",
  "sections": [
    {
      "type": "question",
      "text": "నువ్వు చూశావా? చిన్న చిన్న చీమలు ఒకదాని వెనుక ఒకటి, ఊరేగింపులా నడుస్తాయి!",
      "image": "facts/fact-001.png"
    },
    {
      "type": "discovery",
      "text": "చీమలు నడిచేటప్పుడు నేలమీద ఒక ప్రత్యేకమైన వాసనను వదులుతాయి. అది వాటికి మాత్రమే తెలిసే ఒక రహస్య దారి! తర్వాత వచ్చే చీమ ఆ వాసనను గుర్తుపట్టి - 'ఆహారం ఇటువైపు ఉంది!' అని తెలుసుకుంటుంది. అందుకే అన్ని చీమలు ఒకే వరుసలో వెళ్తాయి.",
      "image": "facts/fact-001-detail.png"
    },
    {
      "type": "fun_facts",
      "items": [
        "ఒక చీమ తన బరువు కంటే 50 రెట్లు ఎక్కువ ఎత్తగలదు.",
        "చీమలకు చెవులు ఉండవు - అవి నేల ద్వారా శబ్దాలను అనుభవిస్తాయి.",
        "కొన్ని చీమలు రైతుల్లాంటివి - అవి తమ ఆహారం కోసం చిన్న పుట్టగొడుగులు పెంచుతాయి."
      ]
    },
    {
      "type": "lesson",
      "text": "మిత్రులు ఒకరికొకరు తెలిసిన విషయాలు పంచుకుంటే, అందరూ తొందరగా గమ్యం చేరుకుంటారు. ఇదే జట్టు పని."
    }
  ],
  "reflection_question": "నువ్వు మాట్లాడలేకపోతే, నీ స్నేహితుడికి చాక్లెట్ ఎక్కడ దాచావో ఎలా చెప్తావు?",
  "real_world_mission": "గోడ దగ్గర లేదా తోటలో 5 నిమిషాలు కూర్చో. చీమలను చూడు. అవి ఎక్కడికి వెళ్తున్నాయి? ఏదైనా మోస్తున్నాయా?"
}
```

### Illustration prompts

**Cover image:**
> Children's book illustration, flat 2D vector style, soft warm pastel palette (peach, sky blue, mint green, butter yellow). A cheerful line of cartoon ants with big friendly eyes walking single file across sandy ground, heading toward a fallen slice of mango. Sky blue background with a few soft clouds. Calm, inviting mood. Square 1:1. No text.

**Detail image:**
> Same style as above. Close-up of two ants nose-to-nose on the ground, with a colorful glowing trail of small dots between them showing the invisible smell trail. One ant points at the trail with its tiny leg. Warm, magical feel. Square 1:1. No text.

---

## 7. 2-week build plan

**Week 1: content + prototype**

- Day 1–2: Generate 5 facts end-to-end (text + Telugu + 2 images + 2 audios each). Refine your prompts as you go.
- Day 3–4: Generate 5 stories end-to-end.
- Day 5: SvelteKit scaffolding — language picker, home, list, viewer screens. Hardcoded JSON for now.
- Day 6: Polish: fonts, colors, animations (page transitions, audio sync).
- Day 7: First test with Geethadhya on your laptop browser. Observe silently.

**Week 2: package + iterate**

- Day 8: Fix what was broken on day 7. Probably: text too small, audio too fast, hard-to-tap buttons.
- Day 9: Capacitor wrapper → APK for Android tablet.
- Day 10: Install on tablet. Test with Geethadhya there.
- Day 11–12: Generate 5 more facts + 5 more stories based on what topics she asked about.
- Day 13–14: Show to 3 other families (one urban, one rural-adjacent if possible). Observe.

End of week 2: you know whether the format works, what content style she replays, whether Telugu audio quality is good enough, and what feature she keeps asking for (that's your Phase 2).

---

## 8. Validation: what to watch with Geethadhya

Don't ask "did you like it?" — kids say yes to everything. Watch:

- **Does she replay a story or fact?** Re-listening = real love. Once-and-done = polite.
- **Does she retell it 24 hours later?** Without prompting at dinner = the content stuck.
- **Does she do the real-world mission?** Even partially. This is the highest-value signal.
- **Does she ask follow-up questions?** "But why do ants...?" = curiosity engine is working.
- **Where does she lose attention?** Note the exact second she swipes away or wanders off. That section needs rewriting.
- **Does she pick Telugu or English?** Whichever she picks naturally is the language she absorbs best. Use that learning for the next 10 pieces.

Log every session in a simple notes app. After 10 sessions, patterns will emerge.

Things to NOT optimize for in this phase:
- How long she spends in the app (long ≠ good)
- How many pieces she "completes"
- Whether she opens the app daily

Curiosity is the metric. Time is not.

---

## Open questions to decide soon

- **First 10 fact topics**: confirm the list above or swap any?
- **First 10 story themes**: courage, kindness, curiosity, honesty, sharing — which 10 first?
- **Telugu narration voice**: you/Badanika record vs Google TTS — which do you want for v1?
- **App name**: CurioKids is working name. Telugu name worth considering for the rural arm (e.g., "ఎందుకు?" / "Enduku?" / "తెలుసుకో" / "Telusuko"). Decide before Capacitor build (changes package ID).