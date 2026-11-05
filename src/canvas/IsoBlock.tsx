import type { ComponentKind } from "../domain/systemDesign";

const INK = "#2b2140";

/** top, left face, right face */
const palette: Record<ComponentKind, [string, string, string]> = {
  client: ["#e6e9f7", "#c0c7e6", "#9ca6d3"],
  "rate-limiter": ["#d3c1ff", "#ab8ff6", "#8a69e2"],
  "load-balancer": ["#a3bcff", "#7497fb", "#4c72e2"],
  "api-server": ["#ffb9a4", "#ff8767", "#e8603f"],
  cache: ["#ffe58f", "#ffcc47", "#e9ae1f"],
  "local-data": ["#ffc6e0", "#ff96c4", "#e96aa1"],
  "relational-database": ["#a9ecd4", "#62d4b0", "#36b18d"],
  "read-replica": ["#add9f2", "#6fc1e6", "#44a1cc"],
};

/** How many stacked copies hint at the instance count. */
function copiesFor(count: number) {
  return count >= 4 ? 3 : count >= 2 ? 2 : 1;
}

const line = {
  stroke: INK,
  strokeWidth: 1.6,
  strokeLinejoin: "round" as const,
};

/** An isometric box. (cx, y) is the top vertex; w is the half-width of the top face. */
function Box({
  cx,
  y,
  w,
  h,
  kind,
  children,
}: {
  cx: number;
  y: number;
  w: number;
  h: number;
  kind: ComponentKind;
  children?: React.ReactNode;
}) {
  const [top, left, right] = palette[kind];
  const t = w / 2;
  const pts = (list: number[][]) => list.map((p) => p.join(",")).join(" ");
  return (
    <g>
      <polygon
        points={pts([
          [cx - w, y + t],
          [cx, y + w],
          [cx, y + w + h],
          [cx - w, y + t + h],
        ])}
        fill={left}
        {...line}
      />
      <polygon
        points={pts([
          [cx + w, y + t],
          [cx, y + w],
          [cx, y + w + h],
          [cx + w, y + t + h],
        ])}
        fill={right}
        {...line}
      />
      <polygon
        points={pts([
          [cx, y],
          [cx + w, y + t],
          [cx, y + w],
          [cx - w, y + t],
        ])}
        fill={top}
        {...line}
      />
      {children}
    </g>
  );
}

function Drum({
  cx,
  y,
  rx,
  h,
  kind,
  rings = 0,
}: {
  cx: number;
  y: number;
  rx: number;
  h: number;
  kind: ComponentKind;
  rings?: number;
}) {
  const [top, left] = palette[kind];
  const ry = rx / 2.2;
  const cy = y + ry;
  return (
    <g>
      <path
        d={`M${cx - rx},${cy} v${h} a${rx},${ry} 0 0 0 ${rx * 2},0 v${-h} z`}
        fill={left}
        {...line}
      />
      {Array.from({ length: rings }, (_, i) => {
        const ringY = cy + ((i + 1) * h) / (rings + 1);
        return (
          <path
            key={i}
            d={`M${cx - rx},${ringY} a${rx},${ry} 0 0 0 ${rx * 2},0`}
            fill="none"
            stroke={INK}
            strokeWidth={1.4}
            opacity={0.55}
          />
        );
      })}
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={top} {...line} />
    </g>
  );
}

function Figure({ kind, copy }: { kind: ComponentKind; copy: number }) {
  const dx = copy * 14;
  const dy = copy * -9;
  const move = `translate(${dx} ${dy})`;
  switch (kind) {
    case "client":
      return (
        <g>
          <Box cx={75} y={34} w={34} h={38} kind={kind} />
          <polygon
            points="47,60 69,71 69,93 47,82"
            fill="#f7f8ff"
            stroke={INK}
            strokeWidth={1.3}
          />
          <path
            d="M52 69l12 6M52 75l8 4"
            stroke="#8a93c6"
            strokeWidth={1.6}
            strokeLinecap="round"
          />
        </g>
      );
    case "rate-limiter":
      return (
        <g>
          <Box cx={75} y={34} w={34} h={38} kind={kind} />
          {[0, 1, 2].map((i) => (
            <polygon
              key={i}
              points={`${47},${58 + i * 10} ${69},${69 + i * 10} ${69},${73 + i * 10} ${47},${62 + i * 10}`}
              fill="#4b2fa6"
            />
          ))}
        </g>
      );
    case "load-balancer":
      return (
        <g>
          <Box cx={75} y={40} w={36} h={30} kind={kind}>
            <g stroke="#fff" strokeWidth={3} strokeLinecap="round" fill="none">
              <path d="M75 57v6M75 63l-15-7M75 63l15-7" />
            </g>
            <g fill="#fff">
              <circle cx={60} cy={56} r={2.6} />
              <circle cx={90} cy={56} r={2.6} />
              <circle cx={75} cy={55} r={2.6} />
            </g>
          </Box>
        </g>
      );
    case "api-server":
      return (
        <g transform={move}>
          <Box cx={60} y={48} w={34} h={16} kind={kind} />
          <Box cx={60} y={28} w={34} h={16} kind={kind} />
          <g fill="#fff">
            <circle cx={44} cy={55} r={2.2} />
            <circle cx={52} cy={59} r={2.2} />
            <circle cx={44} cy={75} r={2.2} />
            <circle cx={52} cy={79} r={2.2} />
          </g>
        </g>
      );
    case "cache":
      return (
        <g>
          <Box cx={75} y={36} w={34} h={34} kind={kind} />
          <path
            d="M80 47 68 60h7l-4 10 12-14h-7z"
            fill={INK}
            stroke={INK}
            strokeWidth={1}
            strokeLinejoin="round"
          />
        </g>
      );
    case "local-data":
      return (
        <g>
          <Box cx={75} y={50} w={34} h={14} kind={kind} />
          <polygon
            points="75,60 86,66 75,72 64,66"
            fill="#fff"
            stroke={INK}
            strokeWidth={1.3}
          />
        </g>
      );
    case "relational-database":
      return <Drum cx={75} y={20} rx={38} h={56} kind={kind} rings={2} />;
    case "read-replica":
      return (
        <g transform={copy === 0 ? undefined : move}>
          <Drum cx={56} y={42} rx={30} h={36} kind={kind} rings={1} />
        </g>
      );
  }
}

export function IsoBlock({
  kind,
  count = 1,
  size = 150,
}: {
  kind: ComponentKind;
  count?: number;
  size?: number;
}) {
  const stack = ["api-server", "read-replica"].includes(kind)
    ? copiesFor(count)
    : 1;
  const copies = Array.from({ length: stack }, (_, i) => stack - 1 - i);
  const spread = ((stack - 1) * 14) / 2;
  const centre = kind === "api-server" ? 15 : kind === "read-replica" ? 19 : 0;
  const shift = centre ? centre - spread : 0;
  return (
    <svg
      viewBox="0 0 150 120"
      width={size}
      height={(size * 120) / 150}
      aria-hidden="true"
      focusable="false"
    >
      <ellipse cx="75" cy="106" rx="52" ry="10" fill={INK} opacity="0.1" />
      <g transform={`translate(${shift} 0)`}>
        {copies.map((copy) => (
          <Figure key={copy} kind={kind} copy={copy} />
        ))}
      </g>
    </svg>
  );
}
