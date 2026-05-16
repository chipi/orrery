#!/usr/bin/env bash
#
# Regenerate Linux visual-regression baselines for tests/e2e/visual.spec.ts
# inside the official Playwright Docker image. The image's Chromium + font
# stack matches the GH Actions ubuntu-latest runner pixel-for-pixel, so the
# baselines this script writes are what CI will check against.
#
# Run this whenever a /credits, /library, or /science header layout
# changes — i.e. whenever the darwin baselines also need to be regenerated
# (via `npx playwright test tests/e2e/visual.spec.ts --update-snapshots`).
# Commit darwin and linux PNGs in the SAME change so the two never diverge.
#
# Requirements: Docker daemon running. Image is ~1.2 GB on first pull.
# Linux node_modules cached in .linux-node-modules/ (gitignored) so the
# host's darwin node_modules is never touched by the container.
#
# Tied to issue #132.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# Pin to the exact Playwright version in devDependencies; mismatches
# between the host @playwright/test and the image's bundled browsers
# produce subtle rendering differences that break the baseline.
PLAYWRIGHT_VERSION=$(node -p "require('./package.json').devDependencies['@playwright/test']")
IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"

# Host-side cache for the Linux node_modules. First run populates it
# (~60 s); subsequent runs reuse it (~3 s startup). Gitignored.
LINUX_MODULES="${REPO_ROOT}/.linux-node-modules"
mkdir -p "$LINUX_MODULES"

echo "▶ Regenerating Linux visual baselines via ${IMAGE}"
echo "  repo: ${REPO_ROOT}"
echo "  linux node_modules cache: ${LINUX_MODULES}"

# Two bind mounts:
#   • $REPO_ROOT → /repo                          (entire source tree)
#   • $LINUX_MODULES → /repo/node_modules         (overlays the host's darwin
#                                                  node_modules with the linux
#                                                  one — host untouched)
# --ipc=host avoids Chromium /dev/shm exhaustion under heavy parallelism.
# --user matches the host UID/GID so generated PNGs aren't root-owned.
docker run --rm \
  --ipc=host \
  --user "$(id -u):$(id -g)" \
  -v "$REPO_ROOT":/repo \
  -v "$LINUX_MODULES":/repo/node_modules \
  -w /repo \
  -e CI=true \
  -e HOME=/tmp \
  -e npm_config_cache=/tmp/.npm \
  "$IMAGE" \
  /bin/bash -c '
    set -e
    if [ ! -d node_modules/@playwright ]; then
      echo "▶ Linux node_modules missing — running npm ci (one-time, ~60 s)"
      npm ci --include=optional
    fi
    echo "▶ Building production bundle (vite preview needs build/)"
    npm run build
    echo "▶ Running visual.spec with --update-snapshots"
    npx playwright test tests/e2e/visual.spec.ts \
      --workers=1 \
      --update-snapshots
  '

echo "✓ Linux baselines written to tests/e2e/visual.spec.ts-snapshots/"
echo "  Verify with: git status tests/e2e/visual.spec.ts-snapshots/"
echo "  Commit alongside darwin PNGs."
