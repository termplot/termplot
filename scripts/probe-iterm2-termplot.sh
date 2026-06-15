#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: iTerm2 TermPlot probing is currently macOS-only" >&2
  exit 1
fi

for required in defaults open screencapture sips gm perl node swift; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

repo_root="$(pwd -P)"
node_bin="$(command -v node)"
termplot="${TERMPLOT_CLI:-$repo_root/build/bin/termplot.js}"
config="${TERMPLOT_PROBE_CONFIG:-$repo_root/scripts/fixtures/full-stack-plotly-config.json}"
iterm_app="${ITERM2_APP:-iTerm.app}"
visible_seconds="${ITERM2_TERMPLOT_PROBE_VISIBLE_SECONDS:-8}"
timeout_seconds="${ITERM2_TERMPLOT_PROBE_TIMEOUT_SECONDS:-60}"
tmpdir="$(mktemp -d "/tmp/tp-iterm2.XXXXXX")"
artifact_dir="${ITERM2_TERMPLOT_PROBE_ARTIFACT_DIR:-/tmp}"
artifact="$artifact_dir/termplot-iterm2-full-stack-$(basename "$tmpdir").png"
capture_x="${ITERM2_TERMPLOT_PROBE_X:-80}"
capture_y="${ITERM2_TERMPLOT_PROBE_Y:-120}"
capture_width="${ITERM2_TERMPLOT_PROBE_WIDTH:-1200}"
capture_height="${ITERM2_TERMPLOT_PROBE_HEIGHT:-800}"
window_columns="${ITERM2_TERMPLOT_PROBE_COLUMNS:-100}"
window_rows="${ITERM2_TERMPLOT_PROBE_ROWS:-36}"
threshold="${ITERM2_TERMPLOT_PROBE_THRESHOLD:-80}"
marker="$tmpdir/marker"
render_log="$tmpdir/render.log"
daemon_log="$tmpdir/termplotd.log"
socket="$tmpdir/termplotd.sock"
command_script="$tmpdir/run-iterm2-termplot.sh"
pre_pids="$tmpdir/pre-pids.txt"
pre_server_pids="$tmpdir/pre-server-pids.txt"
window_probe="$tmpdir/find-iterm-window.swift"
temporary_default_keys="SUEnableAutomaticChecks NoSyncSuppressDownloadConfirmation NoSyncSuppressPromptToEnableResizing NoSyncSuppressPromptToEnableUnfocusedResizing"
title="TermPlot iTerm2 full stack $(basename "$tmpdir")"

if [ ! -f "$termplot" ]; then
  echo "error: built TermPlot CLI not found: $termplot; run pnpm run build" >&2
  exit 1
fi

if [ ! -f "$config" ]; then
  echo "error: Plotly probe config not found: $config" >&2
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

cleanup_probe_processes() {
  node "$termplot" daemon stop --socket "$socket" >/dev/null 2>&1 || true

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
    if [ ! -s "$pre_pids" ] && [ ! -s "$pre_server_pids" ]; then
      echo "cleanup_iterm2_server_pids=$(printf '%s' "$server_pids" | tr '\n' ' ')"
      for pid in $server_pids; do
        kill "$pid" 2>/dev/null || true
      done
    else
      echo "error: new iTermServer PIDs cannot be safely attributed with preexisting iTerm processes: $(printf '%s' "$server_pids" | tr '\n' ' ')" >&2
      return 1
    fi
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
  cleanup_probe_processes || true
  restore_iterm_defaults
  rm -rf "$tmpdir"
  exit "$rc"
}

