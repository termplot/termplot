import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ansiescapes from "ansi-escapes";
import express from "express";
import puppeteer from "puppeteer";

const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Set up a simple local server to host the plot
const app = express();
app.use(express.static(join(__dirname, "public")));
const server = app.listen(port, () =>
  console.log(`Server running on port ${port} (set PORT env var at start to change)`),
);

(async () => {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    // Navigate to the local web server hosting the plot
    await page.goto("http://localhost:3000", { waitUntil: "networkidle2" });

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
})();
