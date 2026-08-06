# Build Bharat AI City 🏙️

Mobile-first arcade game for the Bharat AI Summit. Players get a fictional
₹100 Cr grant, pick 3 AI sectors, play the same reskinnable arcade
mini-game 3 times, get an AI-generated startup each round, watch their city
rise, and land on a shareable Founder Card + live leaderboard.

## Stack

Next.js (App Router) · React · TypeScript · Tailwind CSS v4 · Framer Motion ·
Canvas 2D game engine · Zustand · Supabase (realtime leaderboard) ·
Anthropic API (startup generation, with an offline fallback generator).

## Local setup

```bash
npm install
cp .env.local.example .env.local   # fill in Supabase + Anthropic keys
npm run dev
```

Open http://localhost:3000 on your phone (or resize your browser to mobile
width — the whole UI is designed for a portrait phone screen).

The game runs fully **without** any env vars configured:
- No `NEXT_PUBLIC_SUPABASE_*` → leaderboard screen shows an "offline" notice,
  rest of the game works normally.
- No `ANTHROPIC_API_KEY` → startup names/taglines come from the local
  template generator in `src/lib/startupTemplates.ts` instead of the LLM.

## One-time Supabase setup (for the live leaderboard)

1. Create a free project at https://supabase.com.
2. Open the SQL editor and run everything in `supabase.sql` at the repo root.
3. Copy the Project URL + `anon` public key into `.env.local` /
   your Vercel project's environment variables.
4. Realtime is enabled by the SQL script, so all ~1200 players see the
   leaderboard update live as scores are submitted.

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import it in Vercel, add the 3 env vars from `.env.local.example`.
3. Deploy. Generate a QR code pointing at the deployed URL for the summit
   screen.

No server/session state is needed beyond Supabase — the app is stateless per
request, so it scales horizontally to however many concurrent players show up.

## Architecture

Everything gameplay-related is data-driven — reskinning the arcade engine
for a new sector, or adding an 11th sector, means editing JSON only:

- `src/data/sectors.json` — theme colors, glyphs, collectibles, obstacles,
  powerups, and the problem/market/opportunity pools that get randomly
  rolled per mission.
- `src/data/events.json` — the random-event pool (title, flavor text, 2-3
  choices with score/valuation/speed/spawn-rate effects). Two events fire
  per 45s mission at ~14s and ~30s.
- `src/game/engine.ts` — the single arcade engine (5-lane falling-item
  collector) reused for all 10 sectors. Pure logic, no React/DOM — easy to
  unit test or swap rendering backends (e.g. PixiJS) later.
- `src/components/screens/*` — one component per game phase, orchestrated
  by the phase state machine in `src/lib/store.ts` and rendered from
  `src/app/page.tsx`.
- `src/lib/generateStartup.ts` + `src/app/api/generate-startup/route.ts` —
  calls Claude Haiku for creative startup fields (name/tagline/USP/stack/
  business model/founder archetype), with a 6s timeout and automatic
  fallback to `src/lib/startupTemplates.ts` if the LLM is slow, errors, or
  no key is configured. Valuation and citizens-impacted are always computed
  locally from arcade performance (`src/lib/scoring.ts`) so numbers stay
  meaningful even offline.
- `src/lib/leaderboard.ts` — composite ranking (innovation + impact +
  execution + originality + valuation + "budget efficiency") and a Supabase
  realtime hook.

## Game flow

`welcome → select (3 sectors) → [missionIntro → playing → generating →
missionResult] × 3 → cityReveal → founderCard → leaderboard`

Each mission run is 45 seconds: tap a lane to move, collect glyphs, dodge
obstacles, grab powerups (shield / 2x score / slow-mo / magnet), and make a
snap decision on 2 random events mid-run.