shell_quote() {
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"
iterm_pids > "$pre_pids"
iterm_server_pids > "$pre_server_pids"

for key in $temporary_default_keys; do
  save_iterm_default "$key"
done
defaults write com.googlecode.iterm2 SUEnableAutomaticChecks -bool false
defaults write com.googlecode.iterm2 NoSyncSuppressDownloadConfirmation -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableResizing -bool true
defaults write com.googlecode.iterm2 NoSyncSuppressPromptToEnableUnfocusedResizing -bool true

termplot_q="$(shell_quote "$termplot")"
node_q="$(shell_quote "$node_bin")"
config_q="$(shell_quote "$config")"
socket_q="$(shell_quote "$socket")"
daemon_log_q="$(shell_quote "$daemon_log")"
render_log_q="$(shell_quote "$render_log")"
marker_q="$(shell_quote "$marker")"
visible_seconds_q="$(shell_quote "$visible_seconds")"
title_q="$(shell_quote "$title")"

cat > "$command_script" <<EOF
#!/bin/sh
set -eu
now_ms() { $node_q -e 'process.stdout.write(String(Date.now()))'; }
json_field() {
  $node_q -e 'let s=""; process.stdin.on("data", c => s += c); process.stdin.on("end", () => { const path = process.argv[1].split("."); let value = JSON.parse(s); for (const key of path) value = value[key]; process.stdout.write(String(value)); });' "\$1"
}
successes=0
printf 'status=started\n' >> $render_log_q
printf 'child_pid=%s\n' "\$\$" >> $render_log_q
printf 'child_ppid=%s\n' "\$PPID" >> $render_log_q
printf 'started\n' > $marker_q
printf '\\033]0;%s\\007' $title_q
printf '\\033[3;%s;%st' "$capture_x" "$capture_y"
printf '\\033[8;%s;%st' "$window_rows" "$window_columns"
sleep 0.8
for pair in 1 2 3; do
  $node_q $termplot_q daemon stop --socket $socket_q >/dev/null 2>&1 || true
  cold_start=\$(now_ms)
  $node_q $termplot_q render --file $config_q --socket $socket_q --ttl-ms 30000 --log $daemon_log_q --timeout-ms 30000 --protocol iterm2
  cold_status=\$?
  cold_end=\$(now_ms)
  $node_q $termplot_q daemon status --socket $socket_q > "$tmpdir/status-cold-\$pair.json"
  cold_pid=\$(json_field status.pid < "$tmpdir/status-cold-\$pair.json")
  cold_children=\$(ps -axo pid=,ppid= | awk -v ppid="\$cold_pid" '\$2 == ppid { print \$1 }' | tr '\n' ' ')
  warm_start=\$(now_ms)
  $node_q $termplot_q render --file $config_q --socket $socket_q --ttl-ms 30000 --log $daemon_log_q --timeout-ms 30000 --protocol iterm2
  warm_status=\$?
  warm_end=\$(now_ms)
  $node_q $termplot_q daemon status --socket $socket_q > "$tmpdir/status-warm-\$pair.json"
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
EOF
chmod +x "$command_script"

cat > "$window_probe" <<'EOF'
import CoreGraphics
import Foundation

guard CommandLine.arguments.count == 2 else {
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

echo "iterm2_termplot_probe_tmpdir=$tmpdir"
echo "iterm_app=$iterm_app"
echo "termplot=$termplot"
echo "node=$node_bin"
echo "config=$config"
echo "socket=$socket"
echo "daemon_log=$daemon_log"
echo "render_log=$render_log"
echo "command_script=$command_script"
echo "title=$title"
echo "screenshot=$artifact"
echo "preexisting_iterm2_pids=$(tr '\n' ' ' < "$pre_pids")"
echo "preexisting_iterm2_server_pids=$(tr '\n' ' ' < "$pre_server_pids")"

open -na "$iterm_app" --args --command="$command"

deadline=$(( $(date +%s) + timeout_seconds ))
state=""
window_info=""

while [ "$(date +%s)" -le "$deadline" ]; do
  if [ -z "$window_info" ]; then
    window_info="$(swift "$window_probe" "$title" 2>/dev/null || true)"
  fi
  if [ -f "$marker" ]; then
    state="$(cat "$marker")"
    case "$state" in
      rendered)
        break
        ;;
      failed)
        echo "error: TermPlot render timing proof failed inside iTerm2" >&2
        sed 's/^/  /' "$render_log" >&2
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
  echo "error: timed out waiting for iTerm2 TermPlot render marker" >&2
  if [ -f "$render_log" ]; then
    sed 's/^/  /' "$render_log" >&2
  fi
  exit 1
fi

if [ -z "$window_info" ]; then
  window_info="$(swift "$window_probe" "$title" 2>/dev/null || true)"
fi

if [ -z "$window_info" ]; then
  echo "error: could not discover probe-owned iTerm2 window" >&2
  exit 1
fi

printf '%s\n' "$window_info"
window_bounds="$(printf '%s\n' "$window_info" | awk -F= '/^window_bounds=/ { print $2; exit }')"
if [ -z "$window_bounds" ]; then
  echo "error: missing iTerm2 window bounds" >&2
  exit 1
fi
echo "capture_rect=$window_bounds"

if ! screencapture -x -R"$window_bounds" "$artifact"; then
  echo "error: screencapture failed; macOS Screen Recording permission may be missing" >&2
  exit 1
fi

if [ ! -s "$artifact" ]; then
  echo "error: screenshot file is missing or empty: $artifact" >&2
  exit 1
fi

sips -g pixelWidth -g pixelHeight "$artifact" 2>/dev/null | sed 's/^/screenshot_/'
counts="$(
  gm convert "$artifact" txt:- |
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

echo "iterm2_processes=cleaned"
echo "termplot_daemon=stopped"
echo "pass: iTerm2 rendered TermPlot output, pixels matched, daemon warmed, and cleanup completed"
