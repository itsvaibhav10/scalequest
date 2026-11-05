import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";

export interface PacketEdgeData extends Record<string, unknown> {
  /** Requests are flowing: set once a valid simulation has run. */
  flowing: boolean;
  status: "ok" | "busy" | "over";
}

const reduceMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** A dotted road; packets ride it while a simulation result is on screen. */
export function PacketEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
  markerEnd,
}: EdgeProps) {
  const [path] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const info = data as PacketEdgeData | undefined;
  const status = info?.status ?? "ok";
  const packets = status === "over" ? 2 : 3;
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        className={`toy-edge toy-edge--${status} ${selected ? "selected" : ""}`}
      />
      {info?.flowing &&
        !reduceMotion &&
        Array.from({ length: packets }, (_, i) => (
          <circle
            key={i}
            r={5}
            visibility="hidden"
            className={`toy-packet toy-packet--${status}`}
          >
            <set
              attributeName="visibility"
              to="visible"
              begin={`${i * 0.63}s`}
            />
            <animateMotion
              dur={status === "over" ? "3.2s" : "1.9s"}
              begin={`${i * 0.63}s`}
              repeatCount="indefinite"
              path={path}
            />
          </circle>
        ))}
    </>
  );
}
