import { randomUUID } from "node:crypto";
import type { PlotMetadata, PlotRecord } from "../ipc/protocol.js";

export class RegistryError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "RegistryError";
    this.code = code;
  }
}

export class PlotRegistry {
  #plots = new Map<string, PlotRecord>();

  render(config: unknown): PlotRecord {
    const normalized = normalizeConfig(config);
    const now = new Date().toISOString();
    const record: PlotRecord = {
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
      ...extractDimensions(normalized),
      config: normalized,
    };
    this.#plots.set(record.id, record);
    return clone(record);
  }

  get(id: string): PlotRecord {
    const record = this.#plots.get(id);
    if (!record) {
      throw new RegistryError("PLOT_NOT_FOUND", `plot not found: ${id}`);
    }
    return clone(record);
  }

  list(): PlotMetadata[] {
    return Array.from(this.#plots.values(), (record) => {
      const { config: _config, ...metadata } = record;
      return { ...metadata };
    });
  }

  delete(id: string): { deleted: boolean; id: string } {
    if (!this.#plots.delete(id)) {
      throw new RegistryError("PLOT_NOT_FOUND", `plot not found: ${id}`);
    }
    return { deleted: true, id };
  }

  clear(): { cleared: number } {
    const cleared = this.#plots.size;
    this.#plots.clear();
    return { cleared };
  }
}

function normalizeConfig(config: unknown): Record<string, unknown> {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new RegistryError("INVALID_PLOT_CONFIG", "plot config must be a JSON object");
  }

  const cloned = clone(config) as Record<string, unknown>;
  const layout = cloned.layout;
  if (layout !== undefined && (!layout || typeof layout !== "object" || Array.isArray(layout))) {
    throw new RegistryError("INVALID_PLOT_CONFIG", "plot config layout must be an object when present");
  }

  const dimensions = extractDimensions(cloned);
  for (const [name, value] of Object.entries(dimensions)) {
    if (value !== undefined && (!Number.isFinite(value) || value <= 0)) {
      throw new RegistryError("INVALID_DIMENSIONS", `${name} must be a positive finite number`);
    }
  }

  return cloned;
}

function extractDimensions(config: Record<string, unknown>): { width?: number; height?: number } {
  const layout = config.layout;
  if (!layout || typeof layout !== "object" || Array.isArray(layout)) {
    return {};
  }

  const record = layout as Record<string, unknown>;
  return {
    width: typeof record.width === "number" ? record.width : undefined,
    height: typeof record.height === "number" ? record.height : undefined,
  };
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
