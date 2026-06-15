#!/bin/sh
set -eu

if [ "$(uname -s)" != "Darwin" ]; then
  echo "error: Ghostty pixel probing is currently macOS-only" >&2
  exit 1
fi

for required in gm sips perl; do
  if ! command -v "$required" >/dev/null 2>&1; then
    echo "error: required command not found: $required" >&2
    exit 1
  fi
done

screenshot_probe="${GHOSTTY_SCREENSHOT_PROBE:-scripts/probe-ghostty-screenshot.sh}"
if [ ! -x "$screenshot_probe" ]; then
  echo "error: screenshot probe is not executable: $screenshot_probe" >&2
  exit 1
fi

tmpdir="$(mktemp -d "${TMPDIR:-/tmp}/termplot-ghostty-pixel-probe.XXXXXX")"
probe_log="$tmpdir/screenshot-probe.log"
artifact_dir="${GHOSTTY_PIXEL_PROBE_ARTIFACT_DIR:-/tmp}"
artifact="$artifact_dir/termplot-ghostty-pixel-$(basename "$tmpdir").png"
threshold="${GHOSTTY_PIXEL_PROBE_THRESHOLD:-20}"
crop_width="${GHOSTTY_PIXEL_PROBE_CROP_WIDTH:-320}"
crop_height="${GHOSTTY_PIXEL_PROBE_CROP_HEIGHT:-320}"
crop_x="${GHOSTTY_PIXEL_PROBE_CROP_X:-0}"

cleanup() {
  rm -rf "$tmpdir"
}

trap cleanup EXIT INT TERM

mkdir -p "$artifact_dir"

"$screenshot_probe" > "$probe_log" 2>&1
cat "$probe_log"

screenshot="$(sed -n 's/^screenshot=//p' "$probe_log" | tail -n 1)"
if [ -z "$screenshot" ] || [ ! -s "$screenshot" ]; then
  echo "error: screenshot probe did not produce a nonempty screenshot" >&2
  exit 1
fi

if ! grep -q '^  timg_status=0$' "$probe_log"; then
  echo "error: screenshot probe did not record timg_status=0" >&2
  exit 1
fi

cp "$screenshot" "$artifact"
screenshot="$artifact"

pixel_height="$(sips -g pixelHeight "$screenshot" 2>/dev/null | awk '/pixelHeight:/ { print $2; exit }')"
if [ -z "$pixel_height" ]; then
  echo "error: could not read screenshot pixelHeight with sips" >&2
  exit 1
fi

# The rendered 32x32 image appears above the bottom shell prompt in the
# lower-left terminal content. Keep this crop small enough to avoid unrelated
# UI chrome, but tall enough to cover the prompt plus image placement variance.
crop_y=$(( pixel_height - 440 ))
if [ "$crop_y" -lt 0 ]; then
  crop_y=0
fi

counts="$(
  gm convert "$screenshot" -crop "${crop_width}x${crop_height}+${crop_x}+${crop_y}" txt:- |
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

echo "pixel_screenshot=$screenshot"
echo "pixel_crop=${crop_width}x${crop_height}+${crop_x}+${crop_y}"
echo "pixel_threshold=$threshold"
echo "pixel_tolerance=red(|r-255|<=35,g<=60,b<=60);green(r<=80,g>=150,b<=80);blue(r<=80,g<=80,b>=150);white(r>=200,g>=200,b>=200)"
printf '%s\n' "$counts"

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

echo "pixel_probe_tmpdir=$tmpdir"
echo "pass: screenshot contains expected red, green, blue, and white pixel evidence"
