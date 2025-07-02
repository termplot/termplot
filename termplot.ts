import ansiescapes from "ansi-escapes";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { type PlotlyConfig, plotlyDb } from "./app/.server/plotly-db.ts";
import { PORT, server } from "./server.ts";

const program = new Command();

program
  .name("termplot")
  .description("Termplot: Beautiful plots in your terminal")
  .version("0.0.1");

program
  .command("test1")
  .description("Creates a default test plot in your terminal")
  .action(async () => {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 1080, height: 810 });

      // Navigate to the local web server hosting the plot
      await page.goto(`http://localhost:${PORT}/plotly/0`, {
        waitUntil: "networkidle2",
      });

      // Take a screenshot
      const imageBuffer = await page.screenshot({ fullPage: true });

      // Close the page and browser and server
      await page.close();
      await browser.close();
      server.close();

      // Display the image in the terminal
      console.log(ansiescapes.image(imageBuffer, {}));
    } catch (error) {
      console.error("Error:", error);
    }

    // Everything should be closed gracefully by now. Exit the process.
    process.exit(0);
  });

program
  .command("test2")
  .description("Creates a default test plot in your terminal")
  .action(async () => {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 1080, height: 810 });

      // create a new plot
      const defaultPlot: PlotlyConfig = {
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

      const id = plotlyDb.addPlot(defaultPlot);

      // Navigate to the local web server hosting the plot
      await page.goto(`http://localhost:${PORT}/plotly/${id}`, {
        waitUntil: "networkidle2",
      });

      // Take a screenshot
      const imageBuffer = await page.screenshot({ fullPage: true });

      // Close the page and browser and server
      await page.close();
      plotlyDb.removePlot(id);
      await browser.close();
      server.close();

      // Display the image in the terminal
      console.log(ansiescapes.image(imageBuffer, {}));
    } catch (error) {
      console.error("Error:", error);
    }

    // Everything should be closed gracefully by now. Exit the process.
    process.exit(0);
  });

program
  .command("test3")
  .description("Creates a scatter plot with three different sets of dots")
  .action(async () => {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 1080, height: 810 });

      // Create a new scatter plot with three sets of dots
      const scatterPlot: PlotlyConfig = {
        data: [
          {
            x: [1, 2, 3, 4, 5],
            y: [2, 3, 1, 5, 4],
            type: "scatter",
            mode: "markers",
            name: "Green Data",
            marker: {
              color: "#a6e3a1", // Catppuccin Green for first set of dots
              size: 8,
            },
          },
          {
            x: [1.5, 2.5, 3.5, 4.5, 5.5],
            y: [3, 4, 2, 6, 5],
            type: "scatter",
            mode: "markers",
            name: "Lavender Data",
            marker: {
              color: "#b4befe", // Catppuccin Lavender for second set of dots
              size: 8,
            },
          },
          {
            x: [2, 3, 4, 5, 6],
            y: [1, 2, 0.5, 4, 3],
            type: "scatter",
            mode: "markers",
            name: "Mauve Data",
            marker: {
              color: "#cba6f7", // Catppuccin Mauve for third set of dots
              size: 8,
            },
          },
        ],
        layout: {
          title: {
            text: "Scatter Plot with Three Sets of Dots",
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

      const id = plotlyDb.addPlot(scatterPlot);

      // Navigate to the local web server hosting the plot
      await page.goto(`http://localhost:${PORT}/plotly/${id}`, {
        waitUntil: "networkidle2",
      });

      // Take a screenshot
      const imageBuffer = await page.screenshot({ fullPage: true });

      // Close the page and browser and server
      await page.close();
      plotlyDb.removePlot(id);
      await browser.close();
      server.close();

      // Display the image in the terminal
      console.log(ansiescapes.image(imageBuffer, {}));
    } catch (error) {
      console.error("Error:", error);
    }

    // Everything should be closed gracefully by now. Exit the process.
    process.exit(0);
  });

program
  .command("test4")
  .description(
    "Creates a line chart showing a decreasing value (e.g., ML loss)",
  )
  .action(async () => {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 1080, height: 810 });

      // Create a new line chart with a decreasing value resembling ML loss
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

      const id = plotlyDb.addPlot(lossPlot);

      // Navigate to the local web server hosting the plot
      await page.goto(`http://localhost:${PORT}/plotly/${id}`, {
        waitUntil: "networkidle2",
      });

      // Take a screenshot
      const imageBuffer = await page.screenshot({ fullPage: true });

      // Close the page and browser and server
      await page.close();
      plotlyDb.removePlot(id);
      await browser.close();
      server.close();

      // Display the image in the terminal
      console.log(ansiescapes.image(imageBuffer, {}));
    } catch (error) {
      console.error("Error:", error);
    }

    // Everything should be closed gracefully by now. Exit the process.
    process.exit(0);
  });

