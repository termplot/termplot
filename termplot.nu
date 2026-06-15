export def termplot [
  --output: path
  --protocol: string = "auto"
  --socket: path
  --ttl-ms: int
  --log: path
  --timeout-ms: int
  --cli: path
  --display
]: any -> any {
  let script_dir = if (($env.CURRENT_FILE? | default "") == "") {
    (pwd)
  } else {
    ($env.CURRENT_FILE | path dirname)
  }
  let cli_path = if $cli == null {
    ($script_dir | path join "build" "bin" "termplot.js")
  } else {
    $cli
  }

  let plot_json = ($in | to json --raw)
  let json_file = (mktemp -t termplot-nu-config.XXXXXX)
  let png_file = (mktemp -t termplot-nu-output.XXXXXX)

  try {
    $plot_json | save --force $json_file
    mut args = ["render" "--file" $json_file "--protocol" $protocol]
    if $socket != null {
      $args = ($args | append "--socket" | append ($socket | path expand))
    }
    if $ttl_ms != null {
      $args = ($args | append "--ttl-ms" | append ($ttl_ms | into string))
    }
    if $log != null {
      $args = ($args | append "--log" | append ($log | path expand))
    }
    if $timeout_ms != null {
      $args = ($args | append "--timeout-ms" | append ($timeout_ms | into string))
    }

    if $display {
      ^$cli_path ...$args
      return
    }

    if $output != null {
      $args = ($args | append "--output" | append ($output | path expand))
      return (^$cli_path ...$args | from json)
    }

    $args = ($args | append "--output" | append $png_file)
    let _metadata = (^$cli_path ...$args | from json)
    open --raw $png_file
  } finally {
    rm --force $json_file
    rm --force $png_file
  }
}
