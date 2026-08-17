import { describe, expect, it } from "vitest";

import { ENGINE_SOURCE } from "@/components/avatar-lab/avatar-runtime";
import { avatarData } from "@/components/avatar-lab/sprout.avatar";
import {
  FOOTER_MANAGER_ANIMATION,
  FOOTER_MANAGER_EXPRESSION_ID,
  FOOTER_MANAGER_TRANSFORM,
  footerManagerAnimation,
  footerManagerExpression,
} from "@/components/landing/footerSproutData";

type AvatarEngine = {
  ambientBodyOffset: (expression: typeof footerManagerExpression, elapsedMs: number, strength: number) => {
    x: number;
    y: number;
  };
  ambientEyeOffset: (expression: typeof footerManagerExpression, elapsedMs: number, strength: number) => {
    x: number;
    y: number;
  };
};

const engine = new Function(`${ENGINE_SOURCE}\nreturn AvatarProceduralEngine;`)() as AvatarEngine;

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

  it("keeps the body and head fixed while the gaze stays alive", () => {
    expect(footerManagerExpression.bodyMotion).toBe("none");
    expect(footerManagerExpression.eyeMotion).toBe("microSaccades");
    expect(footerManagerExpression.headX).toBe(avatarData.expressions["expression-10"].headX);
    expect(footerManagerExpression.headY).toBe(avatarData.expressions["expression-10"].headY);
    expect(footerManagerExpression.headZ).toBe(avatarData.expressions["expression-10"].headZ);
    expect(FOOTER_MANAGER_TRANSFORM).toBe("translateX(-50%)");
  });

  it("moves only the eyes over time", () => {
    const elapsedTimes = [0, 800, 1600, 2400, 3200];
    const eyeOffsets = elapsedTimes.map((elapsedMs) =>
      engine.ambientEyeOffset(footerManagerExpression, elapsedMs, 1),
    );
    const bodyOffsets = elapsedTimes.map((elapsedMs) =>
      engine.ambientBodyOffset(footerManagerExpression, elapsedMs, 1),
    );

    expect(new Set(eyeOffsets.map(({ x, y }) => `${x.toFixed(3)},${y.toFixed(3)}`)).size).toBeGreaterThan(1);
    expect(bodyOffsets).toEqual(elapsedTimes.map(() => ({ x: 0, y: 0 })));
  });
});
