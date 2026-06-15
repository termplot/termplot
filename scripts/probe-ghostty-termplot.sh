#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty TermPlot probing is currently macOS-only" >&2
  exit 1
fi

for required in open screencapture sips gm perl node; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

repo_root="$(pwd -P)"
node_bin="$(command -v node)"
termplot="${TERMPLOT_CLI:-$repo_root/build/bin/termplot.js}"
config="${TERMPLOT_PROBE_CONFIG:-$repo_root/scripts/fixtures/full-stack-plotly-config.json}"
ghostty_app="${GHOSTTY_APP:-Ghostty.app}"
visible_seconds="${GHOSTTY_TERMPLOT_PROBE_VISIBLE_SECONDS:-8}"
timeout_seconds="${GHOSTTY_TERMPLOT_PROBE_TIMEOUT_SECONDS:-60}"
tmpdir="$(mktemp -d "/tmp/tp-ghostty.XXXXXX")"
artifact_dir="${GHOSTTY_TERMPLOT_PROBE_ARTIFACT_DIR:-/tmp}"
artifact="$artifact_dir/termplot-ghostty-full-stack-$(basename "$tmpdir").png"
capture_x="${GHOSTTY_TERMPLOT_PROBE_X:-80}"
capture_y="${GHOSTTY_TERMPLOT_PROBE_Y:-120}"
capture_width="${GHOSTTY_TERMPLOT_PROBE_WIDTH:-1200}"
capture_height="${GHOSTTY_TERMPLOT_PROBE_HEIGHT:-800}"
window_columns="${GHOSTTY_TERMPLOT_PROBE_COLUMNS:-100}"
window_rows="${GHOSTTY_TERMPLOT_PROBE_ROWS:-36}"
threshold="${GHOSTTY_TERMPLOT_PROBE_THRESHOLD:-80}"
crop_width="${GHOSTTY_TERMPLOT_PROBE_CROP_WIDTH:-760}"
crop_height="${GHOSTTY_TERMPLOT_PROBE_CROP_HEIGHT:-700}"
crop_x="${GHOSTTY_TERMPLOT_PROBE_CROP_X:-0}"
marker="$tmpdir/marker"
render_log="$tmpdir/render.log"
daemon_log="$tmpdir/termplotd.log"
socket="$tmpdir/termplotd.sock"
input="$tmpdir/input.txt"
pre_pids="$tmpdir/pre-pids.txt"
title="TermPlot Ghostty full stack $(basename "$tmpdir")"

if [ ! -f "$termplot" ]; then
  echo "error: built TermPlot CLI not found: $termplot; run pnpm run build" >&2
  exit 1
fi

if [ ! -f "$config" ]; then
  echo "error: Plotly probe config not found: $config" >&2
  exit 1
fi

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

matching_probe_processes() {
  ps -axo pid=,ppid=,command= | awk -v tmpdir="$tmpdir" '
    index($0, tmpdir) && $0 !~ /awk -v tmpdir/ { print }
  '
}

probe_daemon_pids() {
  ps -axo pid=,command= | awk -v socket="$socket" '
    /termplotd\.js/ && index($0, socket) { print $1 }
  '
}

process_exists() {
  kill -0 "$1" 2>/dev/null
}

daemon_child_pids() {
  pid="$1"
  ps -axo pid=,ppid= | awk -v ppid="$pid" '$2 == ppid { print $1 }'
}

