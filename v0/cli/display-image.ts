import process from "node:process";
import ansiescapes from "ansi-escapes";

// Array to collect all incoming chunks
const chunks: Buffer[] = [];

// Listen for data chunks
process.stdin.on("data", (chunk: Buffer) => {
  chunks.push(chunk);  // Accumulate chunks
});

// Handle completion of input
process.stdin.on("end", () => {
  if (chunks.length === 0) {
    console.error("No image data received.");
    process.exit(1);
  }

  // Concatenate all chunks into a single Buffer
  const imageBuffer = Buffer.concat(chunks);

  // Render the image
  const imageStr = ansiescapes.image(imageBuffer);
  console.log(imageStr);

  // Clean exit
  process.exit(0);
});

// Handle any stdin errors
process.stdin.on("error", (err) => {
  console.error("Error reading stdin:", err.message);
  process.exit(1);
});
