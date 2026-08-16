/**
 * Eye-tracking geometry for the Avatar Lab exports.
 *
 * Every export renders into a `-150 -150 300 300` viewBox, so a CSS translate
 * on the eye group is expressed in those user units: the same offset reads as
 * a different number of screen pixels depending on how large the avatar is
 * rendered. Store OS draws Agents at 28-42px where the landing footer's 5-unit
 * travel would be sub-pixel, so travel is scaled to keep the eye movement
 * perceptible at any size while staying inside the face.
 */
export const AVATAR_VIEWBOX = 300;

/** Screen travel we aim for at the extremes of the pointer range. */
const TARGET_TRAVEL_PX = 2;
/** Landing footer travel, tuned in #125 for the 900px manager. */
const MIN_TRAVEL_UNITS = 5;
/** Beyond this the eyes start to crowd the edge of the smaller faces. */
const MAX_TRAVEL_UNITS = 16;
/** Faces are wider than they are tall, so vertical travel stays shorter. */
const VERTICAL_RATIO = 0.6;

export type EyeRect = { left: number; top: number; width: number; height: number };
export type EyeOffset = { x: number; y: number };

const clampUnit = (value: number) => Math.max(-1, Math.min(1, value));

/** Horizontal eye travel, in viewBox units, for an avatar rendered this wide. */
export function eyeTravelUnits(renderedWidthPx: number): number {
  if (!(renderedWidthPx > 0)) return MIN_TRAVEL_UNITS;
  const units = (TARGET_TRAVEL_PX * AVATAR_VIEWBOX) / renderedWidthPx;
  return Math.min(MAX_TRAVEL_UNITS, Math.max(MIN_TRAVEL_UNITS, units));
}

/** Eye offset in viewBox units for a pointer at `pointer` over an avatar at `rect`. */
export function eyeOffset(pointer: { x: number; y: number }, rect: EyeRect): EyeOffset {
  if (!(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 };
  const travel = eyeTravelUnits(rect.width);
  const horizontal = clampUnit((pointer.x - (rect.left + rect.width / 2)) / (rect.width / 2));
  const vertical = clampUnit((pointer.y - (rect.top + rect.height / 2)) / (rect.height / 2));
  return {
    x: horizontal * travel,
    y: vertical * travel * VERTICAL_RATIO,
  };
}
