# Repo-root Dockerfile (not app/-scoped) so the deployed container keeps
# tools/catalog_pipeline + tools/affiliate_feeds alongside app/ — app/src/db/seed.ts
# resolves those CSVs via a relative ../tools/... path, same as local dev.
# Duplicating the CSVs into app/ instead would risk them silently drifting
# out of sync with the pipeline that generates them.
# node:22, not 20 -- better-sqlite3@13 requires Node >=22 (an EBADENGINE
# warning on Node 20 during a real deploy attempt turned out not to be
# just a warning: the build segfaulted, presumably from an ABI mismatch
# in the native addon).
FROM node:22-bookworm-slim AS build

# build-essential + python3: better-sqlite3 compiles a native addon at
# install time; no prebuilt binary is guaranteed for every deploy target.
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo
COPY . .

WORKDIR /repo/app
# Skip Playwright's browser download during install -- it's a devDependency
# used only for local screenshot-based UI testing, not needed at runtime,
# and downloading it here just slows the build.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm ci
RUN npm run build

# Same base image as the build stage, so the better-sqlite3 addon compiled
# there loads here without a toolchain.
FROM node:22-bookworm-slim

WORKDIR /repo
COPY --from=build /repo /repo
WORKDIR /repo/app

# DATABASE_PATH should point at a mounted persistent volume in production
# (see src/db/client.ts) -- without one, data is lost on every redeploy.
ENV NODE_ENV=production
EXPOSE 3000

# db:migrate applies reviewed drizzle/ migrations (never auto-accepts
# destructive changes). db:seed reloads catalog/reference data in one
# transaction and never touches user tables (see seed.ts).
# enrich:pubchem is optional metadata (see src/db/enrich-pubchem.ts) --
# `|| true` so a PubChem outage or network hiccup at boot can never block
# the app from starting, unlike db:migrate/db:seed which the app actually
# needs. Idempotent (skips actives already in active_chem_data), so this
# is a no-op after the first successful run.
CMD npm run db:migrate && npm run db:seed && (npm run enrich:pubchem || true) && npm start
