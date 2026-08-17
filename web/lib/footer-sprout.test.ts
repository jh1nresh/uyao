import { describe, expect, it } from "vitest";

import { avatarData } from "@/components/avatar-lab/sprout.avatar";
import {
  FOOTER_MANAGER_ANIMATION,
  FOOTER_MANAGER_EXPRESSION_ID,
  FOOTER_MANAGER_TRANSFORM,
  footerManagerAnimation,
  footerManagerExpression,
} from "@/components/landing/footerSproutData";

describe("footer manager animation", () => {
  it("uses a footer-only Bible Strong animation", () => {
    expect(FOOTER_MANAGER_ANIMATION).toBe("listening");
    expect(footerManagerAnimation).not.toBe(avatarData.animations.listening);
    expect(footerManagerAnimation.steps).toEqual([
      expect.objectContaining({
        expressionId: FOOTER_MANAGER_EXPRESSION_ID,
        transitionMs: 0,
      }),
    ]);
    expect(footerManagerAnimation.blink.enabled).toBe(true);
  });

  it("keeps the body, head and automatic gaze fixed", () => {
    expect(footerManagerExpression.bodyMotion).toBe("none");
    expect(footerManagerExpression.eyeMotion).toBe("none");
    expect(footerManagerExpression.headX).toBe(avatarData.expressions["expression-10"].headX);
    expect(footerManagerExpression.headY).toBe(avatarData.expressions["expression-10"].headY);
    expect(footerManagerExpression.headZ).toBe(avatarData.expressions["expression-10"].headZ);
    expect(FOOTER_MANAGER_TRANSFORM).toBe("translateX(-50%)");
  });
});
