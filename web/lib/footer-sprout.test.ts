import { describe, expect, it } from "vitest";

import { avatarData } from "@/components/avatar-lab/sprout.avatar";
import {
  BIBLE_STRONG_SPROUT_IDLE,
  BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS,
  FOOTER_MANAGER_ANIMATION,
  FOOTER_MANAGER_TRANSFORM,
  footerSproutData,
} from "@/components/landing/footerSproutData";

describe("footer manager animation", () => {
  it("holds one static pose so the footer mascot never sways", () => {
    expect(FOOTER_MANAGER_ANIMATION).toBe("idle");
    expect(footerSproutData.animations.idle).toBe(BIBLE_STRONG_SPROUT_IDLE);
    // A single zero-transition step is the no-sway guarantee: any second pose
    // rotates the head, and the whole silhouette rotates with it, which read
    // as periodic drift at the footer's 1000px render size.
    expect(BIBLE_STRONG_SPROUT_IDLE.steps).toEqual([
      { expressionId: "expression-00", holdMs: 60000, transitionMs: 0, transition: "smooth" },
    ]);
    expect(BIBLE_STRONG_SPROUT_IDLE.blink).toEqual({
      enabled: true,
      initialDelayMs: 2600,
      minIntervalMs: 3400,
      maxIntervalMs: 6200,
      durationMs: 280,
    });
  });

  it("opts the held pose out of ambient drift", () => {
    const pose = BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS["expression-00"];
    expect(pose.eyeMotion).toBe("none");
    expect(pose.bodyMotion).toBe("none");
  });

  it("keeps the footer layout fixed while preserving the official pose", () => {
    expect(FOOTER_MANAGER_TRANSFORM).toBe("translateX(-50%)");
    expect(Object.keys(BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS)).toEqual(["expression-00"]);
    expect(avatarData.expressions).not.toHaveProperty("expression-00");
    expect(footerSproutData.expressions).toHaveProperty("expression-00");
  });
});
