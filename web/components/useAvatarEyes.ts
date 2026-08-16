"use client";

import { useEffect, type RefObject } from "react";

import { eyeOffset } from "@/lib/avatar-eyes";

/** Chase the pointer quickly, drift back to center slowly. Tuned in #125. */
const CHASE_MS = 180;
const RECENTER_MS = 420;
const EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
/** The Avatar Lab runtime clips the eyes with the head path; nothing else uses clip-path. */
const EYE_GROUPS = 'svg[role="img"] g[clip-path]';

/**
 * Point every Avatar Lab avatar under `root` at the pointer.
 *
 * The bodies stay in their `resting` pose, so this is the only thing that
 * follows the operator around the screen. Avatars mount asynchronously (the
 * runtime arrives as a blob module), so the group list is re-read on each
 * settled frame instead of being cached.
 */
export function useAvatarEyes(root: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const node = root.current;
    if (!node) return;

    const groups = () => node.querySelectorAll<SVGGElement>(EYE_GROUPS);
    const settle = (group: SVGGElement, x: number, y: number, durationMs: number) => {
      group.style.transition = `transform ${durationMs}ms ${EASE}`;
      group.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
    };
    const recenter = () => {
      groups().forEach((group) => settle(group, 0, 0, RECENTER_MS));
    };

    if (!enabled) {
      recenter();
      return;
    }

    let frame = 0;
    let pointer: { x: number; y: number } | null = null;

    const track = () => {
      frame = 0;
      const at = pointer;
      if (!at) return;
      // Measure every avatar before writing any transform: interleaving the two
      // would make each read flush the previous write.
      const moves: { group: SVGGElement; offset: ReturnType<typeof eyeOffset> }[] = [];
      groups().forEach((group) => {
        const rect = group.ownerSVGElement?.getBoundingClientRect();
        if (rect) moves.push({ group, offset: eyeOffset(at, rect) });
      });
      moves.forEach(({ group, offset }) => settle(group, offset.x, offset.y, CHASE_MS));
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      if (frame === 0) frame = window.requestAnimationFrame(track);
    };
    const onPointerLeave = () => {
      pointer = null;
      if (frame !== 0) window.cancelAnimationFrame(frame);
      frame = 0;
      recenter();
    };

    node.addEventListener("pointermove", onPointerMove);
    node.addEventListener("pointerleave", onPointerLeave);
    node.addEventListener("pointercancel", onPointerLeave);
    window.addEventListener("blur", onPointerLeave);
    return () => {
      node.removeEventListener("pointermove", onPointerMove);
      node.removeEventListener("pointerleave", onPointerLeave);
      node.removeEventListener("pointercancel", onPointerLeave);
      window.removeEventListener("blur", onPointerLeave);
      if (frame !== 0) window.cancelAnimationFrame(frame);
      recenter();
    };
  }, [root, enabled]);
}
