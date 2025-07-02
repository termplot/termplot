export async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8").trim()),
    );
    process.stdin.on("error", reject);
  });
}

