plugin use termplot

# Get the directory of this file (handles sourcing from other locations)
let dirname = if ($env.CURRENT_FILE? | is-empty) {
  $env.FILE_PWD  # Fallback if not sourced
} else {
  ($env.CURRENT_FILE | path dirname)
}

# Your def (updated with dynamic path)
def termplot []: [record -> nothing] {
  termplot render | node $"($dirname)/build/cli/display-image.js"
}
