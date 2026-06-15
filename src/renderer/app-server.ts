import { createRequire } from "node:module";
import { Server } from "node:http";
import { readFileSync } from "node:fs";
import express from "express";
import { matchPath } from "react-router";
import type { PlotRecord } from "../ipc/protocol.js";

const require = createRequire(import.meta.url);
const plotlyPath = require.resolve("plotly.js-dist-min");
const plotlySource = readFileSync(plotlyPath, "utf8");

export type AppServer = {
  port: number;
  close: () => Promise<void>;
};

export async function startAppServer(getPlot: (id: string) => PlotRecord): Promise<AppServer> {
  const app = express();

  app.get("*splat", (req, res, next) => {
    const match = matchPath("/plots/:id", req.path);
    if (!match?.params.id) {
      res.status(404).send("not found");
      return;
    }

    try {
      const plot = getPlot(match.params.id);
      res.type("html").send(renderPlotHtml(plot, String(req.query.token ?? "")));
    } catch (error) {
      next(error);
    }
  });

  const server = await new Promise<Server>((resolve, reject) => {
    const candidate = app.listen(0, "127.0.0.1", () => resolve(candidate));
    candidate.once("error", reject);
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("app server did not bind a TCP port");
  }

  return {
    port: address.port,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}

function renderPlotHtml(plot: PlotRecord, token: string): string {
  const width = plot.width ?? 1080;
  const height = plot.height ?? 810;
  const state = JSON.stringify({
    plotId: plot.id,
    token,
    config: plot.config,
    width,
    height,
  }).replaceAll("<", "\\u003c");

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>TermPlot ${escapeHtml(plot.id)}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
        width: ${width}px;
        height: ${height}px;
        overflow: hidden;
        background: white;
      }
      #plot {
        width: ${width}px;
        height: ${height}px;
      }
    </style>
  </head>
  <body>
    <div id="plot"></div>
    <script>${plotlySource}</script>
    <script>
      window.__TERMPLOT_RENDER_READY__ = {
        plotId: null,
        token: null,
        ready: false,
        error: null
      };
      const state = ${state};
      const plot = document.getElementById("plot");
      Promise.resolve()
        .then(() => Plotly.newPlot(plot, state.config.data || [], state.config.layout || {}, state.config.config || {}))
        .then(() => {
          window.__TERMPLOT_RENDER_READY__ = {
            plotId: state.plotId,
            token: state.token,
            ready: true,
            error: null
          };
        })
        .catch((error) => {
          window.__TERMPLOT_RENDER_READY__ = {
            plotId: state.plotId,
            token: state.token,
            ready: false,
            error: error && error.message ? error.message : String(error)
          };
        });
    </script>
  </body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
