import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (name) => readFile(path.join(root, name));

// Keep old public URLs working, but derive their artwork from the v4 masters.
export async function brandAssets() {
  const logo = await read("public/brand/uyao-logo-v4.svg");
  const reverseLogo = await read("public/brand/uyao-logo-v4-reverse.svg");
  const mark = await read("public/brand/uyao-mark-v4.svg");
  const reverseMark = await read("public/brand/uyao-mark-v4-reverse.svg");
  const monoMark = Buffer.from((await read("public/brand/uyao-logo-v4-mono.svg"))
    .toString().replace(/viewBox="[^"]+"/, 'viewBox="100 215 340 340"'));
  const icon = await read("public/brand/uyao-app-icon-v4.svg");
  const avatar = await read("public/brand/uyao-x-avatar-v4.svg");
  const outputs = new Map([
    ["app/icon.svg", icon],
    ["public/brand/uyao-logo.svg", logo],
    ["public/brand/uyao-logo-reverse.svg", reverseLogo],
    ["public/brand/uyao-mark.svg", mark],
    ["public/brand/uyao-mark-reverse.svg", reverseMark],
    ["public/brand/uyao-mark-mono.svg", monoMark],
    ["public/brand/uyao-x-avatar.svg", avatar],
    ["public/brand/uyao-x-avatar-transparent.svg", mark],
    ["public/brand/uyao-mark-v2-x-safe.svg", avatar],
  ]);
  const png = (source, size) => sharp(source, { density: 288 })
    .resize(size, size).png().toBuffer();
  for (const [name, source, size] of [
    ["app/apple-icon.png", icon, 1024],
    // The 32px PNG also serves as the push badge: retain the transparent
    // mark silhouette rather than the app icon's white background tile.
    ["public/brand/uyao-favicon-16.png", mark, 16],
    ["public/brand/uyao-favicon-32.png", mark, 32],
    ["public/brand/uyao-logo-200x200.png", icon, 200],
    ["public/brand/uyao-logo-640x640.png", icon, 640],
    ["public/brand/uyao-x-avatar-1024.png", avatar, 1024],
    ["public/brand/uyao-x-avatar-400.png", avatar, 400],
    ["public/brand/uyao-x-avatar-transparent-400.png", mark, 400],
    ["public/brand/uyao-mark-v2-transparent-400.png", mark, 400],
    ["public/brand/uyao-mark-v2-x-safe-400.png", avatar, 400],
  ]) outputs.set(name, await png(source, size));

  // ICO supports PNG frames. Include every size, so clients cannot select an
  // overlooked old frame when displaying a tab, link preview, or shortcut.
  const sizes = [16, 32, 48, 64, 128, 256];
  const frames = await Promise.all(sizes.map((size) => png(icon, size)));
  const directory = Buffer.alloc(6 + 16 * frames.length);
  directory.writeUInt16LE(1, 2);
  directory.writeUInt16LE(frames.length, 4);
  let offset = directory.length;
  frames.forEach((frame, index) => {
    const entry = 6 + index * 16;
    directory[entry] = directory[entry + 1] = sizes[index] % 256;
    directory.writeUInt16LE(1, entry + 4);
    directory.writeUInt16LE(32, entry + 6);
    directory.writeUInt32LE(frame.length, entry + 8);
    directory.writeUInt32LE(offset, entry + 12);
    offset += frame.length;
  });
  outputs.set("app/favicon.ico", Buffer.concat([directory, ...frames]));
  return outputs;
}

export async function verifyBrandAssets() {
  const stale = [];
  for (const [name, expected] of await brandAssets()) {
    const actual = await read(name).catch(() => null);
    if (!actual?.equals(expected)) stale.push(name);
  }
  return stale;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--check")) {
    const stale = await verifyBrandAssets();
    if (stale.length) {
      console.error(`Stale brand exports:\n${stale.join("\n")}\nRun npm run generate:brand-assets.`);
      process.exitCode = 1;
    } else console.log("All brand exports match the v4 masters.");
  } else {
    for (const [name, data] of await brandAssets()) await writeFile(path.join(root, name), data);
    console.log("Generated v4 brand exports, including every ICO frame.");
  }
}
