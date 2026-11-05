import type { ComponentKind } from "../domain/systemDesign";
export function Icon({
  name,
  size = 20,
}: {
  name:
    | ComponentKind
    | "layers"
    | "play"
    | "lock"
    | "arrow"
    | "check"
    | "close"
    | "reset"
    | "compare"
    | "book"
    | "plus"
    | "minus"
    | "info";
  size?: number;
}) {
  const paths: Record<string, React.ReactNode> = {
    client: (
      <>
        <rect x="3" y="4" width="18" height="13" rx="2" />
        <path d="M8 21h8M12 17v4" />
      </>
    ),
    "api-server": (
      <>
        <rect x="4" y="3" width="16" height="7" rx="2" />
        <rect x="4" y="14" width="16" height="7" rx="2" />
        <path d="M8 6.5h.01M8 17.5h.01M12 7h5M12 18h5" />
      </>
    ),
    "local-data": (
      <>
        <rect x="5" y="5" width="14" height="14" rx="2" />
        <path d="M9 1v4m6-4v4M9 19v4m6-4v4M1 9h4m-4 6h4m14-6h4m-4 6h4" />
      </>
    ),
    "relational-database": (
      <>
        <ellipse cx="12" cy="5" rx="8" ry="3" />
        <path d="M4 5v14c0 4 16 4 16 0V5M4 12c0 4 16 4 16 0" />
      </>
    ),
    "rate-limiter": (
      <>
        <path d="M12 3 4 6v6c0 4.5 3.2 7.6 8 9 4.8-1.4 8-4.5 8-9V6l-8-3Z" />
        <path d="M9 12h6" />
      </>
    ),
    "load-balancer": (
      <>
        <circle cx="5" cy="12" r="2" />
        <circle cx="19" cy="5" r="2" />
        <circle cx="19" cy="12" r="2" />
        <circle cx="19" cy="19" r="2" />
        <path d="M7 12h10M7 11l10-5M7 13l10 5" />
      </>
    ),
    cache: <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />,
    "read-replica": (
      <>
        <ellipse cx="10" cy="6" rx="7" ry="2.5" />
        <path d="M3 6v9c0 3 14 3 14 0V6" />
        <path d="M20 9v9c0 2-3 3-6 3" />
      </>
    ),
    layers: (
      <>
        <path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5m-18 5 9 5 9-5" />
      </>
    ),
    play: <path d="m8 4 12 8-12 8V4Z" />,
    lock: (
      <>
        <rect x="5" y="10" width="14" height="11" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    reset: <path d="M3 11a9 9 0 1 1 2 7M3 4v7h7" />,
    compare: (
      <>
        <rect x="3" y="4" width="7" height="16" rx="1" />
        <rect x="14" y="4" width="7" height="16" rx="1" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    minus: <path d="M5 12h14" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v5M12 8h.01" />
      </>
    ),
    book: <path d="M12 5C8 2 3 3 3 3v16s5-1 9 2c4-3 9-2 9-2V3s-5-1-9 2v16" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
