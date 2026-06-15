#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty Rust Kitty probing is currently macOS-only" >&2
  exit 1
fi

for required in open screencapture sips gm perl rustc; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

ghostty_app="${GHOSTTY_APP:-Ghostty.app}"
visible_seconds="${GHOSTTY_RUST_KITTY_PROBE_VISIBLE_SECONDS:-8}"
timeout_seconds="${GHOSTTY_RUST_KITTY_PROBE_TIMEOUT_SECONDS:-20}"
repo_root="$(pwd -P)"
fixture="${GHOSTTY_RUST_KITTY_FIXTURE:-$repo_root/scripts/fixtures/rust-kitty-direct.rs}"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-ghostty-rust-kitty-probe.XXXXXX")"
artifact_dir="${GHOSTTY_RUST_KITTY_PROBE_ARTIFACT_DIR:-/tmp}"
artifact="$artifact_dir/termplot-ghostty-rust-kitty-$(basename "$tmpdir").png"
capture_x="${GHOSTTY_RUST_KITTY_PROBE_X:-80}"
capture_y="${GHOSTTY_RUST_KITTY_PROBE_Y:-120}"
capture_width="${GHOSTTY_RUST_KITTY_PROBE_WIDTH:-1200}"
capture_height="${GHOSTTY_RUST_KITTY_PROBE_HEIGHT:-800}"
window_columns="${GHOSTTY_RUST_KITTY_PROBE_COLUMNS:-100}"
window_rows="${GHOSTTY_RUST_KITTY_PROBE_ROWS:-36}"
threshold="${GHOSTTY_RUST_KITTY_PROBE_THRESHOLD:-20}"
crop_width="${GHOSTTY_RUST_KITTY_PROBE_CROP_WIDTH:-520}"
crop_height="${GHOSTTY_RUST_KITTY_PROBE_CROP_HEIGHT:-520}"
crop_x="${GHOSTTY_RUST_KITTY_PROBE_CROP_X:-0}"
marker="$tmpdir/marker"
log="$tmpdir/render.log"
input="$tmpdir/input.txt"
rust_bin="$tmpdir/rust-kitty-direct"
rust_output="$tmpdir/rust-kitty-output.bin"
pre_pids="$tmpdir/pre-pids.txt"
title="TermPlot Rust Kitty probe $(basename "$tmpdir")"

if [ ! -f "$fixture" ]; then
  echo "error: Rust Kitty fixture not found: $fixture" >&2
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

assert_kitty_output() {
  if [ ! -s "$rust_output" ]; then
    echo "error: missing or empty Rust Kitty output artifact: $rust_output" >&2
    exit 1
  fi

  if ! perl -0777 -ne 'exit(!(/\x1b_G/ && /\x1b\\/ && /f=24/ && /s=64/ && /v=64/ && !/File=/))' "$rust_output"; then
    echo "error: Rust output did not prove Kitty APC bytes" >&2
    exit 1
  fi
}

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"
ghostty_pids > "$pre_pids"
rustc "$fixture" -o "$rust_bin"

marker_q="$(shell_quote "$marker")"
log_q="$(shell_quote "$log")"
rust_bin_q="$(shell_quote "$rust_bin")"
rust_output_q="$(shell_quote "$rust_output")"
visible_seconds_q="$(shell_quote "$visible_seconds")"

cat > "$input" <<EOF
run_termplot_rust_kitty_probe() {
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
$rust_bin_q --capture=$rust_output_q 2>> $log_q
rust_status=\$?
printf 'rust_status=%s\n' "\$rust_status" >> $log_q
date '+rust_done_at=%Y-%m-%dT%H:%M:%S%z' >> $log_q
if [ "\$rust_status" -eq 0 ]; then
  printf 'rendered\n' > $marker_q
else
  printf 'failed\n' > $marker_q
fi
sleep $visible_seconds_q
exit
}
run_termplot_rust_kitty_probe
EOF

