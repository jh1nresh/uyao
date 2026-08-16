import Image from "next/image";

/** Compact mark for consumer chrome and small workflow surfaces. */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <>
      <Image
        aria-hidden
        alt=""
        src="/brand/uyao-mark-v4.svg"
        width={size}
        height={size}
        className="theme-logo-light flex-none"
        unoptimized
      />
      <Image
        aria-hidden
        alt=""
        src="/brand/uyao-mark-reverse.svg"
        width={size}
        height={size}
        className="theme-logo-dark flex-none"
        unoptimized
      />
    </>
  );
}
