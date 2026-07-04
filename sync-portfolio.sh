#!/bin/bash
# Builds the app and syncs it to the Portfolio repo's dart-scores/ folder.
# Run from the Dart-Scores repo root. Mirrors Versed's sync-portfolio.sh.
#
# Portfolio isn't a sibling directory of this repo on this machine (Dart-Scores
# lives under the iCloud-synced NTNU/GitHub folder, Portfolio under
# ~/Documents/GitHub) - override PORTFOLIO_DIR if yours lives elsewhere.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORTFOLIO_DIR="${PORTFOLIO_DIR:-$HOME/Documents/GitHub/Portfolio}"
DEST="$PORTFOLIO_DIR/dart-scores"

echo "Building..."
cd "$SCRIPT_DIR"
npm run build -- --base=/dart-scores/

echo "Syncing to Portfolio..."
rm -rf "$DEST"
cp -r "$SCRIPT_DIR/dist" "$DEST"

echo "Committing Portfolio..."
cd "$PORTFOLIO_DIR"
git add dart-scores/
git diff --staged --quiet || git commit -m "chore: sync Dart Scores"
git push

echo "Done. joavn.dev/dart-scores updated."
