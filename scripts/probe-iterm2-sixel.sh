#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: iTerm2 SIXEL probing is currently macOS-only" >&2
  exit 1
fi

for required in defaults open screencapture sips gm perl node rustc swift cmp; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

iterm_app="${ITERM2_APP:-iTerm.app}"
repo_root="$(pwd -P)"
node_fixture="${ITERM2_SIXEL_NODE_FIXTURE:-$repo_root/scripts/fixtures/node-sixel-direct.js}"
rust_fixture="${ITERM2_SIXEL_RUST_FIXTURE:-$repo_root/scripts/fixtures/rust-sixel-direct.rs}"
visible_seconds="${ITERM2_SIXEL_PROBE_VISIBLE_SECONDS:-8}"
timeout_seconds="${ITERM2_SIXEL_PROBE_TIMEOUT_SECONDS:-20}"
tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-iterm2-sixel-probe.XXXXXX")"
artifact_dir="${ITERM2_SIXEL_PROBE_ARTIFACT_DIR:-/tmp}"
capture_x="${ITERM2_SIXEL_PROBE_X:-80}"
capture_y="${ITERM2_SIXEL_PROBE_Y:-120}"
window_columns="${ITERM2_SIXEL_PROBE_COLUMNS:-100}"
window_rows="${ITERM2_SIXEL_PROBE_ROWS:-36}"
threshold="${ITERM2_SIXEL_PROBE_THRESHOLD:-20}"
crop_padding="${ITERM2_SIXEL_PROBE_CROP_PADDING:-16}"
pre_pids="$tmpdir/pre-pids.txt"
pre_server_pids="$tmpdir/pre-server-pids.txt"
window_probe="$tmpdir/find-iterm-window.swift"
rust_bin="$tmpdir/rust-sixel-direct"
temporary_default_keys="SUEnableAutomaticChecks NoSyncSuppressDownloadConfirmation NoSyncSuppressPromptToEnableResizing NoSyncSuppressPromptToEnableUnfocusedResizing"

if [ ! -f "$node_fixture" ]; then
  echo "error: Node.js SIXEL fixture not found: $node_fixture" >&2
  exit 1
fi

if [ ! -f "$rust_fixture" ]; then
  echo "error: Rust SIXEL fixture not found: $rust_fixture" >&2
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

assert_sixel_output() {
  label="$1"
  output="$2"

  if [ ! -s "$output" ]; then
    echo "error: missing or empty $label SIXEL output artifact: $output" >&2
    exit 1
  fi

  if ! perl -0777 -ne 'exit(!(/\x1bPq/ && /"1;1;64;64/ && /\x1b\\/ && !/\x1b_G/ && !/\x1b\]1337;File=/))' "$output"; then
    echo "error: $label output did not prove SIXEL-only bytes" >&2
    exit 1
  fi
}

