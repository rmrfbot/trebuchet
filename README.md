# Trebuchet Project

Interactive physics trebuchet website with a Cloudflare Worker API for AI prompt interpretation.

## Structure

- `public/` — website frontend.
- `src/worker.js` — Cloudflare Worker entry point and prompt API.
- `src/routes/` — additional API route handlers.
- `src/services/` — planned AI, experiment, and analysis integrations.
- `src/validation/` — planned request validation.
- `src/shared/` — planned shared physics types and calculations.
- `migrations/` — planned database migrations.
- `tests/` — planned backend tests.

## Cloudflare deployment

Install dependencies with `npm install`, preview locally with `npm run dev`, run API tests with `npm test`, and deploy with `npm run deploy`. Build hooks compile and minify the Tailwind stylesheet before local preview and deployment. The Worker serves `public/` and routes `POST /api/parse` through Cloudflare Workers AI. The `AI` binding is declared in `wrangler.toml`; no browser-side AI key is needed.

D1 for experiment records and R2 for uploaded media can be added later. Video/image analysis and OpenCV hosting remain undecided.
