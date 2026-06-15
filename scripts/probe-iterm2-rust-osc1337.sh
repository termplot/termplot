#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: iTerm2 Rust OSC 1337 probing is currently macOS-only" >&2
  exit 1
fi

for required in defaults open screencapture sips gm perl rustc swift; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

iterm_app="${ITERM2_APP:-iTerm.app}"
repo_root="$(pwd -P)"
fixture="${ITERM2_RUST_OSC1337_FIXTURE:-$repo_root/scripts/fixtures/rust-iterm2-osc1337-direct.rs}"
visible_seconds="${ITERM2_RUST_OSC1337_PROBE_VISIBLE_SECONDS:-8}"
timeout_seconds="${ITERM2_RUST_OSC1337_PROBE_TIMEOUT_SECONDS:-20}"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-iterm2-rust-osc1337-probe.XXXXXX")"
artifact_dir="${ITERM2_RUST_OSC1337_PROBE_ARTIFACT_DIR:-/tmp}"
artifact="$artifact_dir/termplot-iterm2-rust-osc1337-$(basename "$tmpdir").png"
capture_x="${ITERM2_RUST_OSC1337_PROBE_X:-80}"
capture_y="${ITERM2_RUST_OSC1337_PROBE_Y:-120}"
window_columns="${ITERM2_RUST_OSC1337_PROBE_COLUMNS:-100}"
window_rows="${ITERM2_RUST_OSC1337_PROBE_ROWS:-36}"
threshold="${ITERM2_RUST_OSC1337_PROBE_THRESHOLD:-20}"
crop_padding="${ITERM2_RUST_OSC1337_PROBE_CROP_PADDING:-16}"
marker="$tmpdir/marker"
log="$tmpdir/render.log"
command_script="$tmpdir/run-iterm2-rust-osc1337.sh"
rust_bin="$tmpdir/rust-iterm2-osc1337-direct"
osc_output="$tmpdir/rust-iterm2-osc1337-output.bin"
png_output="$tmpdir/rust-iterm2-osc1337-image.png"
pre_pids="$tmpdir/pre-pids.txt"
pre_server_pids="$tmpdir/pre-server-pids.txt"
window_probe="$tmpdir/find-iterm-window.swift"
temporary_default_keys="SUEnableAutomaticChecks NoSyncSuppressDownloadConfirmation NoSyncSuppressPromptToEnableResizing NoSyncSuppressPromptToEnableUnfocusedResizing"
title="TermPlot iTerm2 Rust OSC1337 probe $(basename "$tmpdir")"

if [ ! -f "$fixture" ]; then
  echo "error: Rust iTerm2 fixture not found: $fixture" >&2
  exit 1
fi

iterm_pids() {
  ps -axo pid=,command= | awk '
    /iTerm.app\/Contents\/MacOS\/iTerm2/ { print $1 }
  '
}

iterm_server_pids() {
  ps -axo pid=,command= | awk '
    /Application Support\/iTerm2\/iTermServer-/ { print $1 }
  '
}

probe_iterm_pids() {
  ps -axo pid=,command= | awk -v tmpdir="$tmpdir" '
    /iTerm.app\/Contents\/MacOS\/iTerm2/ && index($0, tmpdir) { print $1 }
  '
}

new_iterm_server_pids() {
  current="$(iterm_server_pids || true)"
  if [ -z "$current" ]; then
    return 0
  fi

  for pid in $current; do
    if ! grep -qx "$pid" "$pre_server_pids" 2>/dev/null; then
      printf '%s\n' "$pid"
    fi
  done
}

print_matching_processes() {
  ps -axo pid=,ppid=,command= | awk -v tmpdir="$tmpdir" '
    /iTerm.app\/Contents\/MacOS\/iTerm2/ || index($0, tmpdir) { print }
  '
}