program
  .command("test5")
  .description(
    "Creates a scatter plot with three sets of dots and decision boundaries",
  )
  .action(async () => {
    try {
      // Launch a headless browser
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.setViewport({ width: 1080, height: 810 });

      // Create a new plot with scatter points and decision boundary heatmap
      const decisionBoundaryPlot: PlotlyConfig = {
        data: [
          // Heatmap for decision boundaries (simulated grid of class predictions)
          {
            z: [
              [0, 0, 0, 0, 1, 1, 1, 1],
              [0, 0, 0, 1, 1, 1, 1, 1],
              [0, 0, 0, 1, 1, 2, 2, 2],
              [0, 0, 1, 1, 2, 2, 2, 2],
              [0, 0, 1, 2, 2, 2, 2, 2],
              [0, 1, 1, 2, 2, 2, 2, 2],
              [1, 1, 2, 2, 2, 2, 2, 2],
              [1, 1, 2, 2, 2, 2, 2, 2],
            ], // Grid of class labels (0, 1, 2) simulating neural network predictions
            x: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5], // X coordinates for heatmap grid
            y: [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5], // Y coordinates for heatmap grid
            type: "heatmap",
            colorscale: [
              [0, "#7aa2a1"], // Lighter shade of Catppuccin Green for Class 0 region
              [0.5, "#8a9efe"], // Lighter shade of Catppuccin Lavender for Class 1 region
              [1, "#ab86f7"], // Lighter shade of Catppuccin Mauve for Class 2 region
            ],
            showscale: false, // Hide color scale bar since legend will show class info
            opacity: 0.5, // Semi-transparent to allow overlap visibility with scatter points
          },
          // Scatter plot for three sets of data points
          {
            x: [-1.5, -1, -0.5, -1.2, -0.8],
            y: [-1.5, -1, -1.2, -0.5, -0.8],
            type: "scatter",
            mode: "markers",
            name: "Class 0 (Green)",
            marker: {
              color: "#a6e3a1", // Catppuccin Green for first set of dots
              size: 10,
              line: {
                color: "#cdd6f4", // Catppuccin Text for outline
                width: 1,
              },
            },
          },
          {
            x: [0.5, 0, -0.5, 0.2, -0.2],
            y: [0.5, 1, 0, 0.8, -0.5],
            type: "scatter",
            mode: "markers",
            name: "Class 1 (Lavender)",
            marker: {
              color: "#b4befe", // Catppuccin Lavender for second set of dots
              size: 10,
              line: {
                color: "#cdd6f4", // Catppuccin Text for outline
                width: 1,
              },
            },
          },
          {
            x: [1, 1.5, 0.8, 1.2, 0.5],
            y: [0.5, 1, 1.5, -0.5, 1.2],
            type: "scatter",
            mode: "markers",
            name: "Class 2 (Mauve)",
            marker: {
              color: "#cba6f7", // Catppuccin Mauve for third set of dots
              size: 10,
              line: {
                color: "#cdd6f4", // Catppuccin Text for outline
                width: 1,
              },
            },
          },
        ],
        layout: {
          title: {
            text: "Scatter Plot with Decision Boundaries",
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
              text: "Feature 1",
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
            range: [-2, 2], // Set range to cover the grid
          },
          yaxis: {
            title: {
              text: "Feature 2",
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
            range: [-2, 2], // Set range to cover the grid
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

      const id = plotlyDb.addPlot(decisionBoundaryPlot);

      // Navigate to the local web server hosting the plot
      await page.goto(`http://localhost:${PORT}/plotly/${id}`, {
        waitUntil: "networkidle2",
      });

      // Take a screenshot
      const imageBuffer = await page.screenshot({ fullPage: true });

      // Close the page and browser and server
      await page.close();
      plotlyDb.removePlot(id);
      await browser.close();
      server.close();

      // Display the image in the terminal
      console.log(ansiescapes.image(imageBuffer, {}));
    } catch (error) {
      console.error("Error:", error);
    }

    // Everything should be closed gracefully by now. Exit the process.
    process.exit(0);
  });

program.parse(process.argv);
