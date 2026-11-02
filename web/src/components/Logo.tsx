/**
 * Brand mark: a drawer with an index dot — "the thing is in here".
 * The same geometry is used by /public/favicon.svg.
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      className="shrink-0"
    >
      <rect width="32" height="32" rx="7" fill="#3d52f4" />
      <rect
        x="8.5"
        y="8"
        width="15"
        height="16"
        rx="2"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2"
      />
      <path d="M13.5 13h5" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" />
      <circle cx="16" cy="19.2" r="2.1" fill="#ffb224" />
    </svg>
  );
}
