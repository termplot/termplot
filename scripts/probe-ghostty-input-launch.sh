#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty GUI input probing is currently macOS-only" >&2
  exit 1
fi

if ! command -v open >/dev/null 2>&1; then
  echo "error: required macOS 'open' command was not found" >&2
  exit 1
fi

ghostty_app="${GHOSTTY_APP:-Ghostty.app}"
visible_seconds="${GHOSTTY_INPUT_PROBE_VISIBLE_SECONDS:-2}"
timeout_seconds="${GHOSTTY_INPUT_PROBE_TIMEOUT_SECONDS:-15}"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-ghostty-input-probe.XXXXXX")"
marker="$tmpdir/marker"
log="$tmpdir/child.log"
input="$tmpdir/input.txt"
pre_pids="$tmpdir/pre-pids.txt"
title="TermPlot input probe $(basename "$tmpdir")"

ghostty_pids() {
  ps -axo pid=,command= | awk '
    /Ghostty.app\/Contents\/MacOS\/ghostty/ { print $1 }
  '
}

probe_ghostty_pids() {
  ps -axo pid=,command= | awk -v tmpdir="$tmpdir" '
    /Ghostty.app\/Contents\/MacOS\/ghostty/ && index($0, tmpdir) { print $1 }
  '
}

print_matching_processes() {
  ps -axo pid=,ppid=,command= | awk -v tmpdir="$tmpdir" '
    /Ghostty.app\/Contents\/MacOS\/ghostty/ || index($0, tmpdir) { print }
  '
}

cleanup_probe_processes() {
  probe_pids="$(probe_ghostty_pids || true)"
  if [ -n "$probe_pids" ]; then
    echo "cleanup_ghostty_pids=$(printf '%s' "$probe_pids" | tr '\n' ' ')"
    for pid in $probe_pids; do
      kill "$pid" 2>/dev/null || true
    done

    cleanup_deadline=$(( $(date +%s) + 5 ))
    while [ -n "$(probe_ghostty_pids || true)" ]; do
      if [ "$(date +%s)" -gt "$cleanup_deadline" ]; then
        for pid in $(probe_ghostty_pids || true); do
          kill -9 "$pid" 2>/dev/null || true
        done
        break
      fi
      sleep 0.1
    done
  fi
}

cleanup() {
  cleanup_probe_processes
  rm -rf "$tmpdir"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

trap cleanup EXIT INT TERM

ghostty_pids > "$pre_pids"

marker_q="$(shell_quote "$marker")"
log_q="$(shell_quote "$log")"
visible_seconds_q="$(shell_quote "$visible_seconds")"

cat > "$input" <<EOF
{
  printf 'status=started\n'
  printf 'child_pid=%s\n' "\$\$"
  printf 'child_ppid=%s\n' "\$PPID"
  printf 'tty=%s\n' "\$(tty 2>/dev/null || true)"
  date '+started_at=%Y-%m-%dT%H:%M:%S%z'
} >> $log_q
printf 'started\n' > $marker_q
sleep $visible_seconds_q
{
  printf 'status=done\n'
  date '+done_at=%Y-%m-%dT%H:%M:%S%z'
} >> $log_q
printf 'done\n' > $marker_q
exit
EOF

echo "probe_tmpdir=$tmpdir"
echo "ghostty_app=$ghostty_app"
echo "marker=$marker"
echo "log=$log"
echo "input=$input"
echo "title=$title"
echo "preexisting_ghostty_pids=$(tr '\n' ' ' < "$pre_pids")"

open -na "$ghostty_app" --args \
  --config-default-files=false \
  --window-save-state=never \
  --confirm-close-surface=false \
  --quit-after-last-window-closed=true \
  --title="$title" \
  "--input=path:$input"

deadline=$(( $(date +%s) + timeout_seconds ))
state=""

while [ "$(date +%s)" -le "$deadline" ]; do
  if [ -f "$marker" ]; then
    state="$(cat "$marker")"
    case "$state" in
      done)
        echo "marker_state=done"
        echo "child_log:"
        sed 's/^/  /' "$log"
        cleanup_probe_processes
        if [ -n "$(probe_ghostty_pids || true)" ]; then
          echo "error: probe-owned Ghostty process remained after cleanup" >&2
          exit 1
        fi
        echo "ghostty_processes=cleaned"
        echo "pass: Ghostty startup input ran without using -e, wrote the marker, and cleaned up"
        exit 0
        ;;
      started)
        ;;
      *)
        echo "error: unexpected marker state: $state" >&2
        print_matching_processes >&2
        exit 1
        ;;
    esac
  fi

  sleep 0.2
done

echo "error: timed out waiting for Ghostty startup input marker" >&2
echo "diagnostic_processes:" >&2
print_matching_processes >&2
if [ -f "$log" ]; then
  echo "child_log:" >&2
  sed 's/^/  /' "$log" >&2
fi
exit 1
