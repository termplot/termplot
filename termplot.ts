#!/usr/bin/env node
import ansiescapes from "ansi-escapes";
import { Command } from "commander";
import puppeteer from "puppeteer";
import { PORT, server } from "./server.ts";

const program = new Command();

program
  .name("termplot")
  .description("Termplot: Beautiful plots in your terminal")
  .version("0.0.1");

program
  .command("test")
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

program.parse(process.argv);
