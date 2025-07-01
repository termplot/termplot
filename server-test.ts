import ansiescapes from "ansi-escapes";
import puppeteer from "puppeteer";
import { PORT, server } from "./server.ts";

(async () => {
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

    // Close the browser and server
    await browser.close();
    server.close();

    // Display the image in the terminal
    console.log(ansiescapes.image(imageBuffer, {}));
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
})();
