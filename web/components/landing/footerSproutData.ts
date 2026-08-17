import { avatarData, type AnimationName } from "@/components/avatar-lab/sprout.avatar";
import type { AvatarData } from "@/components/avatar-lab/avatar-runtime";

export const FOOTER_MANAGER_ANIMATION = "idle" as const;
export const FOOTER_MANAGER_TRANSFORM = "translateX(-50%)";

// Resting pose of Bible Strong Avatar Lab's Sprout `idle` preset. The footer
// holds only this pose: the preset's second beat (expression-08) yaws the head
// ~45°, and because the body silhouette rotates with the head orientation, the
// tween read as a periodic sway at the footer's 1000px render size. The
// exported Sprout eye defaults are already applied here (the stock behavior
// eye widths minus 3.8, heights minus 5, spacing plus 15).
export const BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS = {
  "expression-00": {
    id: "expression-00",
    headX: 7.3,
    headY: 27.8,
    headZ: -16.1,
    widthLeft: 18.701171875,
    widthRight: 18.701171875,
    heightLeft: 37.377734375,
    heightRight: 37.377734375,
    spacing: 69.3,
    positionXLeft: 0,
    positionXRight: 0,
    positionYLeft: -20.5,
    positionYRight: -20.5,
    leftAngle: 0,
    rightAngle: 0,
    perspective: 1,
    eyeMotion: "none",
    bodyMotion: "none",
  },
} as const;

export const BIBLE_STRONG_SPROUT_IDLE = {
  name: "idle",
  description: "Holds the resting pose; only blinking and pointer eye-follow move.",
  playbackMode: "loop",
  blink: {
    enabled: true,
    initialDelayMs: 2600,
    minIntervalMs: 3400,
    maxIntervalMs: 6200,
    durationMs: 280,
  },
  // One step with a zero-length transition: the runtime re-applies an
  // identical pose on each loop, so no frame ever moves the head or body.
  steps: [
    { expressionId: "expression-00", holdMs: 60000, transitionMs: 0, transition: "smooth" },
  ],
} as const;

/**
 * Footer-only Sprout: the landing footer crops the mascot at its waist, and the
 * stock face cannot survive that cut because the eyes are centred on the head
 * (y 0 of a head spanning -75..75) and are 53 units tall on a 150-unit head.
 *
 * Lifting them means shrinking them too: the head narrows towards the crown, so
 * a full-height eye raised far enough to clear the crop line would spill past
 * the silhouette and get clipped by the head path.
 *
 * `positionY` is an arc-length parameter, not a pixel offset — the runtime maps
 * it through `120 * sin(positionY / 120)` onto the head sphere, so the values
 * here are pre-image coordinates for the intended on-screen centre.
 */
const EYE_CENTRE_Y = -38;
const EYE_HEIGHT_SCALE = 0.79;
const EYE_SPACING_SCALE = 0.92;

const arcForCentre = (centreY: number) => 120 * Math.asin(centreY / 120);

type Expression = Record<string, unknown> & {
  heightLeft: number;
  heightRight: number;
  positionYLeft: number;
  positionYRight: number;
  spacing: number;
};

const liftEyes = (expression: Expression): Expression => ({
  ...expression,
  heightLeft: expression.heightLeft * EYE_HEIGHT_SCALE,
  heightRight: expression.heightRight * EYE_HEIGHT_SCALE,
  positionYLeft: expression.positionYLeft + arcForCentre(EYE_CENTRE_Y),
  positionYRight: expression.positionYRight + arcForCentre(EYE_CENTRE_Y),
  spacing: expression.spacing * EYE_SPACING_SCALE,
});

/**
 * Stable module-level value: `loadAvatarRuntime` caches compiled runtimes in a
 * WeakMap keyed by this object, so rebuilding it per render would compile and
 * leak a new runtime every time.
 */
export const footerSproutData = {
  ...avatarData,
  expressions: Object.fromEntries(
    Object.entries({
      ...avatarData.expressions,
      ...BIBLE_STRONG_SPROUT_IDLE_EXPRESSIONS,
    }).map(([id, expression]) => [id, liftEyes(expression as Expression)]),
  ),
  animations: {
    ...avatarData.animations,
    idle: BIBLE_STRONG_SPROUT_IDLE,
  },
} as unknown as AvatarData<AnimationName | typeof FOOTER_MANAGER_ANIMATION>;
