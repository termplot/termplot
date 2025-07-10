#!/usr/bin/env node
import * as process from "node:process";
import ansiescapes from "ansi-escapes";
// import puppeteer from "puppeteer";
import zod from "zod/v4";
import { plotlyDb } from "./plotly-db.js";
import { PORT, server } from "./server.js";

// Define the Plotly configuration schema using Zod
const plotlyBareConfigSchema = zod.object({
  data: zod.array(zod.any()), // Array of data traces, each can be any valid Plotly trace type
  layout: zod.looseObject({
    width: zod.number().optional(), // Optional width for the layout
    height: zod.number().optional(), // Optional height for the layout
  }),
  config: zod.object().optional(), // Optional configuration object for Plotly
});

type PlotlyBareConfig = zod.infer<typeof plotlyBareConfigSchema>;

// These live at module scope, above generateAndShowPlotly
let browser: import("puppeteer").Browser | null = null;
let page: import("puppeteer").Page | null = null;
let puppeteerModule: typeof import("puppeteer") | null = null; // cache the imported module

async function getBrowser(): Promise<{
  browser: import("puppeteer").Browser;
  page: import("puppeteer").Page;
}> {
  // Lazy-import puppeteer only once
  if (!puppeteerModule) {
    puppeteerModule = await import("puppeteer");
  }

  if (!browser) {
    browser = await puppeteerModule.launch();
    console.error("Termplot: headless browser launched");
  }

  // const page = await browser.newPage();
  if (!page) {
    page = await browser.newPage();
    console.error("Termplot: new page created");
  }

  return { browser, page };
}

// Call this from your Goodbye / shutdown logic
async function closeBrowser(): Promise<void> {
  if (browser) {
    await browser.close();
    browser = null;
    // console.error("Termplot: headless browser closed");
  }
  if (page) {
    await page.close();
    page = null;
    // console.error("Termplot: page closed");
  }
}

// ─── Function used by the Run call ────────────────────────────────────────────
async function generateAndShowPlotly(
  id: number,
  span: any,
  plotConfig: PlotlyBareConfig,
  width?: number,
  height?: number,
): Promise<void> {
  try {
    // Persistent browser (lazily created)
    const { browser, page } = await getBrowser();

    // New page for every call
    await page.setViewport({ width: width || 1080, height: height || 810 });

    const plotId = plotlyDb.addPlot(plotConfig);

    await page.goto(`http://localhost:${PORT}/plotly/${plotId}`, {
      // waitUntil: "networkidle2",
    });

    // 50ms timeout
    await new Promise((resolve) => setTimeout(resolve, 50));

    const imageBuffer = await page.screenshot({ fullPage: true });

    // Clean up per-call resources
    // await page.close();

    // Send the image back to Nushell
    const response = {
      PipelineData: {
        Value: [
          {
            String: {
              val: ansiescapes.image(imageBuffer, {}),
              span,
            },
          },
          null,
        ],
      },
    };
    writeResponse(id, response);
  } catch (error) {
    console.error("Error generating plot:", error);
    if (error instanceof Error) {
      writeError(id, error.message, span);
    }
  }
}

const NUSHELL_VERSION = process.env.NUSHELL_VERSION || "0.105.1";
const PLUGIN_VERSION = "0.1.1"; // bump if you change commands!

type PluginSignature = {
  sig: {
    name: string;
    description: string;
    extra_description: string;
    required_positional: Array<{ name: string; desc: string; shape: string }>;
    optional_positional: Array<{ name: string; desc: string; shape: string }>;
    rest_positional: { name: string; desc: string; shape: string } | null;
    named: Array<{
      long: string;
      short: string;
      arg: string | null;
      required: boolean;
      desc: string;
    }>;
    input_output_types: Array<[string, string]>;
    allow_variants_without_examples: boolean;
    search_terms: string[];
    is_filter: boolean;
    creates_scope: boolean;
    allows_unknown_args: boolean;
    category: string;
  };
  examples: any[];
};

