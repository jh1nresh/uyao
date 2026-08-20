import type { ComponentType, CSSProperties } from "react";

import { FlameStatic } from "./static/flame.svg";
import { FooterSproutStatic } from "./static/footer-sprout.svg";
import { PepperStatic } from "./static/pepper.svg";
import { SaplingStatic } from "./static/sapling.svg";
import { SproutStatic } from "./static/sprout.svg";

export type StaticAvatarId = "manager" | "inventory" | "purchasing" | "checkout" | "footer-manager";

type StaticAvatarProps = {
  id: StaticAvatarId;
  size: number | string;
  className?: string;
  style?: CSSProperties;
};

type StaticAvatarComponent = ComponentType<Omit<StaticAvatarProps, "id">>;

const STATIC_AVATARS: Record<StaticAvatarId, StaticAvatarComponent> = {
  manager: SproutStatic,
  inventory: SaplingStatic,
  purchasing: FlameStatic,
  checkout: PepperStatic,
  "footer-manager": FooterSproutStatic,
};

export function StaticAvatar({ id, ...props }: StaticAvatarProps) {
  const Component = STATIC_AVATARS[id];
  return <Component {...props} />;
}
