#!/usr/bin/env node
// Export actual WebP files. Text is typeset from catalog records, never OCR or model-generated.
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = path.resolve(import.meta.dirname, '..');
const require = createRequire(import.meta.url);
const sharp = require('sharp');
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = path.join(root, 'public/products/info-v2');
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const temp = await mkdtemp(path.join(process.env.PRODUCT_INFO_TMP || tmpdir(), 'uyao-product-info-'));
let browser;
try {
  execFileSync(path.join(root, 'node_modules/.bin/tsc'), ['lib/data.ts', 'lib/product-info-content.ts', '--outDir', temp, '--module', 'commonjs', '--target', 'es2020', '--esModuleInterop', '--resolveJsonModule', '--skipLibCheck'], { cwd: root, stdio: 'inherit' });
  const { allDrugs } = require(path.join(temp, 'data.js'));
  const { productInfoPanels } = require(path.join(temp, 'product-info-content.js'));
  const template = await readFile(path.join(root, 'scripts/product-info-image.html'), 'utf8');
  browser = await chromium.launchPersistentContext(path.join(temp, 'browser'), { executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true, viewport: { width: 1000, height: 1200 } });
  const page = await browser.newPage();
  const manifest = {};
  await mkdir(out, { recursive: true });
  for (const drug of allDrugs()) for (const locale of ['zh', 'en']) {
    const entries = [];
    for (const panel of productInfoPanels(drug, locale)) {
      const sections = panel.sections.map((section, index) => `<section><h3><span>${String(index + 1).padStart(2, '0')}</span>${escape(section.title)}</h3><dl>${section.rows.map((row) => `<div class="row"><dt>${escape(row.name)}</dt>${row.value ? `<dd>${escape(row.value)}</dd>` : ''}</div>`).join('')}</dl></section>`).join('');
      const html = template.replaceAll('__FONT_ROOT__', pathToFileURL(path.join(root, 'app/fonts')).href).replace('__MASTHEAD__', locale === 'en' ? 'CABINET PRODUCT NOTES' : '藥櫃品項資料').replace('__KIND__', panel.kind).replace('__NAME__', escape(panel.name)).replace('__TITLE__', escape(panel.title)).replace('__SUBTITLE__', escape(panel.subtitle)).replace('__SECTIONS__', sections).replace('__NOTES__', panel.notes.map((note) => `<p>${escape(note)}</p>`).join(''));
      const file = path.join(temp, 'card.html');
      await writeFile(file, html);
      await page.goto(pathToFileURL(file).href);
      await page.evaluate(() => document.fonts.ready);
      const card = page.locator('article');
      const size = await card.boundingBox();
      if (!size || size.height > 4000) throw new Error(`Unexpected card height for ${drug.slug}/${panel.kind}`);
      const src = `/products/info-v2/${drug.slug}-${locale}-${panel.kind}.webp`;
      const buffer = await card.screenshot();
      const webp = await sharp(buffer).webp({ quality: 94 }).toBuffer();
      await writeFile(path.join(root, 'public', src), webp);
      entries.push({ sha256: createHash('sha256').update(webp).digest('hex'), src, width: 1000, height: Math.ceil(size.height), content: panel });
    }
    manifest[`${drug.slug}:${locale}`] = entries;
  }
  await writeFile(path.join(root, 'lib/product-info-images.generated.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(`Exported ${Object.values(manifest).flat().length} WebP cards for ${allDrugs().length} products.`);
} finally {
  await browser?.close();
  await rm(temp, { recursive: true, force: true });
}
