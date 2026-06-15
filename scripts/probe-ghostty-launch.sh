#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty GUI launch probing is currently macOS-only" >&2
  exit 1
fi

if ! command -v open >/dev/null 2>&1; then
  echo "error: required macOS 'open' command was not found" >&2
  exit 1
fi

ghostty_app="${GHOSTTY_APP:-Ghostty.app}"
visible_seconds="${GHOSTTY_PROBE_VISIBLE_SECONDS:-2}"
timeout_seconds="${GHOSTTY_PROBE_TIMEOUT_SECONDS:-15}"

if [ "${GHOSTTY_PROBE_ALLOW_INTERACTIVE_PROMPT:-}" != "1" ]; then
  cat >&2 <<'EOF'
error: this Ghostty -e launch strategy is disabled by default

This experiment showed that launching Ghostty with an explicit command via
`open -na Ghostty.app --args -e ...` can trigger an interactive macOS prompt
asking whether Ghostty may execute that command. Issue 2 requires unattended
automation, so this script must not open Ghostty unless the prompt-producing
behavior is being reproduced intentionally.

Set GHOSTTY_PROBE_ALLOW_INTERACTIVE_PROMPT=1 only for a manual reproduction.
EOF
  exit 2
fi

tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-ghostty-probe.XXXXXX")"
marker="$tmpdir/marker"
log="$tmpdir/child.log"

probe_ghostty_pids() {
  ps -axo pid=,command= | awk -v tmpdir="$tmpdir" '
    /Ghostty.app\/Contents\/MacOS\/ghostty/ && index($0, tmpdir) { print $1 }
  '
}

cleanup_probe_processes() {
  if [ -f "$log" ]; then
    child_pid="$(sed -n 's/^child_pid=//p' "$log" | tail -n 1)"
    if [ -n "$child_pid" ] && kill -0 "$child_pid" 2>/dev/null; then
      echo "cleanup_child_pid=$child_pid"
      kill "$child_pid" 2>/dev/null || true
    fi
  fi

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

trap cleanup EXIT INT TERM

child_command='
set -eu

marker="$1"
log="$2"
visible_seconds="$3"

{
  printf "status=started\n"
  printf "child_pid=%s\n" "$$"
  printf "child_ppid=%s\n" "$PPID"
  printf "tty=%s\n" "$(tty 2>/dev/null || true)"
  date "+started_at=%Y-%m-%dT%H:%M:%S%z"
} >> "$log"

printf "started\n" > "$marker"
sleep "$visible_seconds"

{
  printf "status=done\n"
  date "+done_at=%Y-%m-%dT%H:%M:%S%z"
} >> "$log"

printf "done\n" > "$marker"
'

echo "probe_tmpdir=$tmpdir"
echo "ghostty_app=$ghostty_app"
echo "marker=$marker"
echo "log=$log"

open -na "$ghostty_app" --args --wait-after-command=false -e /bin/sh -lc "$child_command" termplot-ghostty-probe "$marker" "$log" "$visible_seconds"

deadline=$(( $(date +%s) + timeout_seconds ))
state=""

while [ "$(date +%s)" -le "$deadline" ]; do
  if [ -f "$marker" ]; then
    state="$(cat "$marker")"
    case "$state" in
      done)
        child_pid="$(sed -n 's/^child_pid=//p' "$log" | tail -n 1)"
        child_deadline=$(( $(date +%s) + 5 ))
        while [ -n "$child_pid" ] && kill -0 "$child_pid" 2>/dev/null; do
          if [ "$(date +%s)" -gt "$child_deadline" ]; then
            echo "error: Ghostty probe child process is still running: $child_pid" >&2
            exit 1
          fi
          sleep 0.1
        done

        echo "marker_state=done"
        echo "child_pid=${child_pid:-unknown}"
        echo "child_process=exited"
        echo "child_log:"
        sed 's/^/  /' "$log"
        cleanup_probe_processes
        if [ -n "$(probe_ghostty_pids || true)" ]; then
          echo "error: probe-owned Ghostty process remained after cleanup" >&2
          exit 1
        fi
        echo "ghostty_processes=cleaned"
        echo "pass: Ghostty launched the probe command, it exited, and probe-owned processes were cleaned"
        exit 0
        ;;
      started)
        ;;
      *)
        echo "error: unexpected marker state: $state" >&2
        exit 1
        ;;
    esac
  fi

  sleep 0.2
done

echo "error: timed out waiting for Ghostty probe marker" >&2
if [ -f "$log" ]; then
  echo "child_log:" >&2
  sed 's/^/  /' "$log" >&2
fi
exit 1
