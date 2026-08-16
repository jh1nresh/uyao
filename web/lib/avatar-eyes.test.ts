import { describe, expect, it } from "vitest";

import { eyeOffset, eyeTravelUnits } from "@/lib/avatar-eyes";

const rect = (width: number, height = width) => ({ left: 0, top: 0, width, height });

describe("eyeTravelUnits", () => {
  it("keeps the landing footer travel for the large manager avatar", () => {
    expect(eyeTravelUnits(900)).toBe(5);
  });

  it("scales travel up so Store OS chrome avatars stay perceptible", () => {
    expect(eyeTravelUnits(96)).toBeCloseTo(6.25, 2);
    expect(eyeTravelUnits(38)).toBeCloseTo(15.79, 2);
  });

  it("caps travel so the smallest avatars keep their eyes inside the face", () => {
    expect(eyeTravelUnits(20)).toBe(16);
    expect(eyeTravelUnits(4)).toBe(16);
  });

  it("falls back to the minimum travel for unmeasured avatars", () => {
    expect(eyeTravelUnits(0)).toBe(5);
    expect(eyeTravelUnits(Number.NaN)).toBe(5);
  });
});

describe("eyeOffset", () => {
  it("recenters when the pointer sits on the avatar", () => {
    expect(eyeOffset({ x: 19, y: 19 }, rect(38))).toEqual({ x: 0, y: 0 });
  });

  it("tracks the pointer within the travel budget", () => {
    const travel = eyeTravelUnits(38);
    const right = eyeOffset({ x: 400, y: 19 }, rect(38));
    expect(right.x).toBeCloseTo(travel, 5);
    expect(right.y).toBe(0);

    const upLeft = eyeOffset({ x: -400, y: -400 }, rect(38));
    expect(upLeft.x).toBeCloseTo(-travel, 5);
    expect(upLeft.y).toBeCloseTo(-travel * 0.6, 5);
  });

  it("keeps vertical travel shorter than horizontal travel", () => {
    const corner = eyeOffset({ x: 1000, y: 1000 }, rect(900));
    expect(corner.x).toBe(5);
    expect(corner.y).toBeCloseTo(3, 5);
  });

  it("stays centered for avatars that are not laid out", () => {
    expect(eyeOffset({ x: 100, y: 100 }, rect(0))).toEqual({ x: 0, y: 0 });
  });
});
