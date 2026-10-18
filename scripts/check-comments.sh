#!/usr/bin/env bash
# ─────────────────────────────────────────────
# Dossier - Code Comment Policy Guard
# https://github.com/red-shadows-rs/dossier
# ─────────────────────────────────────────────

# Fails when a source file (TypeScript, JavaScript, CSS)
# contains any comment: standalone lines, trailing remarks, or blocks.
# The file-top credit banner (license or repository notice, including a
# leading DOCTYPE and blank lines) is the only tolerated occurrence.
# Directives like // eslint-disable or /// <reference are permitted.
# Configuration files (.env*, *.toml, *.sh, *.xml, *.yml, *.json) keep
# their comments and are out of scope here.

# ── Exit Codes ──
# 0: policy holds, 1: violations found

set -u

root="$(cd "$(dirname "$0")/.." && pwd)"
status=0

# ── Banner Skipper ──
# Emits the file body after the leading banner block, then the caller greps
# that body for violations.
skip_banner='
BEGIN { state = 0 }
state == 0 {
    if ($0 ~ /^[[:space:]]*$/) next
    if ($0 ~ /^[[:space:]]*<![Dd][Oo][Cc][Tt][Yy][Pp][Ee]/) next
    if ($0 ~ /^[[:space:]]*\/\//) next
    if ($0 ~ /^[[:space:]]*\/\*/ || $0 ~ /^[[:space:]]*\*/) {
        if ($0 ~ /\*\//) next
        state = 2
        next
    }
    if ($0 ~ /^[[:space:]]*<!--/) {
        if ($0 ~ /-->/) next
        state = 3
        next
    }
    state = 1
}
state == 2 { if ($0 ~ /\*\//) state = 0; next }
state == 3 { if ($0 ~ /-->/) state = 0; next }
state == 1 { print }
'

# ── Violation Scan ──
while IFS= read -r file; do
    hits=$(awk "$skip_banner" "$file" 2>/dev/null \
        | grep -Pn '(^\s*//(?!\s*(eslint|prettier|@ts-|@next|<reference)))|([^:"/]\s+//(?!\s*(eslint|prettier|@ts-|@next|<reference)))|(^\s*/\*(?!\s*(eslint|prettier|@ts-|@next|<reference)))|([^:"/]\s+/\*(?!\s*(eslint|prettier|@ts-|@next|<reference)))|(^\s*<!--)')
    if [ -n "$hits" ]; then
        echo "::error file=${file#"$root"/}::code comments are not allowed"
        status=1
    fi
done < <(find \
    "$root/src" \
    "$root/tests" \
    -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.mjs' -o -name '*.css' \) \
    ! -path '*/.next/*' \
    ! -path '*/node_modules/*' 2>/dev/null)

if [ "$status" -eq 0 ]; then
    echo "comment policy holds"
fi
exit "$status"

