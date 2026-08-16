import { describe, expect, it } from "vitest";

import {
  BROWSER_RUNTIME_SOURCE,
  ENGINE_SOURCE,
} from "@/components/avatar-lab/avatar-runtime";
import { avatarData } from "@/components/avatar-lab/sprout.avatar";

/**
 * Sprout retains the experimental `ambient` animation for compatibility. The
 * landing footer deliberately does not use it because its procedural body
 * drift is too visible when the avatar is rendered at 1000px.
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

/**
 * Drives the real runtime sources with a stub DOM and a manual clock, because
 * the shake this guards against only exists frame-to-frame: the drift noise is
 * seeded by head angles, and sampling it through the pose interpolated during
 * a mood-beat transition turns the seed into a per-frame hash re-roll.
 */
type StubElement = {
  id: string;
  children: StubElement[];
  parent: StubElement | null;
  style: Record<string, unknown>;
  attributes: Record<string, string>;
  lastElementChild: StubElement | null;
  setAttribute: (name: string, value: string) => void;
  append: (...nodes: StubElement[]) => void;
  remove: () => void;
  replaceChildren: (...nodes: StubElement[]) => void;
  getContext: (kind: string, options?: unknown) => null;
};

const createStubElement = (): StubElement => {
  const element: StubElement = {
    id: "",
    children: [],
    parent: null,
    style: {},
    attributes: {},
    get lastElementChild() {
      return element.children[element.children.length - 1] ?? null;
    },
    setAttribute(name, value) {
      element.attributes[name] = String(value);
    },
    append(...nodes) {
      for (const node of nodes) {
        node.parent = element;
        element.children.push(node);
      }
    },
    remove() {
      const siblings = element.parent?.children;
      if (siblings) siblings.splice(siblings.indexOf(element), 1);
      element.parent = null;
    },
    replaceChildren(...nodes) {
      element.children = [];
      element.append(...nodes);
    },
    getContext: () => null,
  };
  return element;
};

const mountAmbientAvatar = (autoplay = true) => {
  let now = 0;
  const rafCallbacks = new Map<number, (time: number) => void>();
  let nextRafId = 1;
  const timers: Array<{ id: number; due: number; fn: () => void }> = [];
  let nextTimerId = 1;

  const engine = new Function(`${ENGINE_SOURCE}\nreturn AvatarProceduralEngine;`)() as unknown;
  const mountAvatar = new Function(
    "AvatarProceduralEngine",
    "DATA",
    "document",
    "performance",
    "requestAnimationFrame",
    "cancelAnimationFrame",
    "setTimeout",
    "clearTimeout",
    `${BROWSER_RUNTIME_SOURCE}\nreturn mountAvatar;`,
  )(
    engine,
    avatarData,
    { createElementNS: createStubElement, createElement: createStubElement },
    { now: () => now },
    (fn: (time: number) => void) => {
      const id = nextRafId++;
      rafCallbacks.set(id, fn);
      return id;
    },
    (id: number) => rafCallbacks.delete(id),
    (fn: () => void, delay: number) => {
      const id = nextTimerId++;
      timers.push({ id, due: now + delay, fn });
      return id;
    },
    (id: number) => {
      const index = timers.findIndex((timer) => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
  ) as (target: StubElement, options: Record<string, unknown>) => void;

  const host = createStubElement();
  mountAvatar(host, { animation: "ambient", autoplay, loop: true, size: "100%" });

  const advance = (ms: number, onFrame?: () => void) => {
    const target = now + ms;
    while (now < target) {
      now = Math.min(now + 16, target);
      timers.sort((a, b) => a.due - b.due);
      while (timers.length && timers[0].due <= now) timers.shift()!.fn();
      const due = [...rafCallbacks.values()];
      rafCallbacks.clear();
      for (const fn of due) fn(now);
      onFrame?.();
    }
  };

  const readMotion = () => {
    const svg = host.children[0];
    const motionLayer = svg.children[1];
    const head = motionLayer.children[1];
    const translate = /translate\((-?[\d.]+) (-?[\d.]+)\)/.exec(motionLayer.attributes.transform ?? "");
    const headStart = /^M(-?[\d.]+) (-?[\d.]+)/.exec(head.attributes.d ?? "");
    if (!translate || !headStart) throw new Error("runtime did not render motion");
    return {
      x: Number(translate[1]),
      y: Number(translate[2]),
      headX: Number(headStart[1]),
      headY: Number(headStart[2]),
    };
  };

  return { advance, readMotion };
};

describe("sprout ambient runtime", () => {
  it("stays still when autoplay is disabled", () => {
    const { advance, readMotion } = mountAmbientAvatar(false);
    const before = readMotion();
    advance(3000);
    expect(readMotion()).toEqual(before);
  });

  it("keeps body drift continuous across a mood-beat transition", () => {
    const { advance, readMotion } = mountAmbientAvatar();
    // First beat holds until 7900ms, then transitions for 900ms; sample well
    // past both edges so the window covers hold → transition → next hold.
    advance(7000);
    const samples: Array<ReturnType<typeof readMotion>> = [];
    advance(3000, () => samples.push(readMotion()));

    let maxDriftStep = 0;
    let maxHeadStep = 0;
    for (let index = 1; index < samples.length; index += 1) {
      const previous = samples[index - 1];
      const sample = samples[index];
      maxDriftStep = Math.max(maxDriftStep, Math.hypot(sample.x - previous.x, sample.y - previous.y));
      maxHeadStep = Math.max(maxHeadStep, Math.hypot(sample.headX - previous.headX, sample.headY - previous.headY));
    }
    // Healthy drift moves well under 0.1 viewBox units per 16ms frame; the
    // seed-slide bug produced random jumps of a unit or more.
    expect(maxDriftStep).toBeLessThan(0.3);
    expect(maxHeadStep).toBeLessThan(0.75);
  });
});
