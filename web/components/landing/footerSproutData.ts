import { avatarData, type AnimationName } from "@/components/avatar-lab/sprout.avatar";
import type { AvatarData } from "@/components/avatar-lab/avatar-runtime";

export const FOOTER_MANAGER_ANIMATION = "listening" as const;
export const FOOTER_MANAGER_TRANSFORM = "translateX(-50%)";

// Bible Strong rotates Sprout's whole generated model, including the three
// lower body nodes. At the 1000px footer scale that moves the visible centre by
// up to ~21px even though the outer box is fixed. These viewBox-unit offsets
// counter that pose-specific displacement without reading layout every frame.
export const FOOTER_MANAGER_POSE_ANCHORS = {
  "expression-10": { x: 0, y: 0, arcX: -1.45, arcY: -0.83 },
  "expression-01": { x: 5.26, y: 4.43, arcX: -3.25, arcY: 0 },
  "expression-19": { x: 0.33, y: 2.82, arcX: 0, arcY: 0.5 },
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

const anchorPose = (id: string, expression: Expression): Expression => {
  const anchor = FOOTER_MANAGER_POSE_ANCHORS[id as keyof typeof FOOTER_MANAGER_POSE_ANCHORS];
  return {
    ...liftEyes(expression),
    anchorX: anchor?.x ?? 0,
    anchorY: anchor?.y ?? 0,
    anchorArcX: anchor?.arcX ?? 0,
    anchorArcY: anchor?.arcY ?? 0,
  };
};

/**
 * Stable module-level value: `loadAvatarRuntime` caches compiled runtimes in a
 * WeakMap keyed by this object, so rebuilding it per render would compile and
 * leak a new runtime every time.
 */
export const footerSproutData = {
  ...avatarData,
  expressions: Object.fromEntries(
    Object.entries(avatarData.expressions).map(([id, expression]) => [
      id,
      anchorPose(id, expression as Expression),
    ]),
  ),
} as unknown as AvatarData<AnimationName>;
