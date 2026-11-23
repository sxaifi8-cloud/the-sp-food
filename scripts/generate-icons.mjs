import sharp from "sharp";
import fs from "fs";
import path from "path";

const outDir = path.resolve("public");
fs.mkdirSync(outDir, { recursive: true });

// 1. Crop square center from tall 9:16 source images
async function cropSquareCenter(inputPath, zoomFactor = 0.72) {
  const meta = await sharp(inputPath).metadata();
  const size = Math.round(meta.width * zoomFactor);
  const left = Math.round((meta.width - size) / 2);
  const top = Math.round((meta.height - size) / 2);
  return sharp(inputPath).extract({ left, top, width: size, height: size });
}

const iconSrc = path.resolve("assets-src/app-icon.jpg");
const fullSrc = path.resolve("assets-src/brand-full.jpg");

// App Icon / Favicon / OneSignal / Google Search Icon variants (from Image 2)
const iconSizes = [
  { name: "favicon-16x16.png", size: 16 },
  { name: "favicon-32x32.png", size: 32 },
  { name: "google-icon-48x48.png", size: 48 },     // Google Search minimum 48x48
  { name: "apple-touch-icon.png", size: 180 },     // iOS Home Screen
  { name: "icon-192.png", size: 192 },             // PWA & OneSignal Notification Icon
  { name: "icon-512.png", size: 512 },             // PWA Splash & Play Store / Google
];

for (const item of iconSizes) {
  const base = await cropSquareCenter(iconSrc, 0.72);
  await base.resize(item.size, item.size).png().toFile(path.join(outDir, item.name));
}

// Full Brand Emblem variants (from Image 1) for Navbar, Footer & Splash Screen
const fullBase = await cropSquareCenter(fullSrc, 0.78);
await fullBase.resize(512, 512).png().toFile(path.join(outDir, "logo.png"));

const splashBase = await cropSquareCenter(fullSrc, 0.78);
await splashBase
  .resize(640, 640)
  .extend({
    top: 320,
    bottom: 320,
    left: 220,
    right: 220,
    background: "#1C2029",
  })
  .png()
  .toFile(path.join(outDir, "splash-screen.png"));

// Clean scalable SVG vector badge for crisp infinite scaling
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <circle cx="256" cy="256" r="244" fill="#FF6B2B"/>
  <path d="M168 236 C168 176 212 138 264 138 C316 138 360 176 360 236 Z" fill="#FFD43B"/>
  <circle cx="264" cy="126" r="12" fill="#FFD43B"/>
  <rect x="148" y="346" width="232" height="16" rx="8" fill="#FFD43B"/>
  <path d="M98 188 H152 L144 198 H98 Z" fill="#FFFFFF"/>
  <path d="M84 214 H146 L138 224 H84 Z" fill="#FFFFFF"/>
  <path d="M108 242 H148 L142 252 H108 Z" fill="#FFD43B"/>
  <text x="258" y="324" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-style="italic" font-weight="900" font-size="112" fill="#FFFFFF" letter-spacing="2">SP</text>
</svg>`;
fs.writeFileSync(path.join(outDir, "logo.svg"), svgContent);

// PWA Web Manifest for Add-to-Home-Screen & Splash Screen
const manifest = {
  name: "The SP Food — Signature Plates",
  short_name: "The SP Food",
  description: "Faisalabad hyper-local food delivery across D Ground, Kohinoor, People's Colony, Satiana Road & Madina Town.",
  start_url: "/",
  display: "standalone",
  background_color: "#1C2029",
  theme_color: "#FF6B2B",
  icons: [
    { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
    { src: "/logo.svg", sizes: "any", type: "image/svg+xml" }
  ]
};
fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

console.log("✅ Generated all logo, icon, SVG, Google icon, and splash assets in /public");