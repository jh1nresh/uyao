import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { productShowcaseItems } from "./product-showcase";

const PUBLIC_DIR = path.resolve(import.meta.dirname, "..", "public");

function webpDimensions(file: string) {
  const buffer = readFileSync(file);
  expect(buffer.subarray(0, 4).toString(), `${file} 缺少 RIFF 標頭`).toBe("RIFF");
  expect(buffer.subarray(8, 12).toString(), `${file} 不是 WebP`).toBe("WEBP");

  const chunk = buffer.subarray(12, 16).toString();
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff,
    };
  }
  if (chunk === "VP8X") {
    return {
      width: buffer.readUIntLE(24, 3) + 1,
      height: buffer.readUIntLE(27, 3) + 1,
    };
  }
  throw new Error(`${file} 使用未支援的 WebP 區塊 ${chunk}`);
}

describe("homepage product showcase scenes", () => {
  it("uses one finished wide source scene for every featured cabinet bay", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(new Set(items.map((item) => item.sceneSrc)).size).toBe(8);

    for (const item of items) {
      const file = path.join(PUBLIC_DIR, item.sceneSrc);
      expect(existsSync(file), `${item.drug.slug} 缺少完整商品櫃景`).toBe(true);
      const { width, height } = webpDimensions(file);
      expect(width / height, `${item.drug.slug} 必須是寬幅櫃景`).toBeGreaterThan(4);
    }
  });
});
