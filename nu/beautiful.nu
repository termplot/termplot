let beautifulPlotlyTemplate = {
  data: []
  layout: {}
  config: {}
}

let beautifulConfigTemplate = {
  responsive: false
  staticPlot: true
}

def hex_to_rgb [hex: string] {
  let hex = ($hex | str replace '#' '') # Remove '#' prefix
  let r = ($hex | str substring 0..1 | into int -r 16) # First 2 chars to decimal
  let g = ($hex | str substring 2..3 | into int -r 16) # Next 2 chars to decimal
  let b = ($hex | str substring 4..5 | into int -r 16) # Last 2 chars to decimal
  return $"rgb\(($r), ($g), ($b)\)"
}

# catpuccin bright color
let beautifulBrightColors = [
  {name: "Green" hex: "#a6e3a1" rgb: (hex_to_rgb "#a6e3a1")}
  {name: "Teal" hex: "#94e2d5" rgb: (hex_to_rgb "#94e2d5")}
  {name: "Sky" hex: "#89dceb" rgb: (hex_to_rgb "#89dceb")}
  {name: "Sapphire" hex: "#74c7ec" rgb: (hex_to_rgb "#74c7ec")}
  {name: "Blue" hex: "#89b4fa" rgb: (hex_to_rgb "#89b4fa")}
  {name: "Lavender" hex: "#b4befe" rgb: (hex_to_rgb "#b4befe")}
  {name: "Rosewater" hex: "#f5e0dc" rgb: (hex_to_rgb "#f5e0dc")}
  {name: "Flamingo" hex: "#f2cdcd" rgb: (hex_to_rgb "#f2cdcd")}
  {name: "Pink" hex: "#f5c2e7" rgb: (hex_to_rgb "#f5c2e7")}
  {name: "Mauve" hex: "#cba6f7" rgb: (hex_to_rgb "#cba6f7")}
  {name: "Red" hex: "#f38ba8" rgb: (hex_to_rgb "#f38ba8")}
  {name: "Maroon" hex: "#eba0ac" rgb: (hex_to_rgb "#eba0ac")}
  {name: "Peach" hex: "#fab387" rgb: (hex_to_rgb "#fab387")}
  {name: "Yellow" hex: "#f9e2af" rgb: (hex_to_rgb "#f9e2af")}
]

let beautifulDataPointScatterTemplate = {
  type: "scatter"
  mode: "markers"
  marker: {
    size: 10
    color: "#a6e3a1" # Default color
  }
}

let BeautifulLayoutTemplate = {
  title: {
    text: "Scatter Plot"
    x: 0.5
    xanchor: "center"
    font: {
      family: "monospace"
      size: 30
      color: "#cdd6f4"
    }
  }
  xaxis: {
    title: {
      text: "X Axis"
      font: {
        family: "monospace"
        size: 20
        color: "#cdd6f4"
      }
    }
    gridcolor: "#45475a"
    linecolor: "#45475a"
    ticks: "outside"
    tickfont: {
      family: "monospace"
      size: 18
      color: "#cdd6f4"
    }
  }
  yaxis: {
    title: {
      text: "Y Axis"
      font: {
        family: "monospace"
        size: 20
        color: "#cdd6f4"
      }
    }
    gridcolor: "#45475a"
    linecolor: "#45475a"
    ticks: "outside"
    tickfont: {
      family: "monospace"
      size: 18
      color: "#cdd6f4"
    }
  }
  width: 1080
  height: 810
  plot_bgcolor: "#1e1e2e"
  paper_bgcolor: "#1e1e2e"
  font: {
    family: "monospace"
    color: "#cdd6f4"
  }
  showlegend: true
  legend: {
    font: {
      family: "monospace"
      size: 20
      color: "#cdd6f4"
    }
    bgcolor: "#313244"
    bordercolor: "#45475a"
    borderwidth: 1
    x: 1
    xanchor: "right"
    y: 1
  }
}

# Generates catpuccin-themed plotly configuration files
def beautiful [] {
  print "Run `beautiful --help` to see available commands."
}

# Generate a Catppuccin-themed colorscale for Plotly colorscales.
def "beautiful colorscale" [
  count: int = 14 # Total number of colors in the colorscale (must be > 0)
]: [nothing -> list<list>] {
  # Validate input
  if $count <= 0 {
    error make {msg: "Count must be greater than 0"}
  }

  let colorListLength = ($beautifulBrightColors | length)
  let stepSize = 5 # Step size for cycling through colors to increase contrast
  mut colorscale = []

  # Handle the case of count == 1 separately
  if $count == 1 {
    let color = $beautifulBrightColors | get 0 | get hex
    $colorscale = [[0.0 $color] [1.0 $color]]
  } else {
    # Calculate step size for normalized values (0 to 1)
    let step = 1.0 / ($count - 1.0)

    # Generate the colorscale by cycling through brightColors with a larger step
    for $i in 0..($count - 1) {
      let value = ($i * $step)
      let colorIndex = (($i * $stepSize) mod $colorListLength)
      let color = $beautifulBrightColors | get $colorIndex | get hex
      $colorscale = $colorscale | append [[$value $color]]
    }
  }

  return $colorscale
}

# Generates a catpuccin-themed scatter plot using plotly
#
# You can input a single plotly data record or a list of records. If you don't
# input data, the config file will not contain any data. See the plotly
# documentation for more information on how to configure the data record.
def "beautiful scatter" []: [
  record -> record list<record> -> record
] {
  mut plotly = $beautifulPlotlyTemplate
  $plotly.data = []
  let input_data = $in
  if (($input_data | describe -d | get type) == "list") {
    for $data in $input_data {
      if ($data | describe -d | get type) == "record" {
        $plotly = $plotly | beautiful scatter add $data
      } else {
        error make {msg: "Expected a list of records, got $data"}
      }
    }
  } else if ($input_data | describe -d | get type) == "record" {
    $plotly = $plotly | beautiful scatter add $input_data
  } else if ($input_data != null) {
    error make {msg: "Expected a record or a list of records, got $input_data"}
  }
  $plotly.layout = $BeautifulLayoutTemplate
  $plotly.config = $beautifulConfigTemplate
  $plotly
}

# Adds a catpuccin-themed scatter plot data record to the plotly template. See
# the plotly documentation for more information on how to configure the data
# record.
def "beautiful scatter add" [
  data: record
]: [record -> record] {
  mut plotly = $in
  if $plotly.data == null {
    $plotly = $in | merge deep {data: []}
  }
  let dataLen = $plotly.data | length
  let stepSize = 5 # Step size for cycling through colors to increase contrast
  let brightColor = $beautifulBrightColors | get (($dataLen * $stepSize) mod ($beautifulBrightColors | length)) | get "hex"
  mut data = $beautifulDataPointScatterTemplate | merge deep {
    marker: {
      color: $brightColor
    }
  } | merge deep $data
  if ((not ('colorscale' in $data.marker)) and ($data.marker.color | describe -d | get type) == "list") {
    let min = ($data.marker.color | math min | into float)
    let max = ($data.marker.color | math max | into float)
    $data.marker.colorscale = beautiful colorscale 14
  }
  $plotly.data = $plotly.data | append $data
  $plotly
}
