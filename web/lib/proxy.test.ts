import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "../proxy";
import { SITE_URL } from "./seo";
import { SHOP_URL } from "./shop";

function request(url: string) {
  return proxy(new NextRequest(url));
}

describe("canonical host routing", () => {
  it("serves the Consumer implementation at the clean localized shop URL", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw?area=datong");
    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-rewrite")).toBe(
      "https://shop.uyaohealth.com/app?area=datong",
    );
  });

  it("permanently removes the old app segment on the shop host", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw/app?area=datong");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SHOP_URL}/zh-tw?area=datong`);
  });

  it("redirects company-host Consumer copies to the shop canonical", () => {
    const response = request("https://uyaohealth.com/zh-tw/drug/example?area=datong");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(
      `${SHOP_URL}/zh-tw/drug/example?area=datong`,
    );
  });

  it("redirects company content requested on the shop host", () => {
    const response = request("https://shop.uyaohealth.com/en/pharmacy");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/en/pharmacy`);
  });

  it("keeps Store OS off the consumer shop host", () => {
    const response = request("https://shop.uyaohealth.com/zh-tw/store-os");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/zh-tw/store-os`);
  });

  it("redirects www to the company canonical host", () => {
    const response = request("https://www.uyaohealth.com/zh-tw/evidence");
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${SITE_URL}/zh-tw/evidence`);
  });
});
