import { createRequestHandler } from "@react-router/express";
import express from "express";
import type { ServerBuild } from "react-router";
import * as build from "../build/server/index.js";

const app = express();

// http://expressjs.com/en/advanced/best-practice-security.html#at-a-minimum-disable-x-powered-by-header
app.disable("x-powered-by");

// Vite fingerprints its assets so we can cache forever.
app.use(
  "/assets",
  express.static("../build/client/assets", {
    immutable: true,
    maxAge: "1y",
  }),
);

// Everything else (like favicon.ico) is cached for an hour. You may want to be
// more aggressive with this caching.
app.use(express.static("../build/client", { maxAge: "1h" }));

// handle SSR requests
app.all(
  "*",
  createRequestHandler({
    build: async () => {
      return build as unknown as ServerBuild;
    },
  }),
);

const port = process.env.PORT || 3000;

app.listen(port, async () => {
  console.log(`Express server listening at http://localhost:${port}`);
});
