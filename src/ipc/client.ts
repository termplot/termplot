import net from "node:net";
import type { Request, Response } from "./protocol.js";

export type SendOptions = {
  timeoutMs?: number;
};

export class IpcError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "IpcError";
    this.code = code;
  }
}

export async function sendRequest(
  socketPath: string,
  request: Request,
  options: SendOptions = {},
): Promise<Response> {
  const timeoutMs = options.timeoutMs ?? 1_000;

  return await new Promise<Response>((resolve, reject) => {
    const socket = net.createConnection(socketPath);
    let buffer = "";
    let settled = false;
    const timeout = setTimeout(() => {
      finishError(new IpcError("TIMEOUT", `timed out connecting to ${socketPath}`));
      socket.destroy();
    }, timeoutMs);

    function finish(response: Response): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      socket.end();
      resolve(response);
    }

    function finishError(error: Error): void {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timeout);
      reject(error);
    }

    socket.setEncoding("utf8");
    socket.on("connect", () => {
      socket.write(`${JSON.stringify(request)}\n`);
    });
    socket.on("data", (chunk) => {
      buffer += chunk;
      const newline = buffer.indexOf("\n");
      if (newline === -1) {
        return;
      }
      const line = buffer.slice(0, newline);
      try {
        finish(JSON.parse(line) as Response);
      } catch (error) {
        finishError(error instanceof Error ? error : new Error(String(error)));
      }
    });
    socket.on("error", (error: NodeJS.ErrnoException) => {
      finishError(new IpcError(error.code ?? "SOCKET_ERROR", error.message));
    });
  });
}

export async function requestResult<T>(
  socketPath: string,
  request: Request,
  options?: SendOptions,
): Promise<T> {
  const response = await sendRequest(socketPath, request, options);
  if (!response.ok) {
    throw new IpcError(response.error.code, response.error.message);
  }
  return response.result as T;
}
