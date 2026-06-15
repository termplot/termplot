import ansiescapes from "ansi-escapes";
import { Command } from "commander";
import puppeteer from "puppeteer";
import zod from "zod/v4";
import { plotlyDb } from "./plotly-db.js";
import { PORT, server } from "./server.js";
import { readStdin } from "./util/stdin.js";

// Define the Plotly configuration schema using Zod
const plotlyBareConfigSchema = zod.object({
  data: zod.array(zod.any()), // Array of data traces, each can be any valid Plotly trace type
  layout: zod.looseObject({
    width: zod.number().optional(), // Optional width for the layout
    height: zod.number().optional(), // Optional height for the layout
  }),
  config: zod.object().optional(), // Optional configuration object for Plotly
});

type PlotlyBareConfig = zod.infer<typeof plotlyBareConfigSchema>;

const program = new Command();

async function generateAndShowPlotly(
  plotConfig: PlotlyBareConfig,
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
  .argument("[config]", "JSON plot configuration file (optional; can be piped)")
  .description("Termplot: Beautiful plots in your terminal")
  .version("0.1.21")
  .action(async (input: string) => {
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

    let plotlyConfig: PlotlyBareConfig | undefined;
    try {
      plotlyConfig = plotlyBareConfigSchema.parse(jsonConfig);
    } catch (error) {
      console.error("Invalid Plotly configuration:", error);
      process.exit(1);
    }

    const width = plotlyConfig.layout?.width || 1080;
    const height = plotlyConfig.layout?.height || 810;

    if (Number.isNaN(width) || Number.isNaN(height)) {
      console.error("Width and height must be valid numbers.");
      process.exit(1);
    }

    try {
      await generateAndShowPlotly(plotlyConfig, width, height);
    } catch (error) {
      console.error("Error generating plot:", error);
      process.exit(1);
    }

    process.exit(0);
  });

program.parse(process.argv);
