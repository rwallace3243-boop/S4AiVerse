# AiVerse Real Cartoon Avatars — Setup Guide (one-time, ~30 min)

Goal: when someone uploads a photo, an AI image model redraws them as a true
illustrated cartoon (like Rob's example portrait) instead of the browser filter.

Three pieces, in order:

## Step 1 — OpenAI API key (~10 min)

1. Go to **platform.openai.com** and sign in (or create an account — this is
   separate from a ChatGPT subscription).
2. Left menu → **Settings → Billing** → add a payment method. Add a small
   prepaid amount, e.g. **$10** (each avatar costs about 4–7¢, so $10 ≈ 150–250
   avatars). Recommended: set a **monthly budget limit** ($10–20) on the same
   page so a surprise bill is impossible.
3. Left menu → **API keys** → **Create new secret key**. Name it
   `aiverse-avatars`. **Copy the key now** (starts with `sk-…`) — it's shown
   only once. Keep it somewhere safe; you'll paste it once in Step 2.
4. One-time verification: OpenAI requires organization verification for the
   image model (`gpt-image-1`). Settings → **Organization → General** → if you
   see a "Verify organization" button, complete it (ID check, a few minutes).

## Step 2 — Cloudflare Worker relay (~15 min, free)

Why: your site is a public static page, so the key can't live in it — anyone
could steal it. This tiny relay holds the key and does the OpenAI call.

1. Go to **dash.cloudflare.com** → create a free account (email + password).
2. Left menu → **Workers & Pages** → **Create** → **Create Worker**.
   Name it `luma-avatar` → **Deploy** (it deploys a hello-world first).
3. Click **Edit code**, delete everything, and paste the full contents of
   **`luma-avatar-worker.js`** (delivered alongside this guide) → **Deploy**.
4. Back on the worker page → **Settings → Variables and Secrets** →
   **Add** → Type: **Secret** → Name: `OPENAI_API_KEY` → Value: your `sk-…`
   key from Step 1 → **Deploy**.
5. Copy the worker's URL — it looks like
   `https://luma-avatar.<your-account>.workers.dev`

## Step 3 — Tell the site about the relay (~2 min)

Option A (easiest): **send me the worker URL** in chat — I'll build the next
AiVerse version with it baked in and commit it to your repo.

Option B (yourself): open `index.html` in the repo, find near the middle:

```js
const AVATAR_API_URL = '';
```

and paste the URL between the quotes:

```js
const AVATAR_API_URL = 'https://luma-avatar.YOURACCOUNT.workers.dev';
```

Commit + push. Done.

## How it behaves after setup

- Upload photo → "**Luma is drawing you…**" (5–20 seconds) → a real cartoon
  portrait with ink outlines, cel shading, and the S4 cosmic-blue background
  becomes your sun at the center of the universe.
- If the relay is unreachable (offline, out of credit, etc.) the page quietly
  falls back to the local cartoon filter, so onboarding never breaks.
- The style is locked in the worker's `STYLE_PROMPT` — tweak the wording there
  any time to change the art direction (no site change needed).

## Costs & guardrails

- ~4–7¢ per avatar ("medium" quality; "high" in the worker costs ~2× and looks
  a bit better). No monthly fee; you pay only per image.
- Cloudflare free tier: 100,000 requests/day — effectively unlimited for this.
- The worker only accepts calls from your site's domains (github.io + the
  future aiverse.synergies4.com — edit `ALLOWED_ORIGINS` in the worker to add
  domains). Note: this deters casual abuse but isn't bulletproof; the OpenAI
  monthly budget limit from Step 1 is the real safety net.

## Privacy note (worth stating on the site later)

With the relay on, uploaded photos are sent to the relay and to OpenAI to be
redrawn, then discarded by the page (nothing is stored server-side by the
worker). The old filter path kept everything in the browser — if that promise
appears anywhere in copy, it needs a caveat once the relay is live.
