export type Request =
  | { id?: string; method: "status" }
  | { id?: string; method: "shutdown" }
  | { id?: string; method: "setTtl"; ttlMs: number }
  | { id?: string; method: "renew" }
  | { id?: string; method: "render"; config: unknown }
  | { id?: string; method: "getPlot"; plotId: string }
  | { id?: string; method: "listPlots" }
  | { id?: string; method: "deletePlot"; plotId: string }
  | { id?: string; method: "clearPlots" };

export type Status = {
  pid: number;
  socketPath: string;
  startedAt: string;
  uptimeMs: number;
  ttlMs: number;
  idleDeadlineAt: string;
  idleRemainingMs: number;
};

export type Response =
  | { ok: true; id?: string; result: unknown }
  | { ok: false; id?: string; error: { code: string; message: string } };

export type PlotMetadata = {
  id: string;
  createdAt: string;
  updatedAt: string;
  width?: number;
  height?: number;
};

export type PlotRecord = PlotMetadata & {
  config: unknown;
};

export function isRequest(value: unknown): value is Request {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;
  if (typeof record.method !== "string") {
    return false;
  }

  if (record.method === "setTtl") {
    return typeof record.ttlMs === "number" && Number.isFinite(record.ttlMs);
  }

  if (["getPlot", "deletePlot"].includes(record.method)) {
    return typeof record.plotId === "string" && record.plotId.length > 0;
  }

  if (record.method === "render") {
    return "config" in record;
  }

  return ["status", "shutdown", "renew", "listPlots", "clearPlots"].includes(record.method);
}
