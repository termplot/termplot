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
  width: z.number(),
  height: z.number(),
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
});

// Schema for data trace (e.g., scatter plot data)
const DataSchema = z.object({
  x: z.array(z.number()),
  y: z.array(z.number()),
  type: z.literal("scatter"), // Limit to 'scatter' for now
  mode: z.enum(["lines", "markers", "lines+markers"]).optional(), // Optional mode
  name: z.string().optional(),
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
          name: "Terminal Data",
          line: {
            color: "#a6e3a1", // Catppuccin Green for the line (soft terminal green)
            width: 2,
          },
          marker: {
            color: "#a6e3a1", // Catppuccin Green for markers
            size: 8,
          },
        },
      ],
      layout: {
        title: {
          text: "Terminal Test Plot",
          x: 0.5,
          xanchor: "center",
          font: {
            family: "Roboto Mono, Fira Code, monospace",
            size: 20,
            color: "#cdd6f4", // Catppuccin Text for readability
          },
        },
        xaxis: {
          title: {
            text: "X Axis",
            font: {
              family: "Roboto Mono, Fira Code, monospace",
              size: 14,
              color: "#cdd6f4", // Catppuccin Text
            },
          },
          gridcolor: "#45475a", // Catppuccin Surface1 for subtle grid
          linecolor: "#45475a", // Catppuccin Surface1 for axis line
          ticks: "outside",
          tickfont: {
            family: "Roboto Mono, Fira Code, monospace",
            size: 12,
            color: "#cdd6f4", // Catppuccin Text
          },
        },
        yaxis: {
          title: {
            text: "Y Axis",
            font: {
              family: "Roboto Mono, Fira Code, monospace",
              size: 14,
              color: "#cdd6f4", // Catppuccin Text
            },
          },
          gridcolor: "#45475a", // Catppuccin Surface1 for subtle grid
          linecolor: "#45475a", // Catppuccin Surface1 for axis line
          ticks: "outside",
          tickfont: {
            family: "Roboto Mono, Fira Code, monospace",
            size: 12,
            color: "#cdd6f4", // Catppuccin Text
          },
        },
        width: 1080,
        height: 810,
        plot_bgcolor: "#1e1e2e", // Catppuccin Base for dark background (plot area)
        paper_bgcolor: "#1e1e2e", // Catppuccin Base for surrounding area
        font: {
          family: "Roboto Mono, Fira Code, monospace",
          color: "#cdd6f4", // Catppuccin Text as default font color
        },
        showlegend: true,
        legend: {
          font: {
            family: "Roboto Mono, Fira Code, monospace",
            size: 12,
            color: "#cdd6f4", // Catppuccin Text
          },
          bgcolor: "#313244", // Catppuccin Surface0 for slightly lighter legend background
          bordercolor: "#45475a", // Catppuccin Surface1 for border
          borderwidth: 1,
          x: 1,
          xanchor: "right",
          y: 1,
        },
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
