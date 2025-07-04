let plotlyTemplate = {
  data: []
  layout: {}
  config: {}
}

let plotlyTemplateConfig = {
  responsive: false
  staticPlot: true
}

# catpuccin bright color
let brightColors = [
  {name: "Green" hex: "#a6e3a1"}
  {name: "Teal" hex: "#94e2d5"}
  {name: "Sky" hex: "#89dceb"}
  {name: "Sapphire" hex: "#74c7ec"}
  {name: "Blue" hex: "#89b4fa"}
  {name: "Lavender" hex: "#b4befe"}
  {name: "Rosewater" hex: "#f5e0dc"}
  {name: "Flamingo" hex: "#f2cdcd"}
  {name: "Pink" hex: "#f5c2e7"}
  {name: "Mauve" hex: "#cba6f7"}
  {name: "Red" hex: "#f38ba8"}
  {name: "Maroon" hex: "#eba0ac"}
  {name: "Peach" hex: "#fab387"}
  {name: "Yellow" hex: "#f9e2af"}
]

def "beautiful scatter" []: [
  record -> record list<record> -> record
] {
  mut plotly = $plotlyTemplate
  let plotlyTemplateLayout = {
    title: {
      text: "Scatter Plot with Three Sets of Dots"
      x: 0.5
      xanchor: "center"
      font: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 20
        color: "#cdd6f4"
      }
    }
    xaxis: {
      title: {
        text: "X Axis"
        font: {
          family: "Roboto Mono, Fira Code, monospace"
          size: 14
          color: "#cdd6f4"
        }
      }
      gridcolor: "#45475a"
      linecolor: "#45475a"
      ticks: "outside"
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
        color: "#cdd6f4"
      }
    }
    yaxis: {
      title: {
        text: "Y Axis"
        font: {
          family: "Roboto Mono, Fira Code, monospace"
          size: 14
          color: "#cdd6f4"
        }
      }
      gridcolor: "#45475a"
      linecolor: "#45475a"
      ticks: "outside"
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
        color: "#cdd6f4"
      }
    }
    width: 1080
    height: 810
    plot_bgcolor: "#1e1e2e"
    paper_bgcolor: "#1e1e2e"
    font: {
      family: "Roboto Mono, Fira Code, monospace"
      color: "#cdd6f4"
    }
    showlegend: true
    legend: {
      font: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
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
  $plotly.layout = $plotlyTemplateLayout
  $plotly.config = $plotlyTemplateConfig
  $plotly
}

def "beautiful scatter add" [
  data: record
] {
  mut plotly = $in
  if $plotly.data == null {
    $plotly = $in | merge {data: []}
  }
  let dataLen = $plotly.data | length
  let brightColor = $brightColors | get ($dataLen mod ($brightColors | length)) | get "hex"
  let data = {
    type: "scatter"
    mode: "markers"
    marker: {
      size: 10
      line: {
        color: $brightColor # Catppuccin Text for outline
        width: 1
      }
    }
  } | merge $data
  $plotly.data = $plotly.data | append $data
  $plotly
}
