import { componentDefinitions } from "../content/components";
import type {
  ComponentInstance,
  SimulationIncident,
} from "../domain/systemDesign";

export const MAX_INSTANCES = 40;

export function instanceCount(node: ComponentInstance): number {
  const def = componentDefinitions[node.kind];
  if (!def?.scalable) return 1;
  return node.count === undefined ? 1 : node.count;
}

/** Capacity and latency of a node as configured, before any incident. */
export function nodeSpec(node: ComponentInstance) {
  const def = componentDefinitions[node.kind];
  const base =
    def.unindexed && node.indexed === false
      ? def.unindexed
      : { capacityRps: def.capacityRps, baseLatencyMs: def.baseLatencyMs };
  return {
    capacityRps: base.capacityRps * instanceCount(node),
    baseLatencyMs: base.baseLatencyMs,
  };
}

/** One API instance is lost during a node-failure incident. */
export function capacityDuring(
  node: ComponentInstance,
  incident: SimulationIncident,
): number {
  const spec = nodeSpec(node);
  if (incident === "node-failure" && node.kind === "api-server")
    return (
      Math.max(0, instanceCount(node) - 1) *
      (spec.capacityRps / instanceCount(node))
    );
  return spec.capacityRps;
}
