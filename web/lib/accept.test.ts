import { describe, expect, it } from "vitest";

import {
  API_TYPES,
  PAGE_TYPES,
  appendVaryAccept,
  isRscRequest,
  markdownHeaders,
  preferredType,
  prefersMarkdown,
} from "./accept";

describe("Accept negotiation", () => {
  it("keeps HTML as the page default when Accept is missing", () => {
    expect(preferredType(null, PAGE_TYPES)).toBe("text/html");
    expect(prefersMarkdown(null)).toBe(false);
  });

  it("keeps JSON as the API default when Accept is missing", () => {
    expect(preferredType(null, API_TYPES)).toBe("application/json");
    expect(prefersMarkdown(null, API_TYPES)).toBe(false);
  });

  it("selects markdown when the client prefers it", () => {
    expect(prefersMarkdown("text/markdown")).toBe(true);
    expect(prefersMarkdown("text/markdown, text/html", PAGE_TYPES)).toBe(true);
    expect(prefersMarkdown("text/markdown", API_TYPES)).toBe(true);
  });

  it("keeps HTML for a browser Accept list", () => {
    expect(preferredType("text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", PAGE_TYPES)).toBe(
      "text/html",
    );
  });

  it("honors q=0 rejection", () => {
    expect(preferredType("text/html;q=0, text/markdown", PAGE_TYPES)).toBe("text/markdown");
    expect(preferredType("text/html;q=0, text/markdown;q=0", PAGE_TYPES)).toBeNull();
  });

  it("skips RSC navigations", () => {
    expect(isRscRequest(new Headers({ rsc: "1" }))).toBe(true);
    expect(isRscRequest(new Headers({ "next-router-state-tree": "1" }))).toBe(true);
    expect(isRscRequest(new Headers({ accept: "text/markdown" }))).toBe(false);
  });

  it("appends Accept to Vary without duplicating it", () => {
    const headers = new Headers({ vary: "Accept-Encoding" });
    appendVaryAccept(headers);
    appendVaryAccept(headers);
    expect(headers.get("vary")).toBe("Accept-Encoding, Accept");
  });

  it("makes markdown cache variants explicit without duplicate tokens", () => {
    const headers = markdownHeaders({ vary: "RSC, Accept" });
    expect(headers.get("vary")).toBe("RSC, Accept, Accept-Encoding");
    expect(markdownHeaders(headers).get("vary")).toBe("RSC, Accept, Accept-Encoding");
  });
});
