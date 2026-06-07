# CurioKids — Project Instructions for Claude Code

> Place this file at the **root of the curiokids/ project**. Claude Code reads it automatically every session.

## Mission

Build a calm, hybrid-offline curiosity app for children aged 5–8, starting with my daughter Geethadhya (age 7) as the first user. The app has three content modes:
1. **Nature facts** (Pillar 2) — hand-curated, bundled in app, fully offline
2. **Curated stories** (Pillar 1A) — hand-curated, bundled in app, fully offline
3. **Generated stories** (Pillar 1B) — child picks a character + theme, OpenAI generates a 5-page story with cover illustration. Requires network. Result cached locally for offline re-read.

Content is in **English and Telugu**. We are NOT building an engagement loop. We optimize for curiosity, replay, and follow-up questions — not screen time.

Full product strategy is in `docs/strategy.md`. **Always re-read it if you're unsure about scope.** If a request conflicts with the strategy, flag it before implementing.

## Hard scope rules

### Always
- Keep facts and curated stories **fully offline**. JSON, images, audio bundled in the app.
- Generated stories require network — but **fail gracefully** when offline (show friendly "we need wifi for this" screen with the curated stories highlighted instead).
- Cache every generated story to **localStorage** so the child can re-read it offline.
- Route all OpenAI calls through the **single serverless function** `/api/generate-story`. Never embed `OPENAI_API_KEY` in client code or commit it to git.
- Use **TypeScript** for all code (frontend and the serverless function).
- Use **Tailwind** for styling. No custom CSS files unless absolutely needed.
- Use **localStorage** for: language preference, list of completed content IDs, generated stories cache, daily generation count.
- Honor the **6-screen UX**: splash → language picker → home → content list → content viewer → story creator. No new screens without my approval.
- Use **large fonts** (min 22pt on content screens) and **large tap targets** (min 64×64 px).
- Use **Noto Sans Telugu** for Telugu text, bundled in `static/fonts/`.
- **Rate limit story generation**: max 3 per device per day. Check localStorage `generationsToday` + date before allowing.

### Never
- Never add a database, auth, user accounts, or login screen.
- Never call OpenAI directly from the browser. Always proxy via `/api/generate-story`.
- Never embed `OPENAI_API_KEY` in the bundle or commit it. Use `.env` + Vercel env vars only.
- Never add analytics, tracking, ads, notifications, or external SDKs.
- Never add a settings page with more than language reset.
- Never add infinite scroll, badges, streaks, points, leaderboards, or any gamification.
- Never assume the parent is present. The child operates the app alone.
- Never auto-translate curated content between English and Telugu. Each language has its own hand-crafted JSON. (Generated stories are an exception — the OpenAI prompt specifies the language directly.)

## Tech stack (locked)

- **Framework**: SvelteKit (Svelte 5 + runes) + TypeScript
- **Styling**: Tailwind CSS
- **State**: Svelte stores + localStorage only
- **Audio**: native HTML `<audio>` element
- **Build target Phase 1**: web (works on any browser, install as PWA)
- **Build target Phase 2**: Capacitor wrapper → Android APK first, iOS later
- **Hosting (web)**: Vercel
- **Backend**: a single Vercel Edge Function at `src/routes/api/generate-story/+server.ts`. It accepts `{character, theme, childName, language}`, calls OpenAI, returns the generated story JSON + a DALL-E cover image URL. No DB, no queue, no other endpoints.
- **AI**: OpenAI `gpt-4o-mini` for story text (cheap, fast, good enough). OpenAI `dall-e-3` for cover image. Use `gpt-4o` only if `mini` quality is visibly bad in testing.
- **No** Supabase, no Firebase, no other backend services. The serverless function is the entire backend.

## Folder structure

