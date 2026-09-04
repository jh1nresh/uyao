import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import { allDrugs } from "./data";
import { PRODUCT_SHOWCASE_PLATE, productShowcaseItems } from "./product-showcase";

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

describe("homepage product showcase shelf", () => {
  it("keeps one fixed empty cabinet plate and packshots for every featured item", () => {
    const items = productShowcaseItems(allDrugs());
    expect(items).toHaveLength(8);
    expect(items[0]?.drug.slug).toBe("greenplus-elgucare");

    const plate = path.join(PUBLIC_DIR, PRODUCT_SHOWCASE_PLATE);
    expect(existsSync(plate), "缺少空櫃底板").toBe(true);
    const plateSize = webpDimensions(plate);
    expect(plateSize.width / plateSize.height, "空櫃底板必須是寬幅").toBeGreaterThan(4);

    for (const item of items) {
      const image = item.drug.image;
      expect(image?.kind, `${item.drug.slug} 必須是去背包裝照`).toBe("packshot");
      const file = path.join(PUBLIC_DIR, image!.src);
      expect(existsSync(file), `${item.drug.slug} 缺少包裝照`).toBe(true);
    }
  });
});
