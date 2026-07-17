#!/usr/bin/env bash
#
# cleanup-worktree.sh — clean the house after an agent finishes work.
#
# Kills dev servers, test runners, and automation browsers that were started
# while working in THIS git worktree, and nothing else. The moment you're done
# deploying / testing / comparing, run this so the next session starts from a
# quiet machine (see AGENTS.md "Clean up after yourself").
#
# ISOLATION BOUNDARY — the worktree path (git rev-parse --show-toplevel).
# In the treehouse model that boundary is 1:1 with one worktree = one agent =
# one shell, so scoping to the worktree scopes to this agent. Attribution is by
# process CWD (not by name), so parallel worktrees / agents / shells are never
# touched — even other Orrery checkouts. The ONLY thing that could span
# worktrees is an orphaned automation browser (see Path B) — that is opt-in and
# OFF by default precisely to keep this strictly single-worktree.
#
# SCOPE — what the DEFAULT run kills (and only this):
#   A. Any dev/test process (vite, npm run dev/preview, vitest, playwright,
#      svelte-kit, esbuild) whose CWD is inside this worktree — plus every
#      descendant process it spawned (its browsers, renderers, workers).
#
# OPT-IN (--orphans) — additionally kills:
#   B. Orphaned automation browsers: chrome-headless-shell / chromium on a temp
#      `playwright_*profile`, reparented to launchd (ppid 1). These are NOT
#      attributable to any worktree (cwd is `/`), so by default they are only
#      REPORTED, never killed. Pass --orphans only when you know the orphan is
#      yours and no other agent is mid-playwright-run.
#
# NEVER killed — hard guarantees, even with --orphans:
#   * Anything whose CWD is a DIFFERENT worktree or project (parallel agents,
#     e.g. orrery-fixes, podcast_scraper — attributed by CWD, not by name).
#   * Your real browser: any Chrome/Chromium using the default
#     "Library/Application Support/Google/Chrome" profile, or Claude Desktop.
#   * lean-ctx / MCP servers / language servers that live in the tree.
#   * A LIVE playwright run anywhere (its browsers have a live parent, so they
#     are not orphans; and their runner's cwd, if not ours, is never matched).
#   * This script itself and its parent shell.
#
# Usage:
#   bash scripts/cleanup-worktree.sh              # kill Path A, report Path B
#   bash scripts/cleanup-worktree.sh --dry-run    # report only, kill nothing
#   bash scripts/cleanup-worktree.sh --orphans    # also kill unattributable orphans
#
set -uo pipefail

DRY=0
ORPHANS=0
for a in "$@"; do
  case "$a" in
    -n|--dry-run) DRY=1 ;;
    --orphans)    ORPHANS=1 ;;
    -h|--help)    sed -n '2,45p' "$0"; exit 0 ;;
    *) echo "usage: $0 [--dry-run] [--orphans]" >&2; exit 2 ;;
  esac
done

WT_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || {
  echo "cleanup-worktree: not inside a git worktree — refusing to run" >&2
  exit 1
}
SELF=$$

pid_cwd()  { lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -1; }
pid_cmd()  { ps -p "$1" -o command= 2>/dev/null; }
pid_ppid() { ps -p "$1" -o ppid= 2>/dev/null | tr -d ' '; }

# recursively echo all descendant pids of $1
descendants() {
  local p="$1" c
  for c in $(pgrep -P "$p" 2>/dev/null); do
    echo "$c"
    descendants "$c"
  done
}

is_protected_cmd() {
  case "$1" in
    *"Library/Application Support/Google/Chrome"*) return 0 ;;  # your real Chrome
    *"Library/Application Support/Claude"*)        return 0 ;;  # Claude Desktop
    *lean-ctx*|*mcp*|*language-server*|*tsserver*|*copilot*) return 0 ;;
  esac
  return 1
}

