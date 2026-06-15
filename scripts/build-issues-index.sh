#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_DIR="$(dirname "$SCRIPT_DIR")"
ISSUES_DIR="$REPO_DIR/issues"
OUTPUT="$ISSUES_DIR/README.md"

mkdir -p "$ISSUES_DIR"

open_rows=""
closed_rows=""

for dir in "$ISSUES_DIR"/*/; do
  readme="$dir/README.md"
  [ -f "$readme" ] || continue

  basename="$(basename "$dir")"
  num="${basename%%-*}"

  frontmatter=$(awk '/^[+][+][+]$/{n++; next} n==1{print} n==2{exit}' "$readme")
  status=$(echo "$frontmatter" | grep -E '^status[[:space:]]*=' | sed 's/.*"\(.*\)"/\1/' || true)
  opened=$(echo "$frontmatter" | grep -E '^opened[[:space:]]*=' | sed 's/.*"\(.*\)"/\1/' || true)
  closed=$(echo "$frontmatter" | grep -E '^closed[[:space:]]*=' | sed 's/.*"\(.*\)"/\1/' || true)

  title=$(awk '/^[+][+][+]$/{n++; next} n>=2 && /^# /{sub(/^# /,""); print; exit}' "$readme")
  if [ -z "$title" ]; then
    title="$basename"
  fi

  title=$(echo "$title" | sed 's/^Issue [0-9]*: //')
  link="[${num}](${basename}/README.md)"

  if [ "$status" = "open" ]; then
    open_rows="${open_rows}| ${link} | ${title} | ${opened} |\n"
  elif [ "$status" = "closed" ]; then
    closed_rows="${closed_rows}${num}\t| ${link} | ${title} | ${opened} | ${closed} |\n"
  fi
done

sorted_closed=$(echo -e "$closed_rows" | sort -r -t$'\t' -k1 | cut -f2-)

{
  echo "# Issues"
  echo ""
  echo "## Open"
  echo ""
  echo "| # | Title | Opened |"
  echo "| - | ----- | ------ |"
  if [ -n "$open_rows" ]; then
    echo -e "$open_rows" | sed '/^$/d'
  fi
  echo ""
  echo "## Closed"
  echo ""
  echo "| # | Title | Opened | Closed |"
  echo "| - | ----- | ------ | ------ |"
  if [ -n "$sorted_closed" ]; then
    echo "$sorted_closed" | sed '/^$/d'
  fi
} > "$OUTPUT"

(cd "$REPO_DIR" && dprint fmt issues/README.md) > /dev/null 2>&1 || true

open_count=$(echo -e "$open_rows" | sed '/^$/d' | wc -l | tr -d ' ')
closed_count=$(echo "$sorted_closed" | sed '/^$/d' | wc -l | tr -d ' ')
echo "issues/README.md: ${open_count} open, ${closed_count} closed"
