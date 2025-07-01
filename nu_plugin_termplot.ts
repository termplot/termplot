#!/usr/bin/env node
import ansiescapes from "ansi-escapes";
import compression from "compression";
import express from "express";
import morgan from "morgan";
import puppeteer from "puppeteer";

// Short-circuit the type-checking of the built output.
const BUILD_PATH = "./build/server/index.js";
const DEVELOPMENT = process.env.NODE_ENV === "development";
const PORT = Number.parseInt(process.env.PORT || "3000");

const app = express();

app.use(compression());
app.disable("x-powered-by");

if (DEVELOPMENT) {
  console.log("Starting development server");
  const viteDevServer = await import("vite").then((vite) =>
    vite.createServer({
      server: { middlewareMode: true },
    }),
  );
  app.use(viteDevServer.middlewares);
  app.use(async (req, res, next) => {
    try {
      const source = await viteDevServer.ssrLoadModule("./server/app.ts");
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  console.log("Starting production server");
  app.use(
    "/assets",
    express.static("build/client/assets", { immutable: true, maxAge: "1y" }),
  );
  app.use(morgan("tiny"));
  app.use(express.static("build/client", { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

(async () => {
  try {
    // Launch a headless browser
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    await page.setViewport({ width: 1200, height: 900 });

    // Navigate to the local web server hosting the plot
    await page.goto(`http://localhost:${PORT}/plotly/0`, { waitUntil: "networkidle2" });

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
