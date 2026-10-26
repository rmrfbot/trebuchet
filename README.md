# Trebuchet Project

Initial project structure for the interactive physics trebuchet website. Application code and Cloudflare configuration are intentionally not included in this scaffold.

## Structure

- `public/` — frontend files generated separately.
- `src/worker.js` — planned Cloudflare Worker entry point.
- `src/routes/` — planned API route handlers.
- `src/services/` — planned AI, experiment, and analysis integrations.
- `src/validation/` — planned request validation.
- `src/shared/` — planned shared physics types and calculations.
- `migrations/` — planned database migrations.
- `tests/` — planned backend tests.

## Planned platform

Cloudflare Workers for the API, with D1 for experiment records and R2 for uploaded media if needed. Video/image analysis and AI processing will be selected during implementation.
