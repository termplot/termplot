import fs from "node:fs";
import path from "node:path";
import esbuild from "esbuild";

const __dirname = path.resolve();

// Build configuration for esbuild
esbuild
  .build({
    entryPoints: ["./*.ts", "./util/**/*.ts"], // Replace with your main entry file
    bundle: false, // Set to true if you want to bundle dependencies
    outdir: "build", // Output directory for compiled files
    platform: "node", // Target platform is Node.js
    target: "esnext", // Target JavaScript version
    format: "esm", // Output format (use 'cjs' if you prefer CommonJS)
    sourcemap: false, // Optional: Generate source maps for debugging
  })
  .then(() => {
    console.log("Build successful with esbuild!");

    // Post-process to replace .ts with .js in import/export statements
    const distDir = path.join(__dirname, "build");
    replaceTsExtensions(distDir);
  })
  .catch((error) => {
    console.error("Build failed:", error);
    process.exit(1);
  });

// Function to recursively replace .ts with .js in files
function replaceTsExtensions(dir: string) {
  const files = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of files) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      replaceTsExtensions(filePath); // Recurse into subdirectories
    } else if (file.name.endsWith(".js")) {
      let content = fs.readFileSync(filePath, "utf8");
      const originalContent = content;
      // Replace .ts extensions in import/export statements with .js
      content = content.replace(
        /(import\s+.*from\s+['"].*\.)ts(['"])/g,
        "$1js$2",
      );
      content = content.replace(
        /(export\s+.*from\s+['"].*\.)ts(['"])/g,
        "$1js$2",
      );
      fs.writeFileSync(filePath, content, "utf8");
      if (content !== originalContent) {
        console.log(`Updated extensions in ${filePath}`);
      }
    }
  }
}