```
curiokids/
  src/
    routes/
      +layout.svelte
      +page.svelte                  # home (3 cards: Stories, Why?, Create)
      language/+page.svelte         # language picker
      facts/+page.svelte             # fact grid
      facts/[id]/+page.svelte        # fact viewer
      stories/+page.svelte           # curated + generated stories grid
      stories/[id]/+page.svelte      # story viewer
      create/+page.svelte            # story creator: character + theme + name
      create/generating/+page.svelte # loading screen while OpenAI responds
      api/
        generate-story/+server.ts    # the only backend endpoint
    lib/
      components/
        ContentCard.svelte
        AudioPlayer.svelte
        SectionRenderer.svelte
        CharacterPicker.svelte
        ThemePicker.svelte
      stores/
        language.ts                  # language preference
        progress.ts                  # completed content IDs
        generatedStories.ts          # cached generated stories + daily count
      data/
        loadContent.ts               # reads JSON files
        characters.ts                # the 6 animal hero definitions
        themes.ts                    # the 4 theme definitions
      server/
        openaiClient.ts              # server-only OpenAI wrapper
        storyPrompt.ts               # prompt builder
      types.ts                       # Fact, Story, GeneratedStory, Character, Theme
  static/
    content/
      facts/
        en/fact-001-ants.json
        te/fact-001-ants.json
      stories/
        en/story-001-bunny.json
        te/story-001-bunny.json
    images/
      facts/fact-001.png
      stories/story-001-cover.png
      characters/
        rabbit.png                   # character avatars, used as fallback in generated stories
        peacock.png
        elephant.png
        monkey.png
        tortoise.png
        parrot.png
    audio/
      facts/fact-001-en.mp3
      facts/fact-001-te.mp3
    fonts/
      NotoSansTelugu-Regular.ttf
      NotoSansTelugu-Bold.ttf
  docs/
    strategy.md                      # the full product strategy
  .env                               # OPENAI_API_KEY — gitignored
  .env.example                       # template, committed
  CLAUDE.md                          # this file
```

## Content schema (do not change without my approval)

### Fact JSON

```ts
type Fact = {
  id: string;                      // "fact-001"
  type: "nature_fact";
  language: "en" | "te";
  topic: string;
  age_range: "5-8";
  title: string;
  cover_image: string;             // path relative to /static
  audio: string;
  sections: Array<
    | { type: "question"; text: string; image: string }
    | { type: "discovery"; text: string; image: string }
    | { type: "fun_facts"; items: string[] }
    | { type: "lesson"; text: string }
  >;
  reflection_question: string;
  real_world_mission: string;
};
```

### Story JSON (curated)

```ts
type Story = {
  id: string;
  type: "story";
  source: "curated";
  language: "en" | "te";
  age_range: "5-8";
  theme: string;
  title: string;
  cover_image: string;
  audio: string;
  pages: Array<{ text: string; image: string }>;
  moral: string;
  reflection_question: string;
};
```

### GeneratedStory JSON (cached in localStorage)

```ts
type GeneratedStory = {
  id: string;                       // uuid generated client-side
  type: "story";
  source: "generated";
  language: "en" | "te";
  age_range: "5-8";
  character_id: string;             // "rabbit" | "peacock" | etc.
  theme_id: string;                 // "be_brave" | "help_friend" | etc.
  child_name: string | null;
  title: string;
  cover_image_url: string;          // DALL-E hosted URL — store, may expire after ~1 hour
  cover_image_data_uri: string;     // base64 data URI — what we actually render (offline-safe)
  pages: Array<{ text: string }>;   // no per-page images in MVP
  moral: string;
  reflection_question: string;
  created_at: string;               // ISO timestamp
};
```

### Character + Theme definitions (static, in `src/lib/data/`)

```ts
type Character = {
  id: "rabbit" | "peacock" | "elephant" | "monkey" | "tortoise" | "parrot";
  name_en: string;
  name_te: string;
  avatar: string;                   // path to character avatar image
  prompt_descriptor: string;        // detailed visual description for DALL-E consistency
  personality_hint: string;         // one-line trait for the AI text prompt
};

type Theme = {
  id: "be_brave" | "help_friend" | "find_lost" | "learn_new";
  label_en: string;
  label_te: string;
  goal_hint: string;                // one-line goal for the AI text prompt
};
```

