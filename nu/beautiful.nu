let plotlyTemplate = {
  data: []
  layout: {}
  config: {}
}

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

let plotlyTemplateConfig = {
  responsive: false
  staticPlot: true
}

let plotlyTemplateDataScatter = {
  x: [1 2 3 4 5]
  y: [2 3 1 5 4]
  type: "scatter"
  mode: "markers"
  name: "Green Data"
  marker: {
    color: "#a6e3a1"
    size: 8
  }
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

def create_data_points_scatter [
  xy: list<list<number>>
  --name: string = "Data Points"
  --color: string = "#a6e3a1"
  --size: number = 8
] {
  let x = $xy | each {|xy| $xy | get 0 }
  let y = $xy | each {|xy| $xy | get 1 }
  let points = $plotlyTemplateDataScatter | merge {
    x: $x
    y: $y
    name: $name
    marker: {
      color: $color
      size: $size
    }
  }
  $points
}

let dataScatter = create_data_points_scatter [[1 2] [1 2]]
print "hello" $dataScatter.x $dataScatter.y
