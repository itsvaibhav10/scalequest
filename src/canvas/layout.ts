import type { ComponentInstance, ComponentKind } from "../domain/systemDesign";

const layer: Record<ComponentKind, number> = {
  client: 0,
  "rate-limiter": 1,
  "load-balancer": 2,
  "api-server": 3,
  cache: 4,
  "local-data": 5,
  "relational-database": 5,
  "read-replica": 5,
};

/** Arranges nodes in columns by request layer, packing out any empty layer. */
export function layoutNodes(nodes: ComponentInstance[]): ComponentInstance[] {
  const ranks = [...new Set(nodes.map((node) => layer[node.kind]))].sort(
    (a, b) => a - b,
  );
  const hasReplica = nodes.some((node) => node.kind === "read-replica");
  return nodes.map((node) => ({
    ...node,
    x: 40 + ranks.indexOf(layer[node.kind]) * 192,
    y:
      node.kind === "read-replica"
        ? 240
        : hasReplica && layer[node.kind] === 5
          ? 20
          : 120,
  }));
}