## Visual style (locked)

- **Palette**: peach `#FFB89A`, sky blue `#A8D8EA`, mint `#B8E6C1`, butter yellow `#FFE4A3`, coral `#FF8B7B`. White background.
- **Typography**: Nunito for body, Fraunces for display. Noto Sans Telugu for Telugu. Bundled in `static/fonts`.
- **Tone**: calm, warm, soft. No bright reds, no flashing animations, no harsh shadows.
- **Animation**: only soft fades and page swipes. No bouncing, no popups, no confetti.
- **Icons**: lucide-svelte. Stroke width 1.5. Color matches palette.

## UX rules

- **Language picker shows once** on first launch, then never again unless user resets from settings.
- **Home screen** has exactly 3 cards: Stories, Why? (Facts), Create. Nothing else.
- **Content list** is a vertical scrolling grid (2 columns on mobile, 3 on tablet). Each tile shows cover + title + ✓ if completed.
- **Stories grid** shows curated + generated stories together. Generated ones have a tiny "✨" badge.
- **Story creator** is one screen: 6 character cards on top, 4 theme cards in middle, optional name input at bottom, big "Make my story" button. No multi-step wizard.
- **Generating screen**: shows the chosen character avatar with a soft pulse animation + a Telugu/English line like "నీ కథ సిద్ధం అవుతోంది..." / "Your story is coming...". No spinner — use the character.
- **Generation failure**: if offline or API error, show the chosen character with a sad-but-cute look and "Let's try after wifi comes back!" with a button back to home.
- **Content viewer** auto-plays audio when the screen opens (curated only — generated stories have no audio in MVP). Big play/pause button at bottom center.
- **Swipe gestures**: right = next section/page, left = previous, X top-right = back to list.
- **"Done!" button** at end of content marks the ID as completed (localStorage) and returns to grid.
- **No loading spinners for cached content**. The only loading state is during story generation (which has the character animation).

## Character set (MVP — locked)

These 6 hero animals + 4 themes are the entire creator surface area. Don't add more without my approval.

**Characters:**
1. `rabbit` — Mishti (curious, gentle)
2. `peacock` — Neelu (proud, loves to dance)
3. `elephant` — Ganga (kind, strong, never forgets)
4. `monkey` — Bandhu (clever, mischievous)
5. `tortoise` — Dheera (patient, wise, slow)
6. `parrot` — Mitthu (talkative, observant)

**Themes:**
1. `be_brave` — facing something scary
2. `help_friend` — helping someone in trouble
3. `find_lost` — searching for something missing
4. `learn_new` — discovering something new about the world

Each character has a locked `prompt_descriptor` that DALL-E uses for visual consistency across generations. **Never modify these descriptors without regenerating reference images** — character continuity matters.

## Backend: `/api/generate-story` contract

**Request:**
```ts
POST /api/generate-story
{
  character_id: "rabbit" | "peacock" | "elephant" | "monkey" | "tortoise" | "parrot";
  theme_id: "be_brave" | "help_friend" | "find_lost" | "learn_new";
  child_name: string | null;        // optional; if provided, substituted into story
  language: "en" | "te";
}
```

**Response (200):**
```ts
{
  story: GeneratedStory             // see schema above
}
```

**Response (4xx/5xx):**
```ts
{
  error: "rate_limit" | "invalid_input" | "openai_failed" | "server_error";
  message: string;                  // kid-friendly message frontend can display
}
```