cleanup_probe_processes() {
  node "$termplot" daemon stop --socket "$socket" >/dev/null 2>&1 || true
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

  node "$termplot" daemon stop --socket "$socket" >/dev/null 2>&1 || true
  daemon_pids="$(probe_daemon_pids || true)"
  if [ -n "$daemon_pids" ]; then
    echo "cleanup_termplotd_pids=$(printf '%s' "$daemon_pids" | tr '\n' ' ')"
    for pid in $daemon_pids; do
      kill "$pid" 2>/dev/null || true
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

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"
ghostty_pids > "$pre_pids"

termplot_q="$(shell_quote "$termplot")"
node_q="$(shell_quote "$node_bin")"
config_q="$(shell_quote "$config")"
socket_q="$(shell_quote "$socket")"
daemon_log_q="$(shell_quote "$daemon_log")"
render_log_q="$(shell_quote "$render_log")"
marker_q="$(shell_quote "$marker")"
visible_seconds_q="$(shell_quote "$visible_seconds")"

cat > "$input" <<EOF
run_termplot_full_stack_probe() {
now_ms() { $node_q -e 'process.stdout.write(String(Date.now()))'; }
json_field() {
  $node_q -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const path = process.argv[1].split("."); let value = JSON.parse(s); for (const key of path) value = value[key]; process.stdout.write(String(value)); });' "\$1"
}
successes=0
printf 'status=started\n' >> $render_log_q
printf 'child_pid=%s\n' "\$\$" >> $render_log_q
printf 'child_ppid=%s\n' "\$PPID" >> $render_log_q
printf 'started\n' > $marker_q
for pair in 1 2 3; do
  $node_q $termplot_q daemon stop --socket $socket_q >/dev/null 2>&1 || true
  cold_start=\$(now_ms)
  $node_q $termplot_q render --file $config_q --socket $socket_q --ttl-ms 30000 --log $daemon_log_q --timeout-ms 30000 --protocol kitty 2>> $render_log_q
  cold_status=\$?
  cold_end=\$(now_ms)
  $node_q $termplot_q daemon status --socket $socket_q > "$tmpdir/status-cold-\$pair.json" 2>> $render_log_q || true
  cold_pid=\$(json_field status.pid < "$tmpdir/status-cold-\$pair.json")
  cold_children=\$(ps -axo pid=,ppid= | awk -v ppid="\$cold_pid" '\$2 == ppid { print \$1 }' | tr '\n' ' ')
  warm_start=\$(now_ms)
  $node_q $termplot_q render --file $config_q --socket $socket_q --ttl-ms 30000 --log $daemon_log_q --timeout-ms 30000 --protocol kitty 2>> $render_log_q
  warm_status=\$?
  warm_end=\$(now_ms)
  $node_q $termplot_q daemon status --socket $socket_q > "$tmpdir/status-warm-\$pair.json" 2>> $render_log_q || true
  warm_pid=\$(json_field status.pid < "$tmpdir/status-warm-\$pair.json")
  warm_children=\$(ps -axo pid=,ppid= | awk -v ppid="\$warm_pid" '\$2 == ppid { print \$1 }' | tr '\n' ' ')
  cold_ms=\$((cold_end - cold_start))
  warm_ms=\$((warm_end - warm_start))
  printf 'pair_%s_cold_status=%s\n' "\$pair" "\$cold_status" >> $render_log_q
  printf 'pair_%s_warm_status=%s\n' "\$pair" "\$warm_status" >> $render_log_q
  printf 'pair_%s_cold_ms=%s\n' "\$pair" "\$cold_ms" >> $render_log_q
  printf 'pair_%s_warm_ms=%s\n' "\$pair" "\$warm_ms" >> $render_log_q
  printf 'pair_%s_cold_pid=%s\n' "\$pair" "\$cold_pid" >> $render_log_q
  printf 'pair_%s_warm_pid=%s\n' "\$pair" "\$warm_pid" >> $render_log_q
  printf 'pair_%s_cold_child_pids=%s\n' "\$pair" "\$cold_children" >> $render_log_q
  printf 'pair_%s_warm_child_pids=%s\n' "\$pair" "\$warm_children" >> $render_log_q
  if [ "\$cold_status" -eq 0 ] && [ "\$warm_status" -eq 0 ] && [ "\$cold_pid" = "\$warm_pid" ] && [ "\$warm_ms" -lt "\$cold_ms" ]; then
    successes=\$((successes + 1))
  fi
done
printf 'timing_successes=%s\n' "\$successes" >> $render_log_q
if [ "\$successes" -ge 2 ]; then
  printf 'rendered\n' > $marker_q
else
  printf 'failed\n' > $marker_q
fi
sleep $visible_seconds_q
$node_q $termplot_q daemon stop --socket $socket_q >/dev/null 2>&1 || true
exit
}
run_termplot_full_stack_probe
EOF

echo "ghostty_termplot_probe_tmpdir=$tmpdir"
echo "ghostty_app=$ghostty_app"
echo "termplot=$termplot"
echo "node=$node_bin"
echo "config=$config"
echo "socket=$socket"
echo "daemon_log=$daemon_log"
echo "render_log=$render_log"
echo "input=$input"
echo "title=$title"
echo "screenshot=$artifact"
echo "capture_rect=$capture_x,$capture_y,$capture_width,$capture_height"
echo "preexisting_ghostty_pids=$(tr '\n' ' ' < "$pre_pids")"

open -na "$ghostty_app" --args \
  --config-default-files=false \
  --window-save-state=never \
  --confirm-close-surface=false \
  --quit-after-last-window-closed=true \
  "--window-position-x=$capture_x" \
  "--window-position-y=$capture_y" \
  "--window-width=$window_columns" \
  "--window-height=$window_rows" \
  --title="$title" \
  "--input=path:$input"

