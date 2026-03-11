#!/usr/bin/env bash
# Pushes docs/wiki/* to the GitHub Wiki repo.
# Run this ONCE after you've initialized the wiki via the GitHub web UI.
#
# Usage:
#   bash scripts/push-wiki.sh

set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WIKI_DIR="$REPO_ROOT/docs/wiki"
TMP_DIR="$(mktemp -d)"

echo "Cloning wiki repo..."
git clone https://github.com/serrazon/copilot-cockpit.wiki.git "$TMP_DIR"

echo "Copying wiki pages..."
cp "$WIKI_DIR"/Home.md              "$TMP_DIR/Home.md"
cp "$WIKI_DIR"/Getting-Started.md   "$TMP_DIR/Getting-Started.md"
cp "$WIKI_DIR"/Windows-Setup.md     "$TMP_DIR/Windows-Setup.md"
cp "$WIKI_DIR"/Architecture.md      "$TMP_DIR/Architecture.md"
cp "$WIKI_DIR"/Configuration.md     "$TMP_DIR/Configuration.md"
cp "$WIKI_DIR"/Troubleshooting.md   "$TMP_DIR/Troubleshooting.md"

cd "$TMP_DIR"
git add -A
git diff --cached --quiet && echo "No changes to push." && exit 0

git commit -m "docs: sync wiki from docs/wiki/"
git push

echo ""
echo "Wiki updated: https://github.com/serrazon/copilot-cockpit/wiki"
rm -rf "$TMP_DIR"
