# this tool requires the plugin, but you can't "plugin use" from a module
# plugin use termplot

# Your def (updated with dynamic path)
export def main []: [record -> nothing] {
  let input = $in
  # Get the directory of this file (handles sourcing from other locations)
  let dirname = if ($env.CURRENT_FILE? | is-empty) {
    $env.FILE_PWD # Fallback if not sourced
  } else {
    ($env.CURRENT_FILE | path dirname)
  }
  $input | termplot render | node $"($dirname)/build/cli/display-image.js"
}
