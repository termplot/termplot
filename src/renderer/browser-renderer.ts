import { randomUUID } from "node:crypto";
import { firefox, type Browser, type Page } from "playwright";
import type { PlotRecord, RenderPngResult } from "../ipc/protocol.js";
import { startAppServer, type AppServer } from "./app-server.js";

export class RenderError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RenderError";
    this.code = code;
  }
}

export class BrowserRenderer {
  #getPlot: (id: string) => PlotRecord;
  #appServer: AppServer | undefined;
  #browser: Browser | undefined;
  #page: Page | undefined;
  #rendererInstanceId = randomUUID();

  constructor(getPlot: (id: string) => PlotRecord) {
    this.#getPlot = getPlot;
  }

  async renderPng(plotId: string): Promise<RenderPngResult> {
    const started = Date.now();
    const startedAt = new Date(started).toISOString();
    const plot = this.#getPlot(plotId);
    const appServer = await this.#ensureAppServer();
    const appReadyAt = Date.now();
    const browser = await this.#ensureBrowser();
    const page = await this.#ensurePage(browser);
    const token = randomUUID();
    const width = plot.width ?? 1080;
    const height = plot.height ?? 810;

    await page.setViewportSize({ width, height });
    await page.addInitScript(() => {
      Reflect.set(globalThis, "__TERMPLOT_RENDER_READY__", {
        plotId: null,
        token: null,
        ready: false,
        error: null,
      });
    });

    try {
      await page.goto(`http://127.0.0.1:${appServer.port}/plots/${plotId}?token=${token}`, {
        waitUntil: "domcontentloaded",
        timeout: 5_000,
      });
    } catch (error) {
      throw new RenderError(
        "RENDER_NAVIGATION_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }

    try {
      await page.waitForFunction(
        ({ expectedPlotId, expectedToken }: { expectedPlotId: string; expectedToken: string }) => {
          const state = Reflect.get(globalThis, "__TERMPLOT_RENDER_READY__") as
            | { plotId?: string; token?: string; ready?: boolean; error?: string }
            | undefined;
          return Boolean(
            state &&
              state.plotId === expectedPlotId &&
              state.token === expectedToken &&
              (state.ready || state.error),
          );
        },
        { expectedPlotId: plotId, expectedToken: token },
        { timeout: 5_000 },
      );
    } catch (error) {
      throw new RenderError("RENDER_TIMEOUT", error instanceof Error ? error.message : String(error));
    }

    const readyState = await page.evaluate(() =>
      Reflect.get(globalThis, "__TERMPLOT_RENDER_READY__") as
        | { ready?: boolean; error?: string }
        | undefined
    );
    if (!readyState?.ready) {
      throw new RenderError("RENDER_BROWSER_ERROR", readyState?.error ?? "browser render failed");
    }
    const plotReadyAt = Date.now();

    const element = await page.$("#plot");
    if (!element) {
      throw new RenderError("RENDER_SCREENSHOT_FAILED", "plot element not found");
    }

    let png: Uint8Array;
    try {
      png = await element.screenshot({ type: "png" });
    } catch (error) {
      throw new RenderError(
        "RENDER_SCREENSHOT_FAILED",
        error instanceof Error ? error.message : String(error),
      );
    }
    const screenshotAt = Date.now();
    const dimensions = pngDimensions(Buffer.from(png));

    return {
      plotId,
      pngBase64: Buffer.from(png).toString("base64"),
      contentType: "image/png",
      width: dimensions.width,
      height: dimensions.height,
      rendererInstanceId: this.#rendererInstanceId,
      appPort: appServer.port,
      timings: {
        startedAt,
        appReadyMs: appReadyAt - started,
        plotReadyMs: plotReadyAt - appReadyAt,
        screenshotMs: screenshotAt - plotReadyAt,
        totalMs: screenshotAt - started,
      },
    };
  }

  async close(): Promise<void> {
    if (this.#page) {
      await this.#page.close().catch(() => undefined);
      this.#page = undefined;
    }
    if (this.#browser) {
      await this.#browser.close().catch(() => undefined);
      this.#browser = undefined;
    }
    if (this.#appServer) {
      await this.#appServer.close().catch(() => undefined);
      this.#appServer = undefined;
    }
  }

  async #ensureAppServer(): Promise<AppServer> {
    if (!this.#appServer) {
      this.#appServer = await startAppServer(this.#getPlot);
    }
    return this.#appServer;
  }

  async #ensureBrowser(): Promise<Browser> {
    if (!this.#browser || !this.#browser.isConnected()) {
      this.#browser = await firefox.launch({
        headless: true,
        timeout: 60_000,
      });
    }
    return this.#browser;
  }

  async #ensurePage(browser: Browser): Promise<Page> {
    if (!this.#page || this.#page.isClosed()) {
      this.#page = await browser.newPage();
    }
    return this.#page;
  }
}

function pngDimensions(png: Buffer): { width: number; height: number } {
  if (png.length < 24 || png.toString("ascii", 1, 4) !== "PNG") {
    throw new RenderError("RENDER_SCREENSHOT_FAILED", "screenshot was not a PNG");
  }
  return {
    width: png.readUInt32BE(16),
    height: png.readUInt32BE(20),
  };
}
