/**
 * S4 AiVerse — Cartoon Avatar Relay (Cloudflare Worker)
 * ------------------------------------------------------
 * The AiVerse page sends an uploaded photo here; this worker calls OpenAI's
 * image model with a locked cartoon-style prompt and returns the drawing.
 * The OpenAI API key lives ONLY here (Worker secret), never in the page.
 *
 * Deploy (once):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker → paste this file.
 *   2. Worker → Settings → Variables and Secrets → Add → type "Secret",
 *      name OPENAI_API_KEY, value = your OpenAI key → Deploy.
 *   3. Copy the worker URL (https://<name>.<account>.workers.dev) into
 *      AVATAR_API_URL in the AiVerse index.html.
 */

const STYLE_PROMPT =
  "Redraw this exact person as a premium cartoon portrait: clean vector-style " +
  "illustration, bold dark ink outlines, warm cel shading, friendly confident " +
  "expression, head-and-shoulders composition. Keep a strong likeness — same " +
  "face shape, hairstyle, hair color, skin tone, eyewear and clothing. " +
  "Background: vibrant deep-blue cosmic swirl with white light streaks " +
  "(brand blues #0096FF and #002F5F). No text, no watermark.";

/* Browsers allowed to call this relay. Add your custom domain when it goes live. */
const ALLOWED_ORIGINS = [
  "https://rwallace3243-boop.github.io",
  "https://aiverse.synergies4.com",
  "http://localhost",
  "http://127.0.0.1",
  "null", // file:// testing
];

const okOrigin = (o) => ALLOWED_ORIGINS.some((a) => (o || "").startsWith(a)) || o === "null";

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": okOrigin(origin) ? origin || "*" : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}

const json = (obj, status, cors) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get("Origin"));
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (req.method !== "POST") return json({ error: "POST only" }, 405, cors);
    if (!okOrigin(req.headers.get("Origin"))) return json({ error: "origin not allowed" }, 403, cors);

    try {
      const { image } = await req.json(); // data URL from the page (jpeg/png, ≤ ~2MB)
      if (!image || typeof image !== "string" || image.length > 4_000_000)
        return json({ error: "missing or oversized image" }, 400, cors);

      const m = image.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
      if (!m) return json({ error: "expected a base64 image data URL" }, 400, cors);
      const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));

      const form = new FormData();
      form.append("model", "gpt-image-1");
      form.append("image", new File([bytes], "photo." + m[1].split("/")[1], { type: m[1] }));
      form.append("prompt", STYLE_PROMPT);
      form.append("size", "1024x1024");
      form.append("quality", "medium"); // "high" looks better, costs more, is slower

      const r = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}` },
        body: form,
      });
      const data = await r.json();
      if (!r.ok) return json({ error: data?.error?.message || "image model error" }, 502, cors);

      return json({ image: "data:image/png;base64," + data.data[0].b64_json }, 200, cors);
    } catch (e) {
      return json({ error: String(e) }, 500, cors);
    }
  },
};
