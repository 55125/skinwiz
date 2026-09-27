# SkinWiz

Patient-facing tool: skin concern → active ingredient → OTC product, monetized via affiliate links.

## Constraints
- Must not constitute practice of medicine (no diagnosis, no Rx guidance)
- Solo build
- Dual-rating model under consideration: board-certified dermatologist score + user/audience score

## Stack
- Next.js (App Router) + TypeScript + Tailwind + shadcn/ui — see [app/](app/)
- Drizzle ORM, SQLite locally / Postgres (Supabase or Neon) at deploy
- Data: openFDA-sourced concern→active ingredient→product catalog, see [tools/](tools/)

## Status
First-pass MVP web app built — see [project.md](project.md) and [app/README.md](app/README.md).
Pre-launch: no affiliate account, no dermatologist panel, no legal review yet.
