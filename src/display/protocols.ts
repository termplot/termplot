export type TerminalProtocol = "auto" | "kitty" | "iterm2" | "sixel";
export type ResolvedTerminalProtocol = Exclude<TerminalProtocol, "auto" | "sixel">;

export type TerminalEnvironment = Record<string, string | undefined>;

const kittyChunkSize = 4096;

export class DisplayError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "DisplayError";
    this.code = code;
  }
}

export function encodeKittyPng(png: Buffer): Buffer {
  if (png.length === 0) {
    throw new DisplayError("INVALID_IMAGE", "cannot encode an empty PNG");
  }

  const encoded = png.toString("base64");
  const chunks: Buffer[] = [];
  for (let start = 0; start < encoded.length; start += kittyChunkSize) {
    const chunk = encoded.slice(start, start + kittyChunkSize);
    const first = start === 0;
    const last = start + kittyChunkSize >= encoded.length;
    const metadata = first ? `a=T,f=100,q=2,m=${last ? 0 : 1}` : `q=2,m=${last ? 0 : 1}`;
    chunks.push(Buffer.from(`\x1b_G${metadata};${chunk}\x1b\\`, "binary"));
  }
  chunks.push(Buffer.from("\n", "binary"));
  return Buffer.concat(chunks);
}

export function encodeIterm2Png(png: Buffer, name = "termplot.png"): Buffer {
  if (png.length === 0) {
    throw new DisplayError("INVALID_IMAGE", "cannot encode an empty PNG");
  }

  const encodedName = Buffer.from(name).toString("base64");
  const encodedPng = png.toString("base64");
  const header = `\x1b]1337;File=name=${encodedName};size=${png.length};inline=1;preserveAspectRatio=1:`;
  return Buffer.from(`${header}${encodedPng}\x07\n`, "binary");
}

export function resolveTerminalProtocol(
  requested: TerminalProtocol,
  env: TerminalEnvironment = process.env,
): ResolvedTerminalProtocol {
  if (requested === "kitty" || requested === "iterm2") {
    return requested;
  }

  if (requested === "sixel") {
    throw new DisplayError(
      "PROTOCOL_NOT_IMPLEMENTED",
      "SIXEL output is proven for iTerm2 but is not implemented as a production TermPlot display path yet",
    );
  }

  if (isGhostty(env)) {
    return "kitty";
  }

  if (isIterm2(env)) {
    return "iterm2";
  }

  throw new DisplayError(
    "UNSUPPORTED_TERMINAL",
    "could not auto-detect Ghostty or iTerm2; use --protocol kitty or --protocol iterm2",
  );
}

export function encodeTerminalImage(protocol: ResolvedTerminalProtocol, png: Buffer): Buffer {
  if (protocol === "kitty") {
    return encodeKittyPng(png);
  }
  return encodeIterm2Png(png);
}

function isGhostty(env: TerminalEnvironment): boolean {
  return env.TERM_PROGRAM === "ghostty" || env.TERM_PROGRAM === "Ghostty" || env.GHOSTTY_RESOURCES_DIR !== undefined;
}

function isIterm2(env: TerminalEnvironment): boolean {
  return env.TERM_PROGRAM === "iTerm.app" || env.TERM_PROGRAM === "iTerm2" || env.ITERM_SESSION_ID !== undefined;
}
