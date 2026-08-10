import Image from "next/image";

const ASPECT_RATIO = 1245 / 330;

/** Full uYao | 有藥 lockup for the company landing navigation and footer. */
export function BrandLogo({ height = 34 }: { height?: number }) {
  return (
    <Image
      src="/brand/uyao-logo-v4.svg"
      alt="uYao 有藥"
      width={Math.round(height * ASPECT_RATIO)}
      height={height}
      className="h-auto flex-none"
      priority
      unoptimized
    />
  );
}
