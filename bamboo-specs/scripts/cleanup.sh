#!/bin/bash

# Cleanup script that preserves specified artifacts before wiping the workspace.
# Usage: ./cleanup.sh "artifact1,artifact2,artifact3"
#   or   ./cleanup.sh   (no args — wipes entire workspace)
#
# WARNING: This script wipes the ENTIRE workspace including .git.
# It must ONLY run inside a Bamboo CI environment (disposable agent workspace).

# -e: Exit immediately if any command exits with a non-zero status.
# -x: Print each command to the terminal as it is executed.
set -ex

# Fix mixed logs
exec 2>&1

# CI guard — refuse to run outside Bamboo to prevent accidental local execution
# (where `find . -mindepth 1 ... rm -rf` would destroy the working tree).
if [[ -z "${bamboo_buildNumber:-}" ]]; then
    echo "ERROR: this script must only run in a Bamboo CI environment" >&2
    exit 1
fi

echo "Size before cleanup:" && du -sh .
echo "Top 5 files:" && du -h | sort -hr | head -n 5

# Parse artifacts from command line argument
ARTIFACTS_ARG="${1:-}"
if [ -z "$ARTIFACTS_ARG" ]; then
    echo "No artifacts specified, cleaning entire workspace"
    ARTIFACTS=()
else
    IFS=',' read -ra ARTIFACTS <<< "$ARTIFACTS_ARG"
    echo "Preserving artifacts: ${ARTIFACTS[*]}"
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Stash artifacts to /tmp
for f in "${ARTIFACTS[@]}"; do
    [ -e "$f" ] || continue
    echo "Stashing artifact: $f"
    mkdir -p "$TMP/$(dirname "$f")"
    mv "$f" "$TMP/$f"
done

# Verify this is the expected repository workspace before wiping
if [[ ! -f "package.json" ]] || [[ ! -d "bamboo-specs" ]]; then
    echo "ERROR: current directory does not look like the dead-domains-linter workspace" >&2
    echo "pwd: $PWD" >&2
    exit 1
fi
echo "Workspace verified: $PWD"

# Intentionally wipe the entire workspace (including .git).
# This runs only in Bamboo disposable agent workspaces — the goal is to
# guarantee a clean state after the build so no artifacts bleed into the
# next build on the same agent.
find . -mindepth 1 -maxdepth 1 -exec rm -rf -- {} +

# Restore artifacts
for f in "${ARTIFACTS[@]}"; do
    [ -e "$TMP/$f" ] || continue
    echo "Restoring artifact: $f"
    mkdir -p "$(dirname "$f")"
    mv "$TMP/$f" "$f"
done

echo "Size after cleanup:" && du -sh .
echo "Top 5 files:" && du -h | sort -hr | head -n 5

echo "Cleanup completed successfully"