**Server-side rules:**
- Validate `character_id` and `theme_id` against the locked enum. Reject unknown values.
- Build the prompt server-side using `storyPrompt.ts`. Never accept arbitrary prompts from the client.
- Call OpenAI with `response_format: { type: "json_object" }` to guarantee parseable output.
- After text generation, call DALL-E for the cover image with the character's `prompt_descriptor` + scene from page 1.
- Convert DALL-E URL to base64 data URI before returning (so the frontend can cache offline).
- Total budget per call: ~₹5–7. If costs exceed ₹500/month across all users, throttle harder.
- No logging of personal info. `child_name` is used to build the prompt and discarded — never written to logs.

**Story length constraints (enforce in prompt):**
- Exactly **5 pages**.
- Each page: **30–50 words**. Total story body: **150–250 words**.
- Title: max 8 words.
- Moral: 1 sentence, max 15 words.
- Reflection question: 1 open-ended question, max 15 words.
- Language: simple, read-aloud-friendly. Sentences max 12 words. Active voice. No subordinate clauses.
- The prompt should instruct OpenAI to reject its own output if it exceeds these limits and rewrite shorter.

## Telugu-specific rules

- Telugu content is stored in separate JSON files under `static/content/*/te/`. Never auto-translate from English.
- Use `lang="te"` attribute on all Telugu text containers for proper line-breaking and rendering.
- Test Telugu rendering on Android (older versions render Indic fonts poorly) — never assume system fonts work. Always use bundled Noto Sans Telugu.
- Telugu line height should be **1.6** (Devanagari/Telugu glyphs are taller than Latin).

## Naming conventions

- Components: `PascalCase.svelte`
- Stores, utils, types: `camelCase.ts`
- Content files: `fact-001-ants.json`, `story-001-bunny.json` (kebab-case, prefixed with type and ID)
- Image files match content ID: `fact-001.png`, `fact-001-detail.png`
- Audio files match content ID with language suffix: `fact-001-en.mp3`, `fact-001-te.mp3`

## Working with Claude Code

- **Always re-read** `docs/strategy.md` and this file at the start of a new session if working on anything non-trivial.
- **Use plan mode** for any change that touches more than one file. Show me the plan before writing code.
- **Commit after every working feature.** Commit message format: `feat: <short>`, `fix: <short>`, `chore: <short>`.
- **One feature per session.** Don't bundle unrelated changes.
- **Ask before** adding any dependency. Justify why it can't be done with built-in Svelte/Tailwind.
- **Don't write content** (no facts, no stories, no Telugu translations). Content is generated by me outside this codebase.
- **When stuck**, ask a clarifying question rather than guessing. I'd rather answer one question than revert your work.

## Commands

```bash
npm run dev          # local dev server
npm run build        # production build
npm run preview      # preview production build
npm run check        # svelte-check + tsc
npm run lint         # eslint
npm run format       # prettier
```

## Out of scope (do not propose, do not build)

- User accounts, profiles, multi-user
- Database (the only persistence is localStorage)
- Quiz / mission tracker UI
- Parent dashboard / discussion prompts UI
- Sharing, social, library of others' generated stories
- Push notifications, email, marketing
- Subscriptions, payments, ads
- Voice recording by the child
- Speech-to-text
- Analytics of any kind
- Per-page DALL-E images for generated stories (cover only in MVP)
- Audio narration for generated stories (text only in MVP — curated stories have audio)
- Custom character creation by the child (locked to the 6 animals)
- Custom theme entry (locked to the 4 themes)

If a feature request touches any of the above, **stop and ask me** before implementing.

## Open decisions

These are not decided yet — flag if relevant to your work and I'll choose:

- App display name (CurioKids / తెలుసుకో / ఎందుకు?)
- Bundle identifier for Capacitor (will affect package ID — get this right before first Android build)
- Whether Telugu narration is recorded human voice or TTS
- Whether to support Hindi as a third language in Phase 1 or wait
- Whether generated stories should be saveable to a "My Stories" tab separately from curated ones, or mixed in the same grid (current default: mixed with ✨ badge)
- Whether to add server-side rate limiting (Vercel KV) before opening to anyone outside the family

---

_Last updated: 2026-06-07. Update this file whenever a scope decision changes._