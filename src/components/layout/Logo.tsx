export function Logo({
  showWordmark = true,
  className,
}: {
  showWordmark?: boolean;
  className?: string;
}) {
  return (
    <span
      className={["inline-flex items-center gap-2", className]
        .filter(Boolean)
        .join(" ")}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0 text-primary"
        role={showWordmark ? undefined : "img"}
        aria-hidden={showWordmark ? "true" : undefined}
        aria-label={showWordmark ? undefined : "Dossier"}
      >
        <path
          d="M1 10.2C1 8.03 2.76 6.28 4.93 6.28h6.06c.83 0 1.62.33 2.2.91l1.5 1.5h12.38C29.24 8.69 31 10.44 31 12.61v12.66c0 2.17-1.76 3.92-3.93 3.92H4.93C2.76 29.19 1 27.44 1 25.27z"
          fill="currentColor"
        />
        <path
          d="M7.4 17.9h17.2"
          style={{ stroke: "var(--primary-foreground)" }}
          strokeWidth="2.6"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-xl font-bold tracking-tight text-foreground">
          Dossier
        </span>
      ) : null}
    </span>
  );
}