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
  it("uses Bible Strong's live Sprout idle sequence", () => {
    expect(FOOTER_MANAGER_ANIMATION).toBe("idle");
    expect(footerSproutData.animations.idle).toBe(BIBLE_STRONG_SPROUT_IDLE);
    expect(BIBLE_STRONG_SPROUT_IDLE.steps).toEqual([
      { expressionId: "expression-00", holdMs: 5200, transitionMs: 500, transition: "smooth" },
      { expressionId: "expression-08", holdMs: 5200, transitionMs: 500, transition: "smooth" },
    ]);
    expect(BIBLE_STRONG_SPROUT_IDLE.blink).toEqual({
      enabled: true,
      initialDelayMs: 2600,
      minIntervalMs: 3400,
      maxIntervalMs: 6200,
      durationMs: 280,
    });
  });

  it("keeps the footer layout fixed while preserving the official poses", () => {
    expect(FOOTER_MANAGER_TRANSFORM).toBe("translateX(-50%)");
    expect(Object.keys(BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS)).toEqual([
      "expression-00",
      "expression-08",
    ]);
    expect(avatarData.expressions).not.toHaveProperty("expression-00");
    expect(footerSproutData.expressions).toHaveProperty("expression-00");
  });
});
