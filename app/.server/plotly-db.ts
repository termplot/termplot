import { v4 as uuidv4 } from "uuid";
import { z } from "zod";

// Define Zod schemas for the Plotly configuration structure
// Minimal schema matching the current default plot properties

// Schema for font styling
const FontSchema = z.object({
  family: z.string().optional(),
  size: z.number().optional(),
  color: z.string().optional(),
});

// Schema for axis title
const AxisTitleSchema = z.object({
  text: z.string(),
  font: FontSchema.optional(),
});

// Schema for axis configuration (xaxis and yaxis)
const AxisSchema = z.object({
  title: AxisTitleSchema,
  gridcolor: z.string().optional(),
  linecolor: z.string().optional(),
  ticks: z.enum(["outside", "inside", ""]).optional(), // 'outside' or 'inside' for ticks, empty string for no ticks
  tickfont: FontSchema.optional(),
  range: z.array(z.number()).optional(), // Optional range for the axis
});

// Schema for plot title
const TitleSchema = z.object({
  text: z.string(),
  x: z.number().optional(),
  xanchor: z.enum(["left", "center", "right"]).optional(),
  font: FontSchema.optional(),
});

// Schema for legend
const LegendSchema = z.object({
  font: FontSchema.optional(),
  bgcolor: z.string().optional(),
  bordercolor: z.string().optional(),
  borderwidth: z.number().optional(),
  x: z.number().optional(),
  xanchor: z.enum(["left", "center", "right"]).optional(),
  y: z.number().optional(),
});

// Schema for layout
const LayoutSchema = z.object({
  title: TitleSchema,
  xaxis: AxisSchema,
  yaxis: AxisSchema,
  width: z.number().optional(),
  height: z.number().optional(),
  plot_bgcolor: z.string().optional(),
  paper_bgcolor: z.string().optional(),
  font: FontSchema.optional(),
  showlegend: z.boolean().optional(),
  legend: LegendSchema.optional(),
});

// Schema for line styling
const LineSchema = z.object({
  color: z.string().optional(),
  width: z.number().optional(),
});

// Schema for marker styling
const MarkerSchema = z.object({
  color: z.string().optional(),
  size: z.number().optional(),
  line: LineSchema.optional(), // Optional line styling for markers
});

// Schema for data trace (e.g., scatter plot data)
const DataSchema = z.object({
  z: z.array(z.array(z.number())).optional(), // Optional for 3D plots
  x: z.array(z.number()),
  y: z.array(z.number()),
  type: z
    .enum(["scatter", "bar", "pie", "histogram", "box", "heatmap"])
    .optional(), // Optional type
  mode: z.enum(["lines", "markers", "lines+markers"]).optional(), // Optional mode
  name: z.string().optional(),
  colorscale: z.array(z.tuple([z.number(), z.string()])).optional(),
  showscale: z.boolean().optional(), // Optional to show color scale
  opacity: z.number().optional(), // Optional opacity for the trace
  line: LineSchema.optional(),
  marker: MarkerSchema.optional(),
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
export class PlotlyDatabase {
  private plots: Map<string, PlotlyConfig>;

  constructor() {
    this.plots = new Map<string, PlotlyConfig>();
    // Initialize with a hardcoded default plot for ID "0" for testing
  }

  // Add a new plot configuration, returning the assigned ID
  // Validates the config against the Zod schema before storing
  addPlot(plotConfig: any): string {
    const parsed = PlotlyConfigSchema.safeParse(plotConfig);
    if (!parsed.success) {
      throw new Error(`Invalid plot configuration: ${parsed.error.message}`);
    }
    const id = uuidv4();
    this.plots.set(id, parsed.data);
    return id;
  }

  // Add a plot configuration with a specific ID (useful for testing or updates)
  addPlotWithId(id: string, plotConfig: PlotlyConfig): void {
    const parsed = PlotlyConfigSchema.safeParse(plotConfig);
    if (!parsed.success) {
      throw new Error(`Invalid plot configuration: ${parsed.error.message}`);
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