// Recursive Zod schema for Nushell values (assuming basic JSON-mappable types)
// This schema validates the structure of the incoming Nushell PipelineData
const NushellSpanSchema = zod.object({
  start: zod.number(),
  end: zod.number(),
});

const NushellValueSchema: zod.ZodType<any> = zod.lazy(() =>
  zod.union([
    zod.object({
      Int: zod.object({ val: zod.number(), span: NushellSpanSchema }),
    }),
    zod.object({
      Float: zod.object({ val: zod.number(), span: NushellSpanSchema }),
    }),
    zod.object({
      String: zod.object({ val: zod.string(), span: NushellSpanSchema }),
    }),
    zod.object({
      Bool: zod.object({ val: zod.boolean(), span: NushellSpanSchema }),
    }),
    zod.object({
      List: zod.object({
        vals: zod.array(NushellValueSchema),
        span: NushellSpanSchema,
      }),
    }),
    zod.object({
      Record: zod.object({
        val: zod.record(zod.string(), NushellValueSchema), // Keys are strings, values are recursive
        span: NushellSpanSchema,
      }),
    }),
  ]),
);

// Function to convert a parsed Nushell value to plain JSON (recursive)
function convertNushellToJson(nushellValue: any): any {
  if ("Int" in nushellValue || "Float" in nushellValue) {
    return nushellValue.Int?.val ?? nushellValue.Float?.val; // Treat as number
  } else if ("String" in nushellValue) {
    return nushellValue.String.val;
  } else if ("Bool" in nushellValue) {
    return nushellValue.Bool.val;
  } else if ("List" in nushellValue) {
    return nushellValue.List.vals.map(convertNushellToJson); // Recurse on array items
  } else if ("Record" in nushellValue) {
    const jsonObj: { [key: string]: any } = {};
    for (const [key, val] of Object.entries(nushellValue.Record.val)) {
      jsonObj[key] = convertNushellToJson(val); // Recurse on record values
    }
    return jsonObj;
  }
  throw new Error("Unsupported Nushell value type");
}

function signatures(): { Signature: PluginSignature[] } {
  return {
    Signature: [
      {
        sig: {
          name: "termplot",
          description: "Beautiful plots in your terminal",
          extra_description: "",
          required_positional: [],
          optional_positional: [],
          rest_positional: null, // Set to null since no rest args are needed
          named: [],
          input_output_types: [["Any", "Any"]],
          allow_variants_without_examples: true,
          search_terms: ["JSON", "Convert"],
          is_filter: true, // Set to true for pipeline processing
          creates_scope: false,
          allows_unknown_args: false,
          category: "Experimental",
        },
        examples: [],
      },
    ],
  };
}

async function processCall(id: number, pluginCall: any): Promise<void> {
  // Get the span from the call
  const span = pluginCall.call.head;

  try {
    // Extract the pipeline input (assuming it's PipelineData with a Value)
    const pipelineData = pluginCall.input;

    if (!pipelineData || !("Value" in pipelineData) || !pipelineData.Value[0]) {
      writeError(id, "No valid pipeline data received", span);
      return;
    }

    // The actual Nushell value is in pipelineData.Value[0] (assuming single value; adjust if multiple)
    const nushellValue = pipelineData.Value[0];

    // Validate and parse using Zod
    const parsedValue = NushellValueSchema.parse(nushellValue);

    // Convert to plain JSON object
    const jsonConfig = convertNushellToJson(parsedValue);

    let plotlyConfig: PlotlyBareConfig | undefined;
    try {
      plotlyConfig = plotlyBareConfigSchema.parse(jsonConfig);
    } catch (error) {
      if (error instanceof Error) {
        writeError(id, `Invalid Plotly configuration: ${error.message}`, span);
      }
      return;
    }

    const width = plotlyConfig.layout?.width || 1080;
    const height = plotlyConfig.layout?.height || 810;

    try {
      await generateAndShowPlotly(id, span, plotlyConfig, width, height);
    } catch (error) {
      if (error instanceof Error) {
        writeError(id, `Error generating plot: ${error.message}`, span);
      }
    }
  } catch (err) {
    if (err instanceof Error) {
      writeError(id, `Error processing input: ${err.message}`, span);
    }
  }
}

