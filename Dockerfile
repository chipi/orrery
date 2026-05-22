# Pipeline-runner image (RFC-024 / ADR-064).
#
# The web tier does NOT use a Dockerfile — it's plain `nginx:alpine` with
# bind-mounted ./build (already produced by the host's `npm run build`)
# and ./static/data. See docker-compose.yml.
#
# This image carries just the Node + tsx + system-gdal stack needed for
# on-demand pipeline invocations:
#   docker compose run --rm pipeline-runner scripts/fetch-launches.ts
#
# Built lazily — `docker compose build pipeline-runner` only on first use,
# or when the user explicitly runs `npm run docker:build`.

FROM node:20-bookworm-slim

# gdal-async + sharp + canvas need glibc + system libs at install time.
# We install ALL system deps up front so npm ci can compile native
# bindings against them in one cached layer.
RUN apt-get update && apt-get install -y --no-install-recommends \
      libgdal-dev gdal-bin \
      python3 build-essential \
      ca-certificates curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

# Install node_modules into the image. Source is bind-mounted at
# runtime from host (`-v .:/repo:ro` in docker-compose.yml), so script
# edits don't need a rebuild.
COPY package.json package-lock.json ./
RUN npm ci

# tsx entrypoint so invocations look like
#   docker compose run --rm pipeline-runner scripts/fetch-launches.ts
ENTRYPOINT ["npx", "tsx"]