cleanup_probe_processes() {
  had_preexisting_iterm=0
  had_preexisting_server=0
  if [ -s "$pre_pids" ]; then
    had_preexisting_iterm=1
  fi
  if [ -s "$pre_server_pids" ]; then
    had_preexisting_server=1
  fi

  probe_pids="$(probe_iterm_pids || true)"
  if [ -n "$probe_pids" ]; then
    echo "cleanup_iterm2_pids=$(printf '%s' "$probe_pids" | tr '\n' ' ')"
    for pid in $probe_pids; do
      kill "$pid" 2>/dev/null || true
    done

    cleanup_deadline=$(( $(date +%s) + 5 ))
    while [ -n "$(probe_iterm_pids || true)" ]; do
      if [ "$(date +%s)" -gt "$cleanup_deadline" ]; then
        for pid in $(probe_iterm_pids || true); do
          kill -9 "$pid" 2>/dev/null || true
        done
        break
      fi
      sleep 0.1
    done
  fi

  server_pids="$(new_iterm_server_pids || true)"
  if [ -n "$server_pids" ]; then
    if [ "$had_preexisting_iterm" -eq 0 ] && [ "$had_preexisting_server" -eq 0 ]; then
      echo "cleanup_iterm2_server_pids=$(printf '%s' "$server_pids" | tr '\n' ' ')"
      for pid in $server_pids; do
        kill "$pid" 2>/dev/null || true
      done
    else
      echo "diagnostic_new_iterm2_server_pids=$(printf '%s' "$server_pids" | tr '\n' ' ')"
    fi
  fi
}

save_iterm_default() {
  key="$1"
  value_file="$tmpdir/default-$key"
  exists_file="$tmpdir/default-$key.exists"

  if defaults read com.googlecode.iterm2 "$key" > "$value_file" 2>/dev/null; then
    : > "$exists_file"
  fi
}

restore_iterm_defaults() {
  for key in $temporary_default_keys; do
    value_file="$tmpdir/default-$key"
    exists_file="$tmpdir/default-$key.exists"

    if [ -f "$exists_file" ]; then
      prior="$(cat "$value_file")"
      defaults write com.googlecode.iterm2 "$key" "$prior" >/dev/null 2>&1 || true
    else
      defaults delete com.googlecode.iterm2 "$key" >/dev/null 2>&1 || true
    fi
  done
}

cleanup() {
  rc=$?
  trap - EXIT INT TERM
  cleanup_probe_processes
  restore_iterm_defaults
  rm -rf "$tmpdir"
  exit "$rc"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

assert_osc1337_output() {
  if [ ! -s "$osc_output" ]; then
    echo "error: missing or empty Rust OSC 1337 output artifact: $osc_output" >&2
    exit 1
  fi

  if ! perl -0777 -ne 'exit(!(/\x1b\]1337;File=/ && /inline=1/ && !/\x1b_G/))' "$osc_output"; then
    echo "error: Rust output did not prove OSC 1337 bytes" >&2
    exit 1
  fi
}

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"
iterm_pids > "$pre_pids"
iterm_server_pids > "$pre_server_pids"
rustc "$fixture" -o "$rust_bin"

for key in $temporary_default_keys; do
  save_iterm_default "$key"
done
defaults write com.googlecode.iterm2 SUEnableAutomaticChecks -bool false
defaults write com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing -bool true

marker_q="$(shell_quote "$marker")"
log_q="$(shell_quote "$log")"
rust_bin_q="$(shell_quote "$rust_bin")"
osc_output_q="$(shell_quote "$osc_output")"
png_output_q="$(shell_quote "$png_output")"
visible_seconds_q="$(shell_quote "$visible_seconds")"
title_q="$(shell_quote "$title")"

cat > "$command_script" <<EOF
#!/bin/sh
set -eu
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
printf '\\033]0;%s\\007' $title_q
printf '\\033[3;%s;%st' "$capture_x" "$capture_y"
printf '\\033[8;%s;%st' "$window_rows" "$window_columns"
sleep 0.8
$rust_bin_q --capture=$osc_output_q --png=$png_output_q 2>> $log_q
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
EOF
chmod +x "$command_script"

cat > "$window_probe" <<'EOF'
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 2 else {
  fputs("usage: find-iterm-window <title-fragment>\n", stderr)
  exit(2)
}

let titleFragment = CommandLine.arguments[1]
let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
  exit(1)
}

for window in windows {
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let name = window[kCGWindowName as String] as? String ?? ""
  guard owner.contains("iTerm") && name.contains(titleFragment) else {
    continue
  }
  guard let bounds = window[kCGWindowBounds as String] as? [String: Any],
        let x = bounds["X"] as? Double,
        let y = bounds["Y"] as? Double,
        let width = bounds["Width"] as? Double,
        let height = bounds["Height"] as? Double else {
    continue
  }
  let number = window[kCGWindowNumber as String] as? Int ?? 0
  print("window_id=\(number)")
  print("window_owner=\(owner)")
  print("window_title=\(name)")
  print("window_bounds=\(Int(x)),\(Int(y)),\(Int(width)),\(Int(height))")
  exit(0)
}

exit(1)
EOF

command="/bin/sh $(shell_quote "$command_script")"

