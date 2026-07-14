// THE ICONS.
//
// There is no rasteriser in this repo and there is not going to be one. `web/icon.html`
// draws the icon in the same CSS the game is drawn in, and this screenshots it at the
// sizes iOS and Android actually ask for.
//
// This is a BUILD-TIME script and it is the only thing in the repo that touches
// playwright. It is not imported by the game, it does not run in CI, and the PNGs it
// produces are committed — so a clone with no node_modules still has its icons.
//
//   npm run icons

import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'web', 'icons');
mkdirSync(out, { recursive: true });

// 180 — apple-touch-icon, which is the one that ends up on her home screen.
// 192/512 — the web app manifest. 512 is what the splash is built from.
const SIZES = [180, 192, 512];

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
await page.goto(`file://${join(root, 'web', 'icon.html')}`);

for (const size of SIZES) {
  // the source is drawn at 512; scale the whole thing rather than re-laying it out, so a
  // 180 icon is the same picture and not a different one
  await page.setViewportSize({ width: size, height: size });
  await page.evaluate((s) => {
    const el = document.getElementById('icon');
    el.style.transform = `scale(${s / 512})`;
    el.style.transformOrigin = 'top left';
  }, size);
  await page.locator('body').screenshot({ path: join(out, `icon-${size}.png`) });
  console.log(`web/icons/icon-${size}.png`);
}

await browser.close();