function tellNushellEncoding(): void {
  process.stdout.write(String.fromCharCode(4));
  for (const ch of "json") {
    process.stdout.write(String.fromCharCode(ch.charCodeAt(0)));
  }
  process.stdout.write("\n");
  process.stdout.resume(); // Ensure output is flushed
}

function tellNushellHello(): void {
  const hello = {
    Hello: {
      protocol: "nu-plugin", // always this value
      version: NUSHELL_VERSION,
      features: [],
    },
  };
  console.log(JSON.stringify(hello));
  const disableGC = {
    Option: {
      GcDisabled: true,
    },
  };
  console.log(JSON.stringify(disableGC));
  process.stdout.resume();
}

function writeResponse(id: number, response: any): void {
  const wrappedResponse = {
    CallResponse: [id, response],
  };
  console.log(JSON.stringify(wrappedResponse));
  process.stdout.resume();
}

function writeError(id: number, text: string, span?: any): void {
  const error = span
    ? {
        Error: {
          msg: "ERROR from plugin",
          labels: [
            {
              text,
              span,
            },
          ],
        },
      }
    : {
        Error: {
          msg: "ERROR from plugin",
          help: text,
        },
      };
  writeResponse(id, error);
}

async function handleInput(input: any): Promise<void> {
  if (typeof input === "object" && input !== null) {
    if ("Hello" in input) {
      if (input.Hello.version !== NUSHELL_VERSION) {
        await closeBrowser();
        process.exit(0);
      } else {
        return;
      }
    } else if ("Signal" in input && input.Signal === "Reset") {
      // Do not respond to this message, or the plugin will be killed!
      // Cleanly exit on Reset signal (no logging, success code)
      // process.exit(0);
      // console.log(JSON.stringify({ Reset: false }));
      // process.stdout.resume(); // Ensure output is flushed
      // console.log("something\n");
      // console.log(JSON.stringify({})); // Empty object or {"Ack": "Reset"}
      return;
    } else if ("Call" in input) {
      const [id, pluginCall] = input.Call;
      if (pluginCall === "Metadata") {
        writeResponse(id, {
          Metadata: {
            version: PLUGIN_VERSION,
          },
        });
      } else if (pluginCall === "Signature") {
        writeResponse(id, signatures());
      } else if ("Run" in pluginCall) {
        processCall(id, pluginCall.Run);
      } else {
        writeError(
          id,
          "Operation not supported: " + JSON.stringify(pluginCall),
        );
      }
    } else {
      console.error("Unknown message: " + JSON.stringify(input));
      await closeBrowser();
      process.exit(0);
    }
  } else if (input === "Goodbye") {
    await closeBrowser();
    process.exit(0);
  } else {
    console.error("Unknown message: " + JSON.stringify(input));
    await closeBrowser();
    process.exit(0);
  }
}

function plugin(): void {
  tellNushellEncoding();
  tellNushellHello();

  let buffer = "";
  process.stdin.setEncoding("utf-8"); // Treat input as strings

  process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Retain incomplete line for next chunk

    lines.forEach(async (line) => {
      if (line.trim()) {
        try {
          const input = JSON.parse(line.trim());
          handleInput(input);
        } catch (err) {
          console.error("Error parsing input: " + err);
          await closeBrowser();
          process.exit(0);
        }
      }
    });
  });

  process.stdin.on("end", async () => {
    await closeBrowser();
    process.exit(0);
  });
}

if (process.argv.length === 3 && process.argv[2] === "--stdio") {
  plugin();
} else {
  console.log("Run me from inside nushell!");
}