echo "iterm2_probe_tmpdir=$tmpdir"
echo "iterm_app=$iterm_app"
echo "fixture=$fixture"
echo "rust_bin=$rust_bin"
echo "command_script=$command_script"
echo "marker=$marker"
echo "log=$log"
echo "rust_iterm2_output=$osc_output"
echo "rust_iterm2_png=$png_output"
echo "title=$title"
echo "screenshot=$artifact"
echo "window_control=CSI 3;$capture_x;${capture_y}t, CSI 8;$window_rows;${window_columns}t"
echo "preexisting_iterm2_pids=$(tr '\n' ' ' < "$pre_pids")"
echo "preexisting_iterm2_server_pids=$(tr '\n' ' ' < "$pre_server_pids")"
echo "iterm2_prompt_prevention=temporary SUEnableAutomaticChecks=false NoSyncSuppressDownloadConfirmation=true NoSyncSuppressPromptToEnableResizing=true NoSyncSuppressPromptToEnableUnfocusedResizing=true"

open -na "$iterm_app" --args "--command=$command"

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
        echo "error: Rust OSC 1337 renderer failed inside iTerm2" >&2
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
  echo "error: timed out waiting for iTerm2 Rust OSC 1337 render marker" >&2
  echo "diagnostic_processes:" >&2
  print_matching_processes >&2
  if [ -f "$log" ]; then
    echo "render_log:" >&2
    sed 's/^/  /' "$log" >&2
  fi
  exit 1
fi

assert_osc1337_output

probe_pids="$(probe_iterm_pids || true)"
if [ -z "$probe_pids" ]; then
  echo "error: no probe-owned iTerm2 process found before screenshot" >&2
  print_matching_processes >&2
  exit 1
fi
echo "probe_iterm2_pids=$(printf '%s' "$probe_pids" | tr '\n' ' ')"

window_info=""
window_deadline=$(( $(date +%s) + 5 ))
while [ "$(date +%s)" -le "$window_deadline" ]; do
  if window_info="$(swift "$window_probe" "$(basename "$tmpdir")" 2>/dev/null)"; then
    break
  fi
  sleep 0.2
done

if [ -z "$window_info" ]; then
  echo "error: could not discover probe-owned iTerm2 window bounds" >&2
  print_matching_processes >&2
  exit 1
fi

echo "$window_info"
window_bounds="$(printf '%s\n' "$window_info" | awk -F= '/^window_bounds=/ { print $2; exit }')"
if [ -z "$window_bounds" ]; then
  echo "error: discovered iTerm2 window did not report bounds" >&2
  exit 1
fi

capture_x="$(printf '%s' "$window_bounds" | awk -F, '{ print $1 }')"
capture_y="$(printf '%s' "$window_bounds" | awk -F, '{ print $2 }')"
capture_width="$(printf '%s' "$window_bounds" | awk -F, '{ print $3 }')"
capture_height="$(printf '%s' "$window_bounds" | awk -F, '{ print $4 }')"
echo "capture_rect=$capture_x,$capture_y,$capture_width,$capture_height"

if ! screencapture -x -R"$capture_x,$capture_y,$capture_width,$capture_height" "$artifact"; then
  echo "error: screencapture failed; macOS Screen Recording permission may be missing" >&2
  exit 1
fi

if [ ! -s "$artifact" ]; then
  echo "error: screenshot file is missing or empty: $artifact" >&2
  exit 1
fi

