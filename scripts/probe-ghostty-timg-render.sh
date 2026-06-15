#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty GUI timg probing is currently macOS-only" >&2
  exit 1
fi

if ! command -v open >/dev/null 2>&1; then
  echo "error: required macOS 'open' command was not found" >&2
  exit 1
fi

timg_bin="${TIMG_BIN:-/opt/homebrew/bin/timg}"
if [ ! -x "$timg_bin" ]; then
  echo "error: timg executable not found at $timg_bin" >&2
  exit 1
fi

ghostty_app="${GHOSTTY_APP:-Ghostty.app}"
visible_seconds="${GHOSTTY_TIMG_PROBE_VISIBLE_SECONDS:-3}"
timeout_seconds="${GHOSTTY_TIMG_PROBE_TIMEOUT_SECONDS:-20}"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-ghostty-timg-probe.XXXXXX")"
marker="$tmpdir/marker"
log="$tmpdir/render.log"
input="$tmpdir/input.txt"
image="$tmpdir/test-image.ppm"
pre_pids="$tmpdir/pre-pids.txt"
title="TermPlot timg probe $(basename "$tmpdir")"

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
  rc=$?
  trap - EXIT INT TERM
  cleanup_probe_processes
  rm -rf "$tmpdir"
  exit "$rc"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

write_test_image() {
  {
    printf 'P3\n'
    printf '32 32\n'
    printf '255\n'
    y=0
    while [ "$y" -lt 32 ]; do
      x=0
      while [ "$x" -lt 32 ]; do
        if [ "$x" -lt 16 ] && [ "$y" -lt 16 ]; then
          printf '255 0 0 '
        elif [ "$x" -ge 16 ] && [ "$y" -lt 16 ]; then
          printf '0 255 0 '
        elif [ "$x" -lt 16 ]; then
          printf '0 0 255 '
        else
          printf '255 255 255 '
        fi
        x=$(( x + 1 ))
      done
      printf '\n'
      y=$(( y + 1 ))
    done
  } > "$image"
}

trap cleanup EXIT INT TERM

ghostty_pids > "$pre_pids"
write_test_image

marker_q="$(shell_quote "$marker")"
log_q="$(shell_quote "$log")"
image_q="$(shell_quote "$image")"
timg_q="$(shell_quote "$timg_bin")"
visible_seconds_q="$(shell_quote "$visible_seconds")"

cat > "$input" <<EOF
run_termplot_timg_probe() {
{
  printf 'status=started\n'
  printf 'child_pid=%s\n' "\$\$"
  printf 'child_ppid=%s\n' "\$PPID"
  printf 'tty=%s\n' "\$(tty 2>/dev/null || true)"
  printf 'TERM=%s\n' "\${TERM:-}"
  printf 'TERM_PROGRAM=%s\n' "\${TERM_PROGRAM:-}"
  date '+started_at=%Y-%m-%dT%H:%M:%S%z'
} >> $log_q
printf 'started\n' > $marker_q
$timg_q -p kitty $image_q 2>> $log_q
timg_status=\$?
printf 'timg_status=%s\n' "\$timg_status" >> $log_q
date '+timg_done_at=%Y-%m-%dT%H:%M:%S%z' >> $log_q
if [ "\$timg_status" -eq 0 ]; then
  printf 'done\n' > $marker_q
else
  printf 'failed\n' > $marker_q
fi
sleep $visible_seconds_q
}
run_termplot_timg_probe
exit
EOF

echo "probe_tmpdir=$tmpdir"
echo "ghostty_app=$ghostty_app"
echo "timg_bin=$timg_bin"
echo "marker=$marker"
echo "log=$log"
echo "input=$input"
echo "image=$image"
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
        echo "render_log:"
        sed 's/^/  /' "$log"
        cleanup_probe_processes
        if [ -n "$(probe_ghostty_pids || true)" ]; then
          echo "error: probe-owned Ghostty process remained after cleanup" >&2
          exit 1
        fi
        echo "ghostty_processes=cleaned"
        echo "pass: Ghostty rendered the test image with timg -p kitty and cleaned up"
        exit 0
        ;;
      failed)
        echo "error: timg failed inside Ghostty" >&2
        echo "render_log:" >&2
        sed 's/^/  /' "$log" >&2
        exit 1
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

echo "error: timed out waiting for Ghostty timg render marker" >&2
echo "diagnostic_processes:" >&2
print_matching_processes >&2
if [ -f "$log" ]; then
  echo "render_log:" >&2
  sed 's/^/  /' "$log" >&2
fi
exit 1
