const lossPlot: PlotlyConfig = {
  data: [
    {
      x: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
      y: [5.0, 4.2, 3.5, 3.0, 2.6, 2.3, 2.1, 1.9, 1.8, 1.7],
      type: "scatter",
      mode: "lines+markers",
      name: "Training Loss",
      line: {
        color: "#f38ba8", // Catppuccin Red for the line (bright and noticeable)
        width: 2,
      },
      marker: {
        color: "#f38ba8", // Catppuccin Red for markers
        size: 6,
      },
    },
  ],
  layout: {
    title: {
      text: "Machine Learning Loss Curve",
      x: 0.5,
      xanchor: "center",
      font: {
        family: "Roboto Mono, Fira Code, monospace",
        size: 20,
        color: "#cdd6f4", // Catppuccin Text for readability
      },
    },
    xaxis: {
      title: {
        text: "Epoch",
        font: {
          family: "Roboto Mono, Fira Code, monospace",
          size: 14,
          color: "#cdd6f4", // Catppuccin Text
        },
      },
      gridcolor: "#45475a", // Catppuccin Surface1 for subtle grid
      linecolor: "#45475a", // Catppuccin Surface1 for axis line
      ticks: "outside",
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace",
        size: 12,
        color: "#cdd6f4", // Catppuccin Text
      },
    },
    yaxis: {
      title: {
        text: "Loss",
        font: {
          family: "Roboto Mono, Fira Code, monospace",
          size: 14,
          color: "#cdd6f4", // Catppuccin Text
        },
      },
      gridcolor: "#45475a", // Catppuccin Surface1 for subtle grid
      linecolor: "#45475a", // Catppuccin Surface1 for axis line
      ticks: "outside",
      tickfont: {
        family: "Roboto Mono, Fira Code, monospace",
        size: 12,
        color: "#cdd6f4", // Catppuccin Text
      },
      range: [0, 5.5], // Set y-axis range to start from 0 for better visualization
    },
    width: 1080,
    height: 810,
    plot_bgcolor: "#1e1e2e", // Catppuccin Base for dark background (plot area)
    paper_bgcolor: "#1e1e2e", // Catppuccin Base for surrounding area
    font: {
      family: "Roboto Mono, Fira Code, monospace",
      color: "#cdd6f4", // Catppuccin Text as default font color
    },
    showlegend: true,
    legend: {
      font: {
        family: "Roboto Mono, Fira Code, monospace",
        size: 12,
        color: "#cdd6f4", // Catppuccin Text
      },
      bgcolor: "#313244", // Catppuccin Surface0 for slightly lighter legend background
      bordercolor: "#45475a", // Catppuccin Surface1 for border
      borderwidth: 1,
      x: 1,
      xanchor: "right",
      y: 1,
    },
  },
  config: {
    responsive: true,
    staticPlot: true, // Disable interactivity for static screenshots
  },
};

console.log(JSON.stringify(lossPlot, null, 2));
