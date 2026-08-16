import { describe, expect, it } from "vitest";

import { avatarData } from "@/components/avatar-lab/sprout.avatar";

/**
 * The landing footer plays Sprout's `ambient` animation, modelled on the
 * x.ai/bot footer character: it never enters, it just keeps living — the body
 * drifts, the gaze cycles through mood beats, and every mood returns to idle.
 */
const ambient = avatarData.animations.ambient;
const expressions: Record<string, (typeof avatarData.expressions)[keyof typeof avatarData.expressions]> =
  avatarData.expressions;
const idle = expressions["expression-ambient"];

describe("sprout ambient animation", () => {
  it("loops and blinks", () => {
    expect(ambient.playbackMode).toBe("loop");
    expect(ambient.blink.enabled).toBe(true);
  });

  it("keeps the same ambient signature on every beat", () => {
    // The runtime restarts its drift and saccade clocks whenever `bodyMotion`
    // or `eyeMotion` changes, so a beat that switched them would visibly snap.
    for (const step of ambient.steps) {
      const expression = expressions[step.expressionId];
      expect(expression.bodyMotion).toBe("slowDrift");
      expect(expression.eyeMotion).toBe("microSaccades");
    }
  });

  it("returns to idle between mood beats", () => {
    const beats = ambient.steps.map((step) => step.expressionId);
    expect(beats.length % 2).toBe(0);
    beats.forEach((id, index) => {
      if (index % 2 === 0) expect(id).toBe("expression-ambient");
      else expect(id).not.toBe("expression-ambient");
    });
    expect(new Set(beats).size).toBe(beats.length / 2 + 1);
  });

  it("holds each beat for seconds, not frames", () => {
    for (const step of ambient.steps) {
      expect(step.holdMs).toBeGreaterThanOrEqual(4000);
      expect(step.transitionMs).toBeGreaterThanOrEqual(600);
    }
  });

  it("keeps every mood within a few degrees of idle", () => {
    for (const step of ambient.steps) {
      const expression = expressions[step.expressionId];
      for (const axis of ["headX", "headY", "headZ"] as const) {
        expect(Math.abs(expression[axis] - idle[axis])).toBeLessThanOrEqual(5);
      }
      expect(Math.abs(expression.heightLeft - idle.heightLeft)).toBeLessThanOrEqual(15);
      expect(Math.abs(expression.widthLeft - idle.widthLeft)).toBeLessThanOrEqual(3);
      expect(expression.heightLeft).toBe(expression.heightRight);
      expect(expression.widthLeft).toBe(expression.widthRight);
    }
  });
});