echo "rust_kitty_probe_tmpdir=$tmpdir"
echo "ghostty_app=$ghostty_app"
echo "fixture=$fixture"
echo "rust_bin=$rust_bin"
echo "marker=$marker"
echo "log=$log"
echo "input=$input"
echo "rust_kitty_output=$rust_output"
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
        echo "error: Rust Kitty renderer failed inside Ghostty" >&2
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

if [ "$state" != "rendered" ]; then
  echo "error: timed out waiting for Ghostty Rust Kitty render marker" >&2
  echo "diagnostic_processes:" >&2
  print_matching_processes >&2
  if [ -f "$log" ]; then
    echo "render_log:" >&2
    sed 's/^/  /' "$log" >&2
  fi
  exit 1
fi

assert_kitty_output

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

crop_y=$(( pixel_height - 620 ))
if [ "$crop_y" -lt 0 ]; then
  crop_y=0
fi

counts="$(
  gm convert "$artifact" -crop "${crop_width}x${crop_height}+${crop_x}+${crop_y}" txt:- |
    perl -ne '
      next if /^#/;
      if (/\(\s*(\d+),\s*(\d+),\s*(\d+)/) {
        ($r, $g, $b) = ($1, $2, $3);
        $red++   if abs($r - 255) <= 35 && $g <= 60  && $b <= 60;
        $green++ if $r <= 80  && $g >= 150 && $b <= 80;
        $blue++  if $r <= 80  && $g <= 80  && $b >= 150;
        $white++ if $r >= 200 && $g >= 200 && $b >= 200;
      }
      END {
        printf "red_count=%d\n",   $red   || 0;
        printf "green_count=%d\n", $green || 0;
        printf "blue_count=%d\n",  $blue  || 0;
        printf "white_count=%d\n", $white || 0;
      }
    '
)"

red_count="$(printf '%s\n' "$counts" | awk -F= '/^red_count=/ { print $2 }')"
green_count="$(printf '%s\n' "$counts" | awk -F= '/^green_count=/ { print $2 }')"
blue_count="$(printf '%s\n' "$counts" | awk -F= '/^blue_count=/ { print $2 }')"
white_count="$(printf '%s\n' "$counts" | awk -F= '/^white_count=/ { print $2 }')"

failed=0
for color in red green blue white; do
  eval "count=\${${color}_count:-0}"
  if [ "$count" -lt "$threshold" ]; then
    echo "error: ${color}_count below threshold: $count < $threshold" >&2
    failed=1
  fi
done

if [ "$failed" -ne 0 ]; then
  exit 1
fi

echo "marker_state=rendered"
echo "render_log:"
sed 's/^/  /' "$log"
echo "rust_kitty_protocol_attribution=kitty-apc"
echo "rust_kitty_output_bytes=$(wc -c < "$rust_output" | tr -d ' ')"
echo "rust_kitty_apc_chunks=$(perl -0777 -ne 'print scalar(() = /\x1b_G/g)' "$rust_output")"
echo "rust_kitty_contains_iterm_file=no"
echo "screenshot=$artifact"
echo "screenshot_bytes=$(wc -c < "$artifact" | tr -d ' ')"
sips -g pixelWidth -g pixelHeight "$artifact" 2>/dev/null | sed 's/^/screenshot_/' || true
echo "pixel_screenshot=$artifact"
echo "pixel_crop=${crop_width}x${crop_height}+${crop_x}+${crop_y}"
echo "pixel_threshold=$threshold"
echo "pixel_tolerance=red(|r-255|<=35,g<=60,b<=60);green(r<=80,g>=150,b<=80);blue(r<=80,g<=80,b>=150);white(r>=200,g>=200,b>=200)"
printf '%s\n' "$counts"

cleanup_probe_processes
if [ -n "$(probe_ghostty_pids || true)" ]; then
  echo "error: probe-owned Ghostty process remained after cleanup" >&2
  exit 1
fi
echo "ghostty_processes=cleaned"
echo "pass: Ghostty rendered Rust Kitty output, pixels matched, and cleanup completed"
