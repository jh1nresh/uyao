import Image from "next/image";

/** Compact mark for consumer chrome and small workflow surfaces. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <Image
      aria-hidden
      alt=""
      src="/brand/uyao-mark-v3.svg"
      width={size}
      height={size}
      className="flex-none"
      unoptimized
    />
  );
}
