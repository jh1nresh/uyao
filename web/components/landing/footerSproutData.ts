import { avatarData, type AnimationName } from "@/components/avatar-lab/sprout.avatar";
import type { AvatarData } from "@/components/avatar-lab/avatar-runtime";

// Keep the large footer mascot on the generated Bible Strong sequence. Unlike
// the hand-written ambient experiment, `listening` has no procedural body
// drift, so scaling Sprout to 1000px does not amplify sub-pixel movement.
export const FOOTER_MANAGER_ANIMATION = "listening" as const;

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
    Object.entries(avatarData.expressions).map(([id, expression]) => [
      id,
      liftEyes(expression as Expression),
    ]),
  ),
} as unknown as AvatarData<AnimationName>;