assert_pixels() {
  label="$1"
  artifact="$2"

  counts="$(
    gm convert "$artifact" txt:- |
      perl -e '
        my (%count, %min_x, %max_x, %min_y, %max_y);
        while (<STDIN>) {
          next if /^#/;
          next unless /^(\d+),(\d+):.*\(\s*(\d+),\s*(\d+),\s*(\d+)/;
          my ($x, $y, $r, $g, $b) = ($1, $2, $3, $4, $5);
          my $color = "";
          if (abs($r - 255) <= 35 && $g <= 70  && $b <= 70) {
            $color = "red";
          } elsif ($r <= 90  && $g >= 140 && $b <= 90) {
            $color = "green";
          } elsif ($r <= 90  && $g <= 90  && $b >= 140) {
            $color = "blue";
          } elsif ($r >= 190 && $g >= 190 && $b >= 190) {
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
  if [ "$detected_bounds" = "none" ]; then
    echo "error: $label screenshot did not contain detectable color bounds" >&2
    exit 1
  fi

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

  crop_counts="$(
    gm convert "$artifact" -crop "${crop_width}x${crop_height}+${crop_x}+${crop_y}" txt:- |
      perl -ne '
        next if /^#/;
        if (/\(\s*(\d+),\s*(\d+),\s*(\d+)/) {
          ($r, $g, $b) = ($1, $2, $3);
          $red++   if abs($r - 255) <= 35 && $g <= 70  && $b <= 70;
          $green++ if $r <= 90  && $g >= 140 && $b <= 90;
          $blue++  if $r <= 90  && $g <= 90  && $b >= 140;
          $white++ if $r >= 190 && $g >= 190 && $b >= 190;
        }
        END {
          printf "red_count=%d\n",   $red   || 0;
          printf "green_count=%d\n", $green || 0;
          printf "blue_count=%d\n",  $blue  || 0;
          printf "white_count=%d\n", $white || 0;
        }
      '
  )"

  red_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^red_count=/ { print $2 }')"
  green_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^green_count=/ { print $2 }')"
  blue_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^blue_count=/ { print $2 }')"
  white_count="$(printf '%s\n' "$crop_counts" | awk -F= '/^white_count=/ { print $2 }')"

  failed=0
  for color in red green blue white; do
    eval "count=\${${color}_count:-0}"
    if [ "$count" -lt "$threshold" ]; then
      echo "error: ${label}_${color}_count below threshold: $count < $threshold" >&2
      failed=1
    fi
  done
  if [ "$failed" -ne 0 ]; then
    exit 1
  fi

  echo "${label}_pixel_screenshot=$artifact"
  echo "${label}_pixel_crop=${crop_width}x${crop_height}+${crop_x}+${crop_y}"
  echo "${label}_pixel_detected_bounds=$detected_bounds"
  echo "${label}_pixel_threshold=$threshold"
  echo "${label}_pixel_tolerance=red(|r-255|<=35,g<=70,b<=70);green(r<=90,g>=140,b<=90);blue(r<=90,g<=90,b>=140);white(r>=190,g>=190,b>=190)"
  printf '%s\n' "$crop_counts" | sed "s/^/${label}_/"
}

run_case() {
  label="$1"
  render_command="$2"
  marker="$tmpdir/$label-marker"
  log="$tmpdir/$label-render.log"
  command_script="$tmpdir/run-iterm2-$label-sixel.sh"
  sixel_output="$tmpdir/$label-sixel-output.bin"
  stdout_output="$tmpdir/$label-sixel-stdout.bin"
  artifact="$artifact_dir/termplot-iterm2-$label-sixel-$(basename "$tmpdir").png"
  title="TermPlot iTerm2 ${label} SIXEL probe $(basename "$tmpdir")"

  marker_q="$(shell_quote "$marker")"
  log_q="$(shell_quote "$log")"
  sixel_output_q="$(shell_quote "$sixel_output")"
  stdout_output_q="$(shell_quote "$stdout_output")"
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
$render_command --capture=$sixel_output_q > $stdout_output_q 2>> $log_q
render_status=\$?
printf '${label}_status=%s\n' "\$render_status" >> $log_q
date '+render_done_at=%Y-%m-%dT%H:%M:%S%z' >> $log_q
if [ "\$render_status" -eq 0 ]; then
  cat $stdout_output_q
  printf 'rendered\n' > $marker_q
else
  printf 'failed\n' > $marker_q
fi
sleep $visible_seconds_q
exit
EOF
  chmod +x "$command_script"

  command="/bin/sh $(shell_quote "$command_script")"

  echo "${label}_command_script=$command_script"
  echo "${label}_marker=$marker"
  echo "${label}_log=$log"
  echo "${label}_sixel_output=$sixel_output"
  echo "${label}_stdout_output=$stdout_output"
  echo "${label}_title=$title"
  echo "${label}_screenshot=$artifact"

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
          echo "error: $label SIXEL renderer failed inside iTerm2" >&2
          sed 's/^/  /' "$log" >&2
          exit 1
          ;;
        started)
          ;;
        *)
          echo "error: unexpected $label marker state: $state" >&2
          print_matching_processes >&2
          exit 1
          ;;
      esac
    fi

    sleep 0.2
  done

  if [ "$state" != "rendered" ]; then
    echo "error: timed out waiting for iTerm2 $label SIXEL render marker" >&2
    print_matching_processes >&2
    if [ -f "$log" ]; then
      sed 's/^/  /' "$log" >&2
    fi
    exit 1
  fi

  if ! cmp -s "$sixel_output" "$stdout_output"; then
    echo "error: $label stdout and capture bytes differ" >&2
    exit 1
  fi
  assert_sixel_output "$label" "$sixel_output"

  probe_pids="$(probe_iterm_pids || true)"
  if [ -z "$probe_pids" ]; then
    echo "error: no probe-owned iTerm2 process found before $label screenshot" >&2
    print_matching_processes >&2
    exit 1
  fi
  echo "${label}_probe_iterm2_pids=$(printf '%s' "$probe_pids" | tr '\n' ' ')"

  window_info=""
  window_deadline=$(( $(date +%s) + 5 ))
  while [ "$(date +%s)" -le "$window_deadline" ]; do
    if window_info="$(swift "$window_probe" "$(basename "$tmpdir")" "$label" 2>/dev/null)"; then
      break
    fi
    sleep 0.2
  done

  if [ -z "$window_info" ]; then
    echo "error: could not discover probe-owned $label iTerm2 window bounds" >&2
    print_matching_processes >&2
    exit 1
  fi

  printf '%s\n' "$window_info" | sed "s/^/${label}_/"
  window_bounds="$(printf '%s\n' "$window_info" | awk -F= '/^window_bounds=/ { print $2; exit }')"
  if [ -z "$window_bounds" ]; then
    echo "error: discovered $label iTerm2 window did not report bounds" >&2
    exit 1
  fi

  rect_x="$(printf '%s' "$window_bounds" | awk -F, '{ print $1 }')"
  rect_y="$(printf '%s' "$window_bounds" | awk -F, '{ print $2 }')"
  rect_width="$(printf '%s' "$window_bounds" | awk -F, '{ print $3 }')"
  rect_height="$(printf '%s' "$window_bounds" | awk -F, '{ print $4 }')"
  echo "${label}_capture_rect=$rect_x,$rect_y,$rect_width,$rect_height"

  if ! screencapture -x -R"$rect_x,$rect_y,$rect_width,$rect_height" "$artifact"; then
    echo "error: screencapture failed; macOS Screen Recording permission may be missing" >&2
    exit 1
  fi

  if [ ! -s "$artifact" ]; then
    echo "error: $label screenshot file is missing or empty: $artifact" >&2
    exit 1
  fi

  echo "${label}_marker_state=rendered"
  echo "${label}_render_log:"
  sed "s/^/${label}_  /" "$log"
  echo "${label}_sixel_protocol_attribution=sixel-dcs"
  echo "${label}_sixel_output_bytes=$(wc -c < "$sixel_output" | tr -d ' ')"
  echo "${label}_sixel_stdout_bytes=$(wc -c < "$stdout_output" | tr -d ' ')"
  echo "${label}_sixel_stdout_capture_identical=yes"
  echo "${label}_contains_sixel_dcs=yes"
  echo "${label}_contains_kitty_apc=no"
  echo "${label}_contains_osc1337_file=no"
  echo "${label}_screenshot_bytes=$(wc -c < "$artifact" | tr -d ' ')"
  sips -g pixelWidth -g pixelHeight "$artifact" 2>/dev/null | sed "s/^/${label}_screenshot_/" || true
  assert_pixels "$label" "$artifact"

  cleanup_probe_processes
  if [ -n "$(probe_iterm_pids || true)" ]; then
    echo "error: probe-owned iTerm2 process remained after $label cleanup" >&2
    exit 1
  fi
}

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"
iterm_pids > "$pre_pids"
iterm_server_pids > "$pre_server_pids"
rustc "$rust_fixture" -o "$rust_bin"

for key in $temporary_default_keys; do
  save_iterm_default "$key"
done
defaults write com.googlecode.iterm2 SUEnableAutomaticChecks -bool false
defaults write com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing -bool true

cat > "$window_probe" <<'EOF'
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 3 else {
  fputs("usage: find-iterm-window <title-fragment> <label>\n", stderr)
  exit(2)
}

let titleFragment = CommandLine.arguments[1]
let label = CommandLine.arguments[2]
let options: CGWindowListOption = [.optionOnScreenOnly, .excludeDesktopElements]
guard let windows = CGWindowListCopyWindowInfo(options, kCGNullWindowID) as? [[String: Any]] else {
  exit(1)
}

for window in windows {
  let owner = window[kCGWindowOwnerName as String] as? String ?? ""
  let name = window[kCGWindowName as String] as? String ?? ""
  guard owner.contains("iTerm") && name.contains(titleFragment) && name.contains(label) else {
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

echo "iterm2_probe_tmpdir=$tmpdir"
echo "iterm_app=$iterm_app"
echo "node_fixture=$node_fixture"
echo "rust_fixture=$rust_fixture"
echo "rust_bin=$rust_bin"
echo "window_control=CSI 3;$capture_x;${capture_y}t, CSI 8;$window_rows;${window_columns}t"
echo "preexisting_iterm2_pids=$(tr '\n' ' ' < "$pre_pids")"
echo "preexisting_iterm2_server_pids=$(tr '\n' ' ' < "$pre_server_pids")"
echo "iterm2_prompt_prevention=temporary SUEnableAutomaticChecks=false NoSyncSuppressDownloadConfirmation=true NoSyncSuppressPromptToEnableResizing=true NoSyncSuppressPromptToEnableUnfocusedResizing=true"

run_case node "node $(shell_quote "$node_fixture")"
run_case rust "$(shell_quote "$rust_bin")"

remaining_servers="$(new_iterm_server_pids || true)"
if [ -n "$remaining_servers" ]; then
  echo "error: probe-attributed iTermServer process remained after cleanup: $(printf '%s' "$remaining_servers" | tr '\n' ' ')" >&2
  exit 1
fi

echo "post_cleanup_preexisting_iterm2_pids=$(tr '\n' ' ' < "$pre_pids")"
echo "post_cleanup_preexisting_iterm2_server_pids=$(tr '\n' ' ' < "$pre_server_pids")"
echo "iterm2_processes=cleaned"
echo "pass: iTerm2 rendered Node and Rust SIXEL output, pixels matched, and cleanup completed"
