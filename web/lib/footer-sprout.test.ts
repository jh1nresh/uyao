import { describe, expect, it } from "vitest";

import { avatarData } from "@/components/avatar-lab/sprout.avatar";
import {
  FOOTER_MANAGER_ANIMATION,
  footerSproutData,
} from "@/components/landing/footerSproutData";

describe("footer manager animation", () => {
  it("uses Bible Strong's generated listening sequence", () => {
    expect(FOOTER_MANAGER_ANIMATION).toBe("listening");
    expect(footerSproutData.animations.listening).toBe(avatarData.animations.listening);
  });

  it("does not add procedural body drift at footer scale", () => {
    const animation = avatarData.animations[FOOTER_MANAGER_ANIMATION];

    for (const step of animation.steps) {
      expect(avatarData.expressions[step.expressionId].bodyMotion).toBe("none");
    }
  });
});
