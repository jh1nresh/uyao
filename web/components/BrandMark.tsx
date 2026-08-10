/**
 * Uyao brand mark. The open U carries the local search need; the connected Y
 * joins pharmacy signals and pharmacist confirmation without claiming stock.
 *
 * Canonical lockups, reverse/mono variants, and favicon exports live in
 * `public/brand/`. Keep this inline copy geometrically identical to the kit.
 */
export function BrandMark({ size = 26 }: { size?: number }) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 192 192"
      className="flex-none"
    >
      <path
        d="M44 28v78c0 34 16 52 48 52 24 0 36-16 36-42v-12L98 64m30 40 30-40"
        fill="none"
        stroke="#0B7A3E"
        strokeWidth="32"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  );
}
