let testObject = {
  data: [
    # Heatmap for decision boundaries (simulated grid of class predictions)
    {
      z: [
        [0 0 0 0 1 1 1 1]
        [0 0 0 1 1 1 1 1]
        [0 0 0 1 1 2 2 2]
        [0 0 1 1 2 2 2 2]
        [0 0 1 2 2 2 2 2]
        [0 1 1 2 2 2 2 2]
        [1 1 2 2 2 2 2 2]
        [1 1 2 2 2 2 2 2]
      ] # Grid of class labels (0, 1, 2) simulating neural network predictions
      x: [-2 -1.5 -1 -0.5 0 0.5 1 1.5] # X coordinates for heatmap grid
      y: [-2 -1.5 -1 -0.5 0 0.5 1 1.5] # Y coordinates for heatmap grid
      type: "heatmap"
      colorscale: [
        [0 "#7aa2a1"] # Lighter shade of Catppuccin Green for Class 0 region
        [0.5 "#8a9efe"] # Lighter shade of Catppuccin Lavender for Class 1 region
        [1 "#ab86f7"] # Lighter shade of Catppuccin Mauve for Class 2 region
      ]
      showscale: false # Hide color scale bar since legend will show class info
      opacity: 0.5 # Semi-transparent to allow overlap visibility with scatter points
    }
    # Scatter plot for three sets of data points
    {
      x: [-1.5 -1 -0.5 -1.2 -0.8]
      y: [-1.5 -1 -1.2 -0.5 -0.8]
      type: "scatter"
      mode: "markers"
      name: "Class 0 (Green)"
      marker: {
        color: "#a6e3a1" # Catppuccin Green for first set of dots
        size: 10
        line: {
          color: "#cdd6f4" # Catppuccin Text for outline
          width: 1
        }
      }
    }
    {
      x: [0.5 0 -0.5 0.2 -0.2]
      y: [0.5 1 0 0.8 -0.5]
      type: "scatter"
      mode: "markers"
      name: "Class 1 (Lavender)"
      marker: {
        color: "#b4befe" # Catppuccin Lavender for second set of dots
        size: 10
        line: {
          color: "#cdd6f4" # Catppuccin Text for outline
          width: 1
        }
      }
    }
    {
      x: [1 1.5 0.8 1.2 0.5]
      y: [0.5 1 1.5 -0.5 1.2]
      type: "scatter"
      mode: "markers"
      name: "Class 2 (Mauve)"
      marker: {
        color: "#cba6f7" # Catppuccin Mauve for third set of dots
        size: 10
        line: {
          color: "#cdd6f4" # Catppuccin Text for outline
          width: 1
        }
      }
    }
  ]
  layout: {
    title: {
      text: "Scatter Plot with Decision Boundaries"
      x: 0.5
      xanchor: "center"
      font: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 20
        color: "#cdd6f4" # Catppuccin Text for readability
      }
    }
    xaxis: {
      title: {
        text: "Feature 1"
        font: {
          family: "Roboto Mono, Fira Code, monospace"
          size: 14
          color: "#cdd6f4" # Catppuccin Text
        }
      }
      gridcolor: "#45475a" # Catppuccin Surface1 for subtle grid
      linecolor: "#45475a" # Catppuccin Surface1 for axis line
      ticks: "outside"
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
        color: "#cdd6f4" # Catppuccin Text
      }
      range: [-2 2] # Set range to cover the grid
    }
    yaxis: {
      title: {
        text: "Feature 2"
        font: {
          family: "Roboto Mono, Fira Code, monospace"
          size: 14
          color: "#cdd6f4" # Catppuccin Text
        }
      }
      gridcolor: "#45475a" # Catppuccin Surface1 for subtle grid
      linecolor: "#45475a" # Catppuccin Surface1 for axis line
      ticks: "outside"
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
        color: "#cdd6f4" # Catppuccin Text
      }
      range: [-2 2] # Set range to cover the grid
    }
    width: 1080
    height: 810
    plot_bgcolor: "#1e1e2e" # Catppuccin Base for dark background (plot area)
    paper_bgcolor: "#1e1e2e" # Catppuccin Base for surrounding area
    font: {
      family: "Roboto Mono, Fira Code, monospace"
      color: "#cdd6f4" # Catppuccin Text as default font color
    }
    showlegend: true
    legend: {
      font: {
        family: "Roboto Mono, Fira Code, monospace"
        size: 12
        color: "#cdd6f4" # Catppuccin Text
      }
      bgcolor: "#313244" # Catppuccin Surface0 for slightly lighter legend background
      bordercolor: "#45475a" # Catppuccin Surface1 for border
      borderwidth: 1
      x: 1
      xanchor: "right"
      y: 1
    }
  }
  config: {
    responsive: true
    staticPlot: true # Disable interactivity for static screenshots
  }
}

def testF [input: list<int>] {
  # Example function that processes input and returns a list of integers
  $input | get 0
}
