#!/usr/bin/env bash
#
# check-rtl.sh — reject physical-direction Tailwind utilities (DOSSIER_PLAN.md R7).
# Scans .tsx files under the target directory (default: src) and exits 1 on any
# banned class token: ml-* mr-* pl-* pr-* left-* right-* text-left text-right
# border-l* border-r* rounded-l* rounded-r* space-x-*.
#
# Usage: bash scripts/check-rtl.sh [target-dir]

set -u

TARGET="${1:-src}"

if [ ! -d "$TARGET" ]; then
  echo "check-rtl: target directory not found: $TARGET" >&2
  exit 1
fi

# Word-boundary-aware: token must start after line start, space, quote or backtick.
PATTERN_1="(^|[ \"'\`])(ml|mr|pl|pr|left|right)-[0-9a-z\[]"
# Explicit compound offenders.
PATTERN_2="(text-left|text-right|border-l|border-r|rounded-l|rounded-r|space-x-)"

STATUS=0

MATCHES="$(grep -rEn -e "$PATTERN_1" --include='*.tsx' "$TARGET" || true)"
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  STATUS=1
fi

MATCHES="$(grep -rEn -e "$PATTERN_2" --include='*.tsx' "$TARGET" || true)"
if [ -n "$MATCHES" ]; then
  echo "$MATCHES"
  STATUS=1
fi

if [ "$STATUS" -ne 0 ]; then
  echo "check-rtl: banned physical-direction utilities found (see DOSSIER_PLAN.md R7)" >&2
fi

exit $STATUS
