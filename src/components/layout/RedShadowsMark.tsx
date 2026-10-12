export function RedShadowsMark({ className }: { className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className={["shrink-0", className].filter(Boolean).join(" ")}
      role="img"
      aria-label="Red Shadows"
    >
      <rect
        x="1.2"
        y="1.2"
        width="21.6"
        height="21.6"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <text
        x="12"
        y="16.4"
        textAnchor="middle"
        fontSize="11"
        fontWeight="700"
        fill="currentColor"
        fontFamily="inherit"
      >
        RS
      </text>
    </svg>
  );
}