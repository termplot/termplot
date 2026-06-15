export type Request =
  | { id?: string; method: "status" }
  | { id?: string; method: "shutdown" }
  | { id?: string; method: "setTtl"; ttlMs: number }
  | { id?: string; method: "renew" };

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

  return ["status", "shutdown", "renew"].includes(record.method);
}