deadline=$(( $(date +%s) + timeout_seconds ))
state=""

while [ "$(date +%s)" -le "$deadline" ]; do
  if [ -f "$marker" ]; then
    state="$(cat "$marker")"
    case "$state" in
      rendered)
        break
        ;;
      failed)
        echo "error: TermPlot render timing proof failed inside Ghostty" >&2
        sed 's/^/  /' "$render_log" >&2
        if [ -f "$daemon_log" ]; then
          echo "daemon_log:" >&2
          sed 's/^/  /' "$daemon_log" >&2
        fi
        exit 1
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

if [ "$state" != "rendered" ]; then
  echo "error: timed out waiting for Ghostty TermPlot render marker" >&2
  if [ -f "$render_log" ]; then
    sed 's/^/  /' "$render_log" >&2
  fi
  exit 1
fi

probe_pids="$(probe_ghostty_pids || true)"
if [ -z "$probe_pids" ]; then
  echo "error: no probe-owned Ghostty process found before screenshot" >&2
  exit 1
fi
echo "probe_ghostty_pids=$(printf '%s' "$probe_pids" | tr '\n' ' ')"

if ! screencapture -x -R"$capture_x,$capture_y,$capture_width,$capture_height" "$artifact"; then
  echo "error: screencapture failed; macOS Screen Recording permission may be missing" >&2
  exit 1
fi

if [ ! -s "$artifact" ]; then
  echo "error: screenshot file is missing or empty: $artifact" >&2
  exit 1
fi

pixel_height="$(sips -g pixelHeight "$artifact" 2>/dev/null | awk '/pixelHeight:/ { print $2; exit }')"
if [ -z "$pixel_height" ]; then
  echo "error: could not read screenshot pixelHeight with sips" >&2
  exit 1
fi

crop_y=$(( pixel_height - crop_height - 80 ))
if [ "$crop_y" -lt 0 ]; then
  crop_y=0
fi

counts="$(
  gm convert "$artifact" -crop "${crop_width}x${crop_height}+${crop_x}+${crop_y}" txt:- |
    perl -ne '
      next if /^#/;
      if (/\(\s*(\d+),\s*(\d+),\s*(\d+)/) {
        ($r, $g, $b) = ($1, $2, $3);
        $red++ if $r >= 200 && $g <= 80 && $b <= 80;
        $green++ if $r <= 90 && $g >= 120 && $b <= 90;
        $blue++ if $r <= 90 && $g <= 90 && $b >= 160;
        $white++ if $r >= 210 && $g >= 210 && $b >= 210;
      }
      END {
        printf "red_count=%d\n", $red || 0;
        printf "green_count=%d\n", $green || 0;
        printf "blue_count=%d\n", $blue || 0;
        printf "white_count=%d\n", $white || 0;
      }
    '
)"

eval "$counts"
echo "pixel_screenshot=$artifact"
echo "screenshot_bytes=$(wc -c < "$artifact" | tr -d ' ')"
echo "pixel_crop=${crop_width}x${crop_height}+${crop_x}+${crop_y}"
echo "pixel_threshold=$threshold"
echo "$counts"
sed 's/^/timing_/' "$render_log"
browser_pids="$(awk -F= '/_warm_child_pids=/ { print $2 }' "$render_log" | tr ' ' '\n' | awk 'NF' | sort -u | tr '\n' ' ')"
echo "browser_pids=$browser_pids"
if [ -z "$browser_pids" ]; then
  echo "error: no daemon child/browser PIDs were recorded for cleanup attribution" >&2
  exit 1
fi

if [ "$red_count" -lt "$threshold" ] || [ "$green_count" -lt "$threshold" ] || [ "$blue_count" -lt "$threshold" ] ||
  [ "$white_count" -lt "$threshold" ]; then
  echo "error: screenshot did not contain expected TermPlot pixel evidence" >&2
  exit 1
fi

cleanup_probe_processes
for pid in $browser_pids; do
  if process_exists "$pid"; then
    echo "error: browser child process still running after daemon cleanup: $pid" >&2
    exit 1
  fi
done
leftovers="$(matching_probe_processes || true)"
if [ -n "$leftovers" ]; then
  echo "error: probe-owned processes remain after cleanup:" >&2
  printf '%s\n' "$leftovers" >&2
  exit 1
fi

echo "ghostty_processes=cleaned"
echo "termplot_daemon=stopped"
echo "pass: Ghostty rendered TermPlot output, pixels matched, daemon warmed, and cleanup completed"
