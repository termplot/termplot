#!/usr/bin/env node
import net from "node:net";
import express from "express";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Short-circuit the type-checking of the built output.
// const BUILD_PATH = "./build/server/index.js";
const BUILD_PATH = join(__dirname, "./build/server/index.js");
const DEVELOPMENT = process.env.NODE_ENV === "development";

// Function to check if a port is in use
const isPortInUse = (port: number): Promise<boolean> => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(true); // Port is in use
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(false); // Port is available
    });

    server.listen(port);
  });
};

// Function to find an available port starting from a base port
const findAvailablePort = async (
  startPort: number,
  maxAttempts: number = 10,
): Promise<number> => {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    const inUse = await isPortInUse(port);
    if (!inUse) {
      return port; // Found an available port
    }
    port++; // Increment port number and try again
  }

  // Fallback to a random port if no available port found after maxAttempts
  const randomPort = Math.floor(Math.random() * (65535 - 3000 + 1)) + 3000;
  const inUse = await isPortInUse(randomPort);
  if (!inUse) {
    return randomPort;
  }

  throw new Error(
    `Could not find an available port after ${maxAttempts} attempts or random fallback.`,
  );
};

// Set the port, starting from an environment variable or default to 3000
const getPort = async (): Promise<number> => {
  const envPort = Number.parseInt(process.env.PORT || "3000");
  return await findAvailablePort(envPort);
};

const PORT = await getPort();

const app = express();

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
      const serverPath = join(__dirname, "./server/app.ts");
      const source = await viteDevServer.ssrLoadModule(serverPath);
      return await source.app(req, res, next);
    } catch (error) {
      if (typeof error === "object" && error instanceof Error) {
        viteDevServer.ssrFixStacktrace(error);
      }
      next(error);
    }
  });
} else {
  const assetsPath = join(__dirname, "./build/client/assets");
  app.use(
    "/assets",
    express.static(assetsPath, { immutable: true, maxAge: "1y" }),
  );
  const clientPath = join(__dirname, "build/client");
  app.use(express.static(clientPath, { maxAge: "1h" }));
  app.use(await import(BUILD_PATH).then((mod) => mod.app));
}

// Start server and wait for it to finish to prevent race conflicts with
// subsequent puppeteer calls
let resolvePromise: (value?: void | PromiseLike<void>) => void;
// biome-ignore lint/suspicious/noExplicitAny: special case
let rejectPromise: (reason?: any) => void;
const p = new Promise<void>((resolve, reject) => {
  resolvePromise = resolve;
  rejectPromise = reject;
});
const server = app.listen(PORT, (err) => {
  if (DEVELOPMENT) {
    console.log(`Dev termplot server is running on http://localhost:${PORT}`);
  } else {
    console.log(`Prod termplot server is running on http://localhost:${PORT}`);
  }
  if (err) {
    rejectPromise(err);
    return;
  }
  resolvePromise();
});
await p;

export { PORT, server };