counts="$(
  gm convert "$artifact" txt:- |
    perl -e '
      my (%count, %min_x, %max_x, %min_y, %max_y);
      while (<STDIN>) {
        next if /^#/;
        next unless /^(\d+),(\d+):.*\(\s*(\d+),\s*(\d+),\s*(\d+)/;
        my ($x, $y, $r, $g, $b) = ($1, $2, $3, $4, $5);
        my $color = "";
        if (abs($r - 255) <= 35 && $g <= 60  && $b <= 60) {
          $color = "red";
        } elsif ($r <= 80  && $g >= 150 && $b <= 80) {
          $color = "green";
        } elsif ($r <= 80  && $g <= 80  && $b >= 150) {
          $color = "blue";
        } elsif ($r >= 200 && $g >= 200 && $b >= 200) {
          $color = "white";
        } else {
          next;
        }

        $count{$color}++;
        next if $color eq "white";
        $min_x{$color} = $x if !exists($min_x{$color}) || $x < $min_x{$color};
        $max_x{$color} = $x if !exists($max_x{$color}) || $x > $max_x{$color};
        $min_y{$color} = $y if !exists($min_y{$color}) || $y < $min_y{$color};
        $max_y{$color} = $y if !exists($max_y{$color}) || $y > $max_y{$color};
      }

      my @colors = qw(red green blue);
      my ($min_x, $min_y, $max_x, $max_y);
      for my $color (@colors) {
        $count{$color} ||= 0;
        next unless exists $min_x{$color};
        $min_x = $min_x{$color} if !defined($min_x) || $min_x{$color} < $min_x;
        $max_x = $max_x{$color} if !defined($max_x) || $max_x{$color} > $max_x;
        $min_y = $min_y{$color} if !defined($min_y) || $min_y{$color} < $min_y;
        $max_y = $max_y{$color} if !defined($max_y) || $max_y{$color} > $max_y;
      }

      printf "red_count=%d\n",   $count{red};
      printf "green_count=%d\n", $count{green};
      printf "blue_count=%d\n",  $count{blue};
      printf "white_count=%d\n", $count{white};
      if (defined $min_x) {
        printf "detected_bounds=%dx%d+%d+%d\n", $max_x - $min_x + 1, $max_y - $min_y + 1, $min_x, $min_y;
      } else {
        printf "detected_bounds=none\n";
      }
    '
)"

detected_bounds="$(printf '%s\n' "$counts" | awk -F= '/^detected_bounds=/ { print $2 }')"

if [ "$detected_bounds" != "none" ]; then
  bounds_size="${detected_bounds%%+*}"
  bounds_rest="${detected_bounds#*+}"
  bounds_x="${bounds_rest%%+*}"
  bounds_y="${bounds_rest#*+}"
  bounds_width="${bounds_size%x*}"
  bounds_height="${bounds_size#*x}"
  crop_x=$(( bounds_x - crop_padding ))
  crop_y=$(( bounds_y - crop_padding ))
  crop_width=$(( bounds_width + crop_padding + crop_padding ))
  crop_height=$(( bounds_height + crop_padding + crop_padding ))
  if [ "$crop_x" -lt 0 ]; then
    crop_x=0
  fi
  if [ "$crop_y" -lt 0 ]; then
    crop_y=0
  fi
else
  crop_x=0
  crop_y=0
  crop_width=0
  crop_height=0
fi

crop_counts="$(
  if [ "$detected_bounds" != "none" ]; then
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
  else
    printf 'red_count=0\ngreen_count=0\nblue_count=0\nwhite_count=0\n'
  fi
)"

red_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^red_count=/ { print $2 }')"
green_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^green_count=/ { print $2 }')"
blue_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^blue_count=/ { print $2 }')"
white_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^white_count=/ { print $2 }')"

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
echo "rust_iterm2_protocol_attribution=osc1337-file"
echo "rust_iterm2_output_bytes=$(wc -c < "$osc_output" | tr -d ' ')"
echo "rust_iterm2_contains_osc1337_file=yes"
echo "rust_iterm2_contains_kitty_apc=no"
echo "screenshot=$artifact"
echo "screenshot_bytes=$(wc -c < "$artifact" | tr -d ' ')"
sips -g pixelWidth -g pixelHeight "$artifact" 2>/dev/null | sed 's/^/screenshot_/' || true
echo "pixel_screenshot=$artifact"
echo "pixel_crop=${crop_width}x${crop_height}+${crop_x}+${crop_y}"
echo "pixel_detected_bounds=$detected_bounds"
echo "pixel_threshold=$threshold"
echo "pixel_tolerance=red(|r-255|<=35,g<=60,b<=60);green(r<=80,g>=150,b<=80);blue(r<=80,g<=80,b>=150);white(r>=200,g>=200,b>=200)"
printf '%s\n' "$crop_counts"

cleanup_probe_processes
if [ -n "$(probe_iterm_pids || true)" ]; then
  echo "error: probe-owned iTerm2 process remained after cleanup" >&2
  exit 1
fi
if [ -n "$(new_iterm_server_pids || true)" ]; then
  echo "error: probe-attributed iTermServer process remained after cleanup" >&2
  exit 1
fi
echo "post_cleanup_preexisting_iterm2_pids=$(tr '\n' ' ' < "$pre_pids")"
echo "post_cleanup_preexisting_iterm2_server_pids=$(tr '\n' ' ' < "$pre_server_pids")"
echo "iterm2_processes=cleaned"
echo "pass: iTerm2 rendered Rust OSC 1337 output, pixels matched, and cleanup completed"
