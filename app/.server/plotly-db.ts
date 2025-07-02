import { v4 as uuidv4 } from "uuid";

// In-memory database using a Map to store plot configurations by ID
export class PlotlyDatabase {
  private plots: Map<string, any>;

  constructor() {
    this.plots = new Map<string, any>();
    // Initialize with a hardcoded default plot for ID "0" for testing
  }

  // Add a new plot configuration, returning the assigned ID
  // Validates the config against the Zod schema before storing
  addPlot(plotConfig: any): string {
    const id = uuidv4();
    this.plots.set(id, plotConfig);
    return id;
  }

  // Add a plot configuration with a specific ID (useful for testing or updates)
  addPlotWithId(id: string, plotConfig: any): void {
    this.plots.set(id, plotConfig);
  }

  // Retrieve a plot configuration by ID
  getPlot(id: string): any {
    return this.plots.get(id);
  }

  // Remove a plot configuration by ID
  removePlot(id: string): boolean {
    return this.plots.delete(id);
  }

  // Get all plot IDs (useful for debugging or listing available plots)
  getAllIds(): string[] {
    return Array.from(this.plots.keys());
  }

  // Clear all plot configurations (useful for cleanup or reset)
  clearAll(): void {
    this.plots.clear();
  }
}

// Export a singleton instance of the database
let plotlyDb = new PlotlyDatabase();
// this must be globally accessible because of the way the client-side react
// router server is build, thus accessing a different version of this file than
// the express web server. by making this a global variable, both access the
// same instance. this confuses typescript, so we need to ignore the type error.
// @ts-ignore
globalThis.plotlyDb = globalThis.plotlyDb ? globalThis.plotlyDb : plotlyDb;
// @ts-ignore
plotlyDb = globalThis.plotlyDb;
export { plotlyDb };
