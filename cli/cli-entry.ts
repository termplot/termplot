import ansiescapes from "ansi-escapes";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { plotlyDb } from "./plotly-db.js";
import { PORT, server } from "./server.js";
import { readStdin } from "./util/stdin.js";

const program = new Command();

async function generateAndShowPlotly(
  plotConfig: any,
  width?: number,
  height?: number,
): Promise<void> {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: width || 1080, height: height || 810 });

    const id = plotlyDb.addPlot(plotConfig);

    // Navigate to the local web server hosting the plot
    await page.goto(`http://localhost:${PORT}/plotly/${id}`, {
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
    console.error("Error generating plot:", error);
    throw error;
  }
}

program
  .name("termplot")
  .argument("[config]", "JSON plot configuration file (optional)")
  .option("--width <width>", "Width of the browser page", "1080")
  .option("--height <height>", "Height of the browser page", "810")
  .description("Termplot: Beautiful plots in your terminal")
  .version("0.1.4")
  .action(async (input: string, opts: { width?: string; height?: string }) => {
    let configStr = input;
    if (!configStr && !process.stdin.isTTY) {
      configStr = (await readStdin()).trim();
    }
    if (!configStr) {
      console.error("No prompt supplied (argument or stdin required).");
      process.exit(1);
    }

    let jsonConfig: any;
    try {
      jsonConfig = JSON.parse(configStr);
    } catch (error) {
      console.error("Invalid JSON configuration:", error);
      process.exit(1);
    }

    let isPlotlyConfig = false;
    if (jsonConfig.data && jsonConfig.layout) {
      isPlotlyConfig = true;
    }

    if (!isPlotlyConfig) {
      console.error(
        "Invalid configuration: Must be a valid Plotly configuration object.",
      );
      process.exit(1);
    }

    const width = parseInt(opts.width || "1080", 10);
    const height = parseInt(opts.height || "810", 10);

    if (Number.isNaN(width) || Number.isNaN(height)) {
      console.error("Width and height must be valid numbers.");
      process.exit(1);
    }

    try {
      await generateAndShowPlotly(jsonConfig, width, height);
    } catch (error) {
      console.error("Error generating plot:", error);
      process.exit(1);
    }

    process.exit(0);
  });

program.parse(process.argv);
