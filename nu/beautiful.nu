let plotlyTemplate = {
  data: []
  layout: {}
  config: {}
}

let scatterDataPointsTemplate = {
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

# catcpuccin bright color
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

def create_scatter_points [
  xy: list<list<number>>
  --name: string
  --color: string
] {
  let x = $xy | each {|xy| $xy | get 0 }
  let y = $xy | each {|xy| $xy | get 1 }
  let points = scatterDataPointsTemplate | merge {
    x: $x
    y: $y
    name: $name
    marker: {
      color: $color
      size: 10
      line: {
        color: "#cdd6f4" # Catppuccin Text for outline
        width: 1
      }
    }
  }
}
