// Logo pipeline (issue 0006 exp 2): public/images/termplot-mark.svg → PNG
// derivatives in public/. Outputs are committed so builds never depend on
// rerunning this. Sharp rasterizes the SVG (at high density for crisp edges)
// and composites the OG card; png-to-ico packs the ICO container (sharp cannot
// encode ICO, and a PNG payload at favicon.ico is valid).
import pngToIco from "png-to-ico";
import sharp from "sharp";
import { writeFile } from "node:fs/promises";

const PUB = new URL("../public/", import.meta.url).pathname;
const OUT = new URL("../public/images/", import.meta.url).pathname;
const MARK = new URL("../public/images/termplot-mark.svg", import.meta.url)
  .pathname;

// Render the SVG mark to a square PNG buffer at the given pixel size. High
// density keeps strokes crisp when the 256-unit viewBox is scaled up.
const renderMark = (size: number) =>
  sharp(MARK, { density: Math.max(384, size * 3) })
    .resize(size, size)
    .png()
    .toBuffer();

// Header/footer mark + PNG favicon sizes.
for (const size of [64, 128, 192]) {
  await writeFile(`${OUT}/termplot-mark-${size}.png`, await renderMark(size));
}

// Hero raster (1x/2x). The hero may use the SVG directly; these exist for
// parity and social reuse.
await writeFile(`${OUT}/termplot-hero.png`, await renderMark(360));
await writeFile(`${OUT}/termplot-hero@2x.png`, await renderMark(720));

// Favicon: 32px PNG packed into the ICO container.
await writeFile(`${PUB}/favicon.ico`, await pngToIco([await renderMark(32)]));

// OG image: 1200x630, dark brand background, mark + wordmark + tagline.
const markLarge = await renderMark(340);
const ogText = Buffer.from(`<svg width="1200" height="630">
  <text x="470" y="300" font-family="Helvetica, Arial, sans-serif"
    font-weight="bold" font-size="110">
    <tspan fill="#2dd4bf">Term</tspan><tspan fill="#fbbf24">Plot</tspan>
  </text>
  <text x="472" y="372" font-family="Helvetica, Arial, sans-serif"
    font-size="40" fill="#93a1af">Plotly plots in your terminal</text>
</svg>`);
await sharp({
  create: {
    width: 1200,
    height: 630,
    channels: 4,
    background: { r: 0x0d, g: 0x11, b: 0x17, alpha: 1 },
  },
})
  .composite([
    { input: markLarge, left: 90, top: 145 },
    { input: ogText, left: 0, top: 0 },
  ])
  .png()
  .toFile(`${OUT}/og-termplot.png`);

console.log("images processed → public/");
