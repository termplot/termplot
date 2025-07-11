#!/usr/bin/env node
// Example of using a TypeScript/Node.js script as a Nushell plugin
//
// The example uses JSON encoding but it should be a similar process using
// msgpack to move data between Nushell and the plugin. The only difference
// would be that you need to use a msgpack library (like @msgpack/msgpack) to
// decode and encode information that is read and written to stdin and stdout
//
// To register the plugin use:
//   plugin add <path-to-ts-file>
//
// Be careful with the spans. Miette will crash if a span is outside the
// size of the contents vector. We strongly suggest using the span found in the
// plugin call head as in this example.
//
// The plugin will be run using the active Node.js implementation. If you are in
// a Node.js environment, that is the Node.js version that is used
//
// Note: To keep the plugin simple and without dependencies, the objects that
//   represent the data transferred between Nushell and the plugin are kept as
//   native JavaScript objects. The encoding and decoding process could be improved
//   by using libraries like zod for validation
//
// This plugin uses Node.js with TypeScript
// Note: To debug plugins write to stderr using console.error

import * as process from "node:process";

const NUSHELL_VERSION = process.env.NUSHELL_VERSION || "0.105.1";
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

function signatures(): { Signature: PluginSignature[] } {
  return {
    Signature: [
      {
        sig: {
          name: "nu-typescript",
          description: "Signature test for TypeScript",
          extra_description: "",
          required_positional: [
            {
              name: "a",
              desc: "required integer value",
              shape: "Int",
            },
            {
              name: "b",
              desc: "required string value",
              shape: "String",
            },
          ],
          optional_positional: [
            {
              name: "opt",
              desc: "Optional number",
              shape: "Int",
            },
          ],
          rest_positional: {
            name: "rest",
            desc: "rest value string",
            shape: "String",
          },
          named: [
            {
              long: "help",
              short: "h",
              arg: null,
              required: false,
              desc: "Display the help message for this command",
            },
            {
              long: "flag",
              short: "f",
              arg: null,
              required: false,
              desc: "a flag for the signature",
            },
            {
              long: "named",
              short: "n",
              arg: "String",
              required: false,
              desc: "named string",
            },
          ],
          input_output_types: [["Any", "Any"]],
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

  // Creates a Value of type List that will be encoded and sent to Nushell
  function f(x: number, y: number): { Int: { val: number; span: any } } {
    return { Int: { val: x * y, span } };
  }

  const value = {
    Value: [
      {
        List: {
          vals: Array.from({ length: 10 }, (_, x) => ({
            Record: {
              val: {
                one: f(x, 0),
                two: f(x, 1),
                three: f(x, 2),
              },
              span,
            },
          })),
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
        process.exit(1);
      } else {
        return;
      }
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
      process.exit(1);
    }
  } else if (input === "Goodbye") {
    process.exit(0);
  } else {
    console.error("Unknown message: " + JSON.stringify(input));
    process.exit(1);
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

    lines.forEach((line) => {
      if (line.trim()) {
        try {
          const input = JSON.parse(line.trim());
          handleInput(input);
        } catch (err) {
          console.error("Error parsing input: " + err);
          process.exit(1);
        }
      }
    });
  });

  process.stdin.on("end", () => {
    process.exit(0);
  });
}

if (process.argv.length === 3 && process.argv[2] === "--stdio") {
  plugin();
} else {
  console.log("Run me from inside nushell!");
}
