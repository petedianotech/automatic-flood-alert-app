import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const SVG_PATH = path.resolve('public/icon.svg');
const RES_DIR = path.resolve('android/app/src/main/res');

// Adaptive foreground SVG (transparent background, padded for 108dp viewport)
const FOREGROUND_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <g transform="translate(56, 56) scale(0.78)">
    <circle cx="256" cy="256" r="210" fill="#1A73E8" opacity="0.95"/>
    <circle cx="256" cy="256" r="170" fill="#1557B0" opacity="0.5"/>
    <!-- Warning Triangle -->
    <path d="M256 110 L380 320 L132 320 Z" fill="#FEEFC3" stroke="#F9AB00" stroke-width="18" stroke-linejoin="round"/>
    <!-- Exclamation mark -->
    <rect x="246" y="180" width="20" height="75" rx="10" fill="#D93025"/>
    <circle cx="256" cy="285" r="12" fill="#D93025"/>
    <!-- Water waves -->
    <path d="M90 380 Q 170 340, 256 380 T 422 380" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round"/>
    <path d="M110 425 Q 190 385, 276 425 T 402 425" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
  </g>
</svg>`;

// Splash screen generator
function createSplashSvg(width, height) {
  const isLandscape = width > height;
  const iconScale = isLandscape ? Math.min(width * 0.35, height * 0.5) : Math.min(width * 0.45, 240);
  const cx = width / 2;
  const cy = height / 2 - (isLandscape ? 0 : 40);
  
  return `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#0F172A"/>
    <!-- Center Icon -->
    <g transform="translate(${cx - iconScale / 2}, ${cy - iconScale / 2}) scale(${iconScale / 512})">
      <rect width="512" height="512" rx="110" fill="#1A73E8"/>
      <circle cx="256" cy="256" r="180" fill="#1557B0" opacity="0.4"/>
      <path d="M256 110 L380 320 L132 320 Z" fill="#FEEFC3" stroke="#F9AB00" stroke-width="18" stroke-linejoin="round"/>
      <rect x="246" y="180" width="20" height="75" rx="10" fill="#D93025"/>
      <circle cx="256" cy="285" r="12" fill="#D93025"/>
      <path d="M90 380 Q 170 340, 256 380 T 422 380" fill="none" stroke="#FFFFFF" stroke-width="24" stroke-linecap="round"/>
      <path d="M110 425 Q 190 385, 276 425 T 402 425" fill="none" stroke="#FFFFFF" stroke-width="18" stroke-linecap="round" opacity="0.85"/>
    </g>
    <!-- App Name Title -->
    <text x="${cx}" y="${cy + iconScale / 2 + 50}" fill="#F8FAFC" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.max(16, Math.min(28, width * 0.05))}" font-weight="bold" text-anchor="middle" letter-spacing="0.5">Dzenje Flood Alert</text>
    <text x="${cx}" y="${cy + iconScale / 2 + 80}" fill="#94A3B8" font-family="system-ui, -apple-system, sans-serif" font-size="${Math.max(12, Math.min(16, width * 0.03))}" text-anchor="middle">Community Early Warning System</text>
  </svg>`;
}

// Icon configurations
const ICON_DENSITIES = [
  { dir: 'mipmap-mdpi', size: 48, fgSize: 108 },
  { dir: 'mipmap-hdpi', size: 72, fgSize: 162 },
  { dir: 'mipmap-xhdpi', size: 96, fgSize: 216 },
  { dir: 'mipmap-xxhdpi', size: 144, fgSize: 324 },
  { dir: 'mipmap-xxxhdpi', size: 192, fgSize: 432 },
];

const SPLASH_SCREENS = [
  { dir: 'drawable', w: 480, h: 800 },
  { dir: 'drawable-land-mdpi', w: 480, h: 320 },
  { dir: 'drawable-land-hdpi', w: 800, h: 480 },
  { dir: 'drawable-land-xhdpi', w: 1280, h: 720 },
  { dir: 'drawable-land-xxhdpi', w: 1600, h: 960 },
  { dir: 'drawable-land-xxxhdpi', w: 1920, h: 1080 },
  { dir: 'drawable-port-mdpi', w: 320, h: 480 },
  { dir: 'drawable-port-hdpi', w: 480, h: 800 },
  { dir: 'drawable-port-xhdpi', w: 720, h: 1280 },
  { dir: 'drawable-port-xxhdpi', w: 960, h: 1600 },
  { dir: 'drawable-port-xxxhdpi', w: 1080, h: 1920 },
];

async function generateAssets() {
  console.log('Generating Android icons and splash screens...');

  // 1. Generate standard and adaptive launcher icons
  for (const { dir, size, fgSize } of ICON_DENSITIES) {
    const targetDir = path.join(RES_DIR, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Standard square icon
    await sharp(SVG_PATH)
      .resize(size, size)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher.png'));

    // Round icon (with circular crop mask)
    const circleBuffer = Buffer.from(
      `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="#fff"/></svg>`
    );
    await sharp(SVG_PATH)
      .resize(size, size)
      .composite([{ input: circleBuffer, blend: 'dest-in' }])
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_round.png'));

    // Adaptive icon foreground
    await sharp(Buffer.from(FOREGROUND_SVG))
      .resize(fgSize, fgSize)
      .png()
      .toFile(path.join(targetDir, 'ic_launcher_foreground.png'));

    console.log(`Generated ${dir} icons (${size}x${size}, fg ${fgSize}x${fgSize})`);
  }

  // 2. Generate Splash Screens
  for (const { dir, w, h } of SPLASH_SCREENS) {
    const targetDir = path.join(RES_DIR, dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const splashSvg = createSplashSvg(w, h);
    await sharp(Buffer.from(splashSvg))
      .png()
      .toFile(path.join(targetDir, 'splash.png'));

    console.log(`Generated ${dir}/splash.png (${w}x${h})`);
  }

  console.log('All Android icon and splash assets successfully created!');
}

generateAssets().catch(err => {
  console.error('Error generating assets:', err);
  process.exit(1);
});
