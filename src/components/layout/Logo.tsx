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
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        className="shrink-0 text-primary"
        role={showWordmark ? undefined : "img"}
        aria-hidden={showWordmark ? "true" : undefined}
        aria-label={showWordmark ? undefined : "Dossier"}
      >
        <path
          d="M5 10.5C5 8.57 6.57 7 8.5 7h3.9c.66 0 1.3.26 1.77.73L15.9 9h7.6C25.43 9 27 10.57 27 12.5v9C27 23.43 25.43 25 23.5 25h-15C6.57 25 5 23.43 5 21.5z"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M10 16.5h12"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark ? (
        <span className="text-lg font-bold tracking-tight text-foreground">
          Dossier
        </span>
      ) : null}
    </span>
  );
}