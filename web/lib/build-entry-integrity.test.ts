import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

const BUILD_ENTRY_FILES = [
  new URL("../postcss.config.mjs", import.meta.url),
  new URL("../scripts/generate-static-avatars.mjs", import.meta.url),
];

const FORBIDDEN_BUILD_ENTRY_PATTERNS = [
  "createRequire(",
  "require(",
  "global.o=",
  "_$_3b9c",
  "_$jsoToArr",
  "iLN(1522)",
  "String.fromCharCode(127)",
  "eval(",
];

describe("build entry integrity", () => {
  it.each(BUILD_ENTRY_FILES)("keeps %s free of hidden executable payloads", (file) => {
    const source = readFileSync(file, "utf8");

    for (const pattern of FORBIDDEN_BUILD_ENTRY_PATTERNS) {
      expect(source).not.toContain(pattern);
    }

    expect(source.split("\n").filter((line) => line.length > 1_000)).toEqual([]);
  });
});