# is $1 exactly this worktree, or strictly inside it?  (trailing-slash discipline
# prevents a sibling like ".../orrery-fixes" from matching ".../orrery")
in_worktree() {
  case "$1" in
    "$WT_ROOT"|"$WT_ROOT"/*) return 0 ;;
    *) return 1 ;;
  esac
}

owned=()        # Path A: cwd inside this worktree, + descendants
orphan_roots=() # Path B: unattributable orphaned automation browsers

# ── A. runners whose cwd is inside this worktree, + their descendants ─────────
for pid in $(pgrep -f 'vite|playwright|vitest|esbuild|svelte-kit|npm run dev|npm run preview' 2>/dev/null | sort -un); do
  [ "$pid" = "$SELF" ] && continue
  cmd="$(pid_cmd "$pid")"
  is_protected_cmd "$cmd" && continue
  if in_worktree "$(pid_cwd "$pid")"; then
    owned+=("$pid")
    for d in $(descendants "$pid"); do owned+=("$d"); done
  fi
done

# ── B. orphaned automation browsers (ppid 1) — UNATTRIBUTABLE, report-only ────
for pid in $(pgrep -f 'chrome-headless-shell|playwright_.*profile|chromium.*--headless' 2>/dev/null | sort -un); do
  cmd="$(pid_cmd "$pid")"
  is_protected_cmd "$cmd" && continue
  case "$cmd" in
    *chrome-headless-shell*|*playwright_*profile*) ;;
    *) continue ;;
  esac
  [ "$(pid_ppid "$pid")" = "1" ] || continue   # only truly abandoned ones
  orphan_roots+=("$pid")
done

# ── build the kill list (Path A always; Path B only with --orphans) ──────────
declare -a candidates=()
[ "${#owned[@]}" -gt 0 ] && candidates+=("${owned[@]}")
if [ "$ORPHANS" = "1" ] && [ "${#orphan_roots[@]}" -gt 0 ]; then
  for pid in "${orphan_roots[@]}"; do
    candidates+=("$pid")
    for d in $(descendants "$pid"); do candidates+=("$d"); done
  done
fi

kill_list=()
if [ "${#candidates[@]}" -gt 0 ]; then
  while IFS= read -r pid; do
    [ -n "$pid" ] && [ "$pid" != "$SELF" ] && kill_list+=("$pid")
  done < <(printf '%s\n' "${candidates[@]}" | sort -un)
fi

echo "cleanup-worktree: $WT_ROOT"

# report unattributable orphans that we are deliberately NOT killing by default
if [ "$ORPHANS" = "0" ] && [ "${#orphan_roots[@]}" -gt 0 ]; then
  echo "── orphaned automation browsers (NOT this worktree's to claim) ─────────"
  for pid in "${orphan_roots[@]}"; do
    printf '  %-7s %s\n' "$pid" "$(pid_cmd "$pid" | cut -c1-84)"
  done
  echo "  ↳ unattributable to any worktree — left alone. Pass --orphans to reap."
fi

if [ "${#kill_list[@]}" -eq 0 ]; then
  echo "── nothing running for this worktree — house is already clean"
  exit 0
fi

echo "── targets ─────────────────────────────────────────────────────────────"
for pid in "${kill_list[@]}"; do
  printf '  %-7s %s\n' "$pid" "$(pid_cmd "$pid" | cut -c1-90)"
done

if [ "$DRY" = "1" ]; then
  echo "── dry-run: nothing killed ────────────────────────────────────────────"
  exit 0
fi

echo "── killing (SIGTERM → SIGKILL) ────────────────────────────────────────"
kill -TERM "${kill_list[@]}" 2>/dev/null
sleep 2
survivors=()
for pid in "${kill_list[@]}"; do
  kill -0 "$pid" 2>/dev/null && survivors+=("$pid")
done
if [ "${#survivors[@]}" -gt 0 ]; then
  kill -KILL "${survivors[@]}" 2>/dev/null
  sleep 1
fi

remaining=0
for pid in "${kill_list[@]}"; do
  kill -0 "$pid" 2>/dev/null && { remaining=1; printf '  STILL ALIVE: %-7s %s\n' "$pid" "$(pid_cmd "$pid")"; }
done
if [ "$remaining" = "0" ]; then
  echo "cleanup-worktree: done — ${#kill_list[@]} process(es) cleared, house is clean"
else
  echo "cleanup-worktree: some processes survived SIGKILL (see above)" >&2
  exit 1
fi
