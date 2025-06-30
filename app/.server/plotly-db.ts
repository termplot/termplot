import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Define Zod schemas for the Plotly configuration structure
// Minimal schema matching the current default plot properties

// Schema for axis title (used in xaxis and yaxis)
const AxisTitleSchema = z.object({
  text: z.string(),
});

// Schema for axis configuration (xaxis and yaxis)
const AxisSchema = z.object({
  title: AxisTitleSchema,
});

// Schema for plot title
const TitleSchema = z.object({
  text: z.string(),
  x: z.number().optional(), // Optional as it's not always required
  xanchor: z.enum(["left", "center", "right"]).optional(),
});

// Schema for layout
const LayoutSchema = z.object({
  title: TitleSchema,
  xaxis: AxisSchema,
  yaxis: AxisSchema,
  width: z.number(),
  height: z.number(),
});

// Schema for data trace (e.g., scatter plot data)
const DataSchema = z.object({
  x: z.array(z.number()),
  y: z.array(z.number()),
  type: z.literal("scatter"), // Limit to 'scatter' for now, can expand later
  mode: z.literal("lines+markers").optional(), // e.g., 'lines+markers'
  name: z.string().optional(),
});

// Schema for config
const ConfigSchema = z.object({
  responsive: z.boolean(),
  staticPlot: z.boolean(),
});

// Schema for the full plot configuration
const PlotlyConfigSchema = z.object({
  data: z.array(DataSchema),
  layout: LayoutSchema,
  config: ConfigSchema.optional(),
});

// Infer TypeScript types from the Zod schema
export type PlotlyConfig = z.infer<typeof PlotlyConfigSchema>;

// In-memory database using a Map to store plot configurations by ID
class PlotlyDatabase {
  private plots: Map<string, PlotlyConfig>;

  constructor() {
    this.plots = new Map<string, PlotlyConfig>();
    // Initialize with a hardcoded default plot for ID "0" for testing
    this.initializeDefaultPlot();
  }

  // Initialize a default plot configuration for testing at ID "0"
  private initializeDefaultPlot(): void {
    const defaultPlot: PlotlyConfig = {
      data: [
        {
          x: [1, 2, 3, 4, 5],
          y: [2, 3, 1, 5, 4],
          type: "scatter",
          mode: "lines+markers",
          name: "Default Scatter Plot",
        },
      ],
      layout: {
        title: {
          text: "Default Test Plot",
          x: 0.5,
          xanchor: "center",
        },
        xaxis: {
          title: {
            text: "X Axis",
          },
        },
        yaxis: {
          title: {
            text: "Y Axis",
          },
        },
        width: 800,
        height: 600,
      },
      config: {
        responsive: true,
        staticPlot: true, // Disable interactivity for static screenshots
      },
    };

    this.plots.set("0", defaultPlot);
  }

  // Add a new plot configuration, returning the assigned ID
  // Validates the config against the Zod schema before storing
  addPlot(plotConfig: unknown): string | Error {
    const parsed = PlotlyConfigSchema.safeParse(plotConfig);
    if (!parsed.success) {
      return new Error(`Invalid plot configuration: ${parsed.error.message}`);
    }
    const id = uuidv4();
    this.plots.set(id, parsed.data);
    return id;
  }

  // Add a plot configuration with a specific ID (useful for testing or updates)
  addPlotWithId(id: string, plotConfig: unknown): Error | void {
    const parsed = PlotlyConfigSchema.safeParse(plotConfig);
    if (!parsed.success) {
      return new Error(`Invalid plot configuration: ${parsed.error.message}`);
    }
    this.plots.set(id, parsed.data);
  }

  // Retrieve a plot configuration by ID
  getPlot(id: string): PlotlyConfig | undefined {
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
const plotlyDb = new PlotlyDatabase();
export { plotlyDb };
