import { tmpdir } from "node:os";
import { join } from "node:path";

export function defaultSocketPath(): string {
  return join(tmpdir(), `termplotd-${process.getuid?.() ?? "user"}.sock`);
}
