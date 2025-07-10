#!/usr/bin/env node
import * as process from "node:process";
import zod from "zod/v4";

const NUSHELL_VERSION = "0.105.1";
const PLUGIN_VERSION = "0.1.1"; // bump if you change commands!

type PluginSignature = {
  sig: {
    name: string;
    description: string;
    extra_description: string;
    required_positional: Array<{ name: string; desc: string; shape: string }>;
    optional_positional: Array<{ name: string; desc: string; shape: string }>;
    rest_positional: { name: string; desc: string; shape: string };
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
    zod.object({ Int: zod.object({ val: zod.number(), span: NushellSpanSchema }) }),
    zod.object({ Float: zod.object({ val: zod.number(), span: NushellSpanSchema }) }),
    zod.object({ String: zod.object({ val: zod.string(), span: NushellSpanSchema }) }),
    zod.object({ Bool: zod.object({ val: zod.boolean(), span: NushellSpanSchema }) }),
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
  ])
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
          name: "tojson",
          description: "Convert a nushell value to JSON format",
          extra_description: "",
          required_positional: [],
          optional_positional: [],
          rest_positional: {
            name: "rest",
            desc: "rest value string",
            shape: "String",
          },
          named: [],
          input_output_types: [["Record", "String"]],
          allow_variants_without_examples: true,
          search_terms: ["TypeScript", "Example"],
          is_filter: false,
          creates_scope: false,
          allows_unknown_args: false,
          category: "Experimental",
        },
        examples: [],
      },
    ],
  };
}

function processCall(id: number, pluginCall: any): void {
  // Pretty printing the call to stderr
  console.error(JSON.stringify(pluginCall, null, 4));

  // Get the span from the call
  const span = pluginCall.call.head;

  // Extract the pipeline input (assuming it's PipelineData with a Value)
  const pipelineData = pluginCall.input;

  if (!pipelineData || !("Value" in pipelineData) || !pipelineData.Value[0]) {
    throw new Error("No valid pipeline data received");
  }

  // The actual Nushell value is in pipelineData.Value[0] (assuming single value; adjust if multiple)
  const nushellValue = pipelineData.Value[0];

  // Validate and parse using Zod
  const parsedValue = NushellValueSchema.parse(nushellValue);

  // Convert to plain JSON object
  const jsonObj = convertNushellToJson(parsedValue);

  // Stringify to JSON string
  const jsonString = JSON.stringify(jsonObj);

  const value = {
    Value: [
      {
        String: {
          val: jsonString,
          span,
        },
      },
      null,
    ],
  };

  writeResponse(id, { PipelineData: value });
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
  process.stdout.write(JSON.stringify(hello) + "\n");
  process.stdout.resume();
}

function writeResponse(id: number, response: any): void {
  const wrappedResponse = {
    CallResponse: [id, response],
  };
  process.stdout.write(JSON.stringify(wrappedResponse) + "\n");
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

function handleInput(input: any): void {
  if (typeof input === "object" && input !== null) {
    if ("Hello" in input) {
      if (input.Hello.version !== NUSHELL_VERSION) {
        globalThis.process.exit(1);
      } else {
        return;
      }
    } else if ("Signal" in input && input.Signal === "Reset") {
      // do nothing for now
      // TODO: Add cleanup
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
      globalThis.process.exit(1);
    }
  } else if (input === "Goodbye") {
    globalThis.process.exit(0);
  } else {
    console.error("Unknown message: " + JSON.stringify(input));
    globalThis.process.exit(1);
  }
}

function plugin(): void {
  tellNushellEncoding();
  tellNushellHello();

  let buffer = "";
  globalThis.process.stdin.setEncoding("utf-8"); // Treat input as strings

  globalThis.process.stdin.on("data", (chunk: string) => {
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Retain incomplete line for next chunk

    lines.forEach((line) => {
      if (line.trim()) {
        try {
          const input = JSON.parse(line.trim());
          handleInput(input);
        } catch (err) {
          console.error("Error parsing input: " + err);
          globalThis.process.exit(1);
        }
      }
    });
  });

  globalThis.process.stdin.on("end", () => {
    globalThis.process.exit(0);
  });
}

if (process.argv.length === 3 && process.argv[2] === "--stdio") {
  plugin();
} else {
  console.log("Run me from inside nushell!");
}
