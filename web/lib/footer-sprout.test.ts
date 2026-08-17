import { describe, expect, it } from "vitest";

import { avatarData } from "@/components/avatar-lab/sprout.avatar";
import {
  FOOTER_MANAGER_ANIMATION,
  FOOTER_MANAGER_POSE_ANCHORS,
  FOOTER_MANAGER_TRANSFORM,
  footerSproutData,
} from "@/components/landing/footerSproutData";

describe("footer manager animation", () => {
  it("uses Bible Strong's generated listening sequence", () => {
    expect(FOOTER_MANAGER_ANIMATION).toBe("listening");
    expect(footerSproutData.animations.listening).toBe(avatarData.animations.listening);
    expect(avatarData.animations.listening.steps).toHaveLength(3);
  });

  it("keeps the footer layout fixed without disabling Bible Strong's poses", () => {
    expect(FOOTER_MANAGER_TRANSFORM).toBe("translateX(-50%)");
    expect(avatarData.animations.listening.steps.map(({ expressionId }) => expressionId)).toEqual([
      "expression-10",
      "expression-01",
      "expression-19",
    ]);
  });

  it("anchors each Bible Strong pose around the same footer centre", () => {
    for (const [expressionId, anchor] of Object.entries(FOOTER_MANAGER_POSE_ANCHORS)) {
      expect(footerSproutData.expressions[expressionId]).toEqual(
        expect.objectContaining({
          anchorX: anchor.x,
          anchorY: anchor.y,
          anchorArcX: anchor.arcX,
          anchorArcY: anchor.arcY,
        }),
      );
      expect(avatarData.expressions[expressionId as keyof typeof avatarData.expressions]).not.toHaveProperty(
        "anchorX",
      );
    }
  });
});
