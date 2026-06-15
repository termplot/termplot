import fs from "fs";
import path from "path";
import sharp from "sharp";
import pngToIco from "png-to-ico";
import { fileURLToPath } from "url";

// Convert import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define the configuration interface with format-specific sizes
interface ImageProcessorConfig {
  maxConcurrentTasks: number;
  sourceDir: string;
  outputDir: string;
  outputTsFile: string;
  iconWebPath: string;
  pngSizes: number[];
  jpegSizes: number[];
  webpSizes: number[];
  icoSizes: number[];
}

// Configuration as a typed JSON blob with format-specific sizes
const config: ImageProcessorConfig = {
  maxConcurrentTasks: 10,
  sourceDir: "raw-icons",
  outputDir: "public/images",
  outputTsFile: "app/util/aicons.ts",
  iconWebPath: "/images",
  pngSizes: [180], // Empty means no PNG output
  jpegSizes: [], // Empty means no JPEG output
  webpSizes: [32, 64, 96, 128, 180, 200, 300, 400],
  icoSizes: [128],
};

// Resolve paths relative to __dirname when reading config
const {
  maxConcurrentTasks: N,
  sourceDir: sourceDirRelative,
  outputDir: outputDirRelative,
  outputTsFile: outputTsFileRelative,
  iconWebPath,
  pngSizes,
  jpegSizes,
  webpSizes,
  icoSizes,
} = config;

// Convert relative paths to absolute paths
const sourceDir = path.resolve(__dirname, sourceDirRelative);
const outputDir = path.resolve(__dirname, outputDirRelative);
const outputTsFile = path.resolve(__dirname, outputTsFileRelative);

// Define format-specific configurations
const formatConfigs = [
  { format: "png", sizes: pngSizes, extension: "png" },
  { format: "jpeg", sizes: jpegSizes, extension: "jpg" },
  { format: "webp", sizes: webpSizes, extension: "webp" },
  { format: "ico", sizes: icoSizes, extension: "ico" },
] as const;

// Collect all output paths for the type definition
const outputPaths: string[] = [];

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Helper function to process an individual image file
async function processFile(file: string) {
  const baseName = path.basename(file, ".png");

  for (const { format, sizes, extension } of formatConfigs) {
    // Skip if no sizes specified for this format
    if (sizes.length === 0) {
      continue;
    }

    for (const size of sizes) {
      const outputFileName = `${baseName}-${size}.${extension}`;
      const outputPath = path.join(outputDir, outputFileName);
      const webPath = `${iconWebPath}/${outputFileName}`;

      // Add path to the outputPaths array for type generation
      outputPaths.push(webPath);

      try {
        if (format === "ico") {
          // Special handling for ICO format
          const buffer = await sharp(path.join(sourceDir, file))
            .resize(size, size)
            .toFormat("png")
            .toBuffer();
          const icoBuffer = await pngToIco([buffer]);
          fs.writeFileSync(outputPath, icoBuffer);
        } else {
          // Standard handling for other formats
          await sharp(path.join(sourceDir, file))
            .resize(size, size)
            .toFormat(format as keyof sharp.FormatEnum)
            .toFile(outputPath);
        }
        console.log(`Processed ${outputFileName}`);
      } catch (error) {
        console.error(`Error processing ${outputFileName}:`, error);
      }
    }
  }
}

// Utility to run tasks in batches of N
async function runInBatches(files: string[], batchSize: number) {
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    await Promise.all(batch.map((file) => processFile(file)));
  }
}

// Get PNG files and start processing in batches
const files = fs
  .readdirSync(sourceDir)
  .filter((file) => path.extname(file).toLowerCase() === ".png");
runInBatches(files, N).then(() => {
  // Generate the TypeScript type file after processing all images
  const typesFilePath = outputTsFile;
  const typeContent = `export type AIcon =\n  ${outputPaths
    .sort()
    .map((path) => `"${path}"`)
    .join(" |\n  ")};
export const $aicon = (icon: AIcon) => icon;
`;

  fs.writeFileSync(typesFilePath, typeContent);
  console.log(`Generated types file at ${typesFilePath}`);
});
