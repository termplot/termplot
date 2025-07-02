const defaultPlot = {
  data: [
    {
      x: [1, 2, 3, 4, 5],
      y: [5, 1, 1, 1, 4],
      type: "scatter",
      mode: "lines+markers",
      name: "Terminal Data",
      line: {
        color: "#a6e3a1", // Catppuccin Green for the line (soft terminal green)
        width: 2,
      },
      marker: {
        color: "#a6e3a1", // Catppuccin Green for markers
        size: 8,
      },
    },
  ],
  layout: {
    title: {
      text: "Terminal Test Plot",
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
        text: "X Axis",
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
        text: "Y Axis",
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

console.log(JSON.stringify(defaultPlot, null, 2));
