import { componentDefinitions } from "../content/components";
import type {
  Architecture,
  ComponentKind,
  ValidationIssue,
} from "../domain/systemDesign";
import { MAX_INSTANCES, instanceCount } from "./nodeSpec";

const knownKinds = new Set<ComponentKind>(
  Object.keys(componentDefinitions) as ComponentKind[],
);
const dataKinds = new Set<ComponentKind>([
  "local-data",
  "relational-database",
  "read-replica",
]);

export function validateArchitecture(
  architecture: Architecture,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nodeIdCounts = count(architecture.nodes.map((node) => node.id));
  const edgeIdCounts = count(architecture.edges.map((edge) => edge.id));
  const duplicateIds = [
    ...[...nodeIdCounts].filter(([, amount]) => amount > 1).map(([id]) => id),
    ...[...edgeIdCounts].filter(([, amount]) => amount > 1).map(([id]) => id),
  ];
  if (duplicateIds.length)
    issues.push({
      code: "duplicate-id",
      message: "Node and connection IDs must be unique.",
      nodeIds: duplicateIds,
    });

  const unknownNodes = architecture.nodes
    .filter((node) => !knownKinds.has(node.kind))
    .map((node) => node.id);
  if (unknownNodes.length)
    issues.push({
      code: "unknown-kind",
      message: "The architecture contains unsupported component kinds.",
      nodeIds: unknownNodes,
    });

  const nodes = new Map(
    architecture.nodes
      .filter((node) => nodeIdCounts.get(node.id) === 1)
      .map((node) => [node.id, node]),
  );
  const knownNodes = [...nodes.values()].filter((node) =>
    knownKinds.has(node.kind),
  );
  const ofKind = (kind: ComponentKind) =>
    knownNodes.filter((node) => node.kind === kind);
  const clients = ofKind("client");
  const apis = ofKind("api-server");
  if (!clients.length)
    issues.push({
      code: "missing-client",
      message: "Add a client to start the request path.",
      nodeIds: [],
    });
  if (!apis.length)
    issues.push({
      code: "missing-api",
      message: "Add an API server to handle the request.",
      nodeIds: [],
    });
  if (!knownNodes.some((node) => dataKinds.has(node.kind)))
    issues.push({
      code: "missing-data",
      message: "Add a supported data component.",
      nodeIds: [],
    });

  const badCounts = knownNodes.filter((node) => {
    if (!componentDefinitions[node.kind].scalable) return false;
    const amount = instanceCount(node);
    return !Number.isInteger(amount) || amount < 1 || amount > MAX_INSTANCES;
  });
  if (badCounts.length)
    issues.push({
      code: "invalid-count",
      message: `Use a whole number of instances between 1 and ${MAX_INSTANCES}.`,
      nodeIds: badCounts.map((node) => node.id),
    });

  const validEdges = architecture.edges.filter((edge) => {
    const source = nodes.get(edge.source);
    const target = nodes.get(edge.target);
    if (
      !source ||
      !target ||
      !knownKinds.has(source.kind) ||
      !knownKinds.has(target.kind)
    )
      return false;
    return (
      componentDefinitions[source.kind].connectsTo.includes(target.kind) &&
      componentDefinitions[target.kind].acceptsFrom.includes(source.kind)
    );
  });
  const invalidEdges = architecture.edges.filter(
    (edge) => !validEdges.includes(edge),
  );
  if (invalidEdges.length)
    issues.push({
      code: "invalid-connection",
      message:
        "Every connection must join compatible, existing components in the allowed direction.",
      nodeIds: [
        ...new Set(invalidEdges.flatMap((edge) => [edge.source, edge.target])),
      ],
    });

  if (
    hasCycle(
      knownNodes.map((node) => node.id),
      validEdges,
    )
  ) {
    issues.push({
      code: "unsupported-cycle",
      message: "Requests must flow one way; remove the cycle.",
      nodeIds: knownNodes.map((node) => node.id),
    });
  }

  const fromClients = reach(
    clients.map((node) => node.id),
    validEdges,
    "forward",
  );
  const dataIds = knownNodes
    .filter((node) => dataKinds.has(node.kind))
    .map((node) => node.id);
  const toData = reach(dataIds, validEdges, "backward");
  if (!dataIds.some((id) => fromClients.has(id)))
    issues.push({
      code: "disconnected-path",
      message: "Connect a complete client → API server → data path.",
      nodeIds: knownNodes.map((node) => node.id),
    });
  else {
    const stray = knownNodes
      .filter((node) => !fromClients.has(node.id) || !toData.has(node.id))
      .map((node) => node.id);
    if (stray.length)
      issues.push({
        code: "disconnected-component",
        message:
          "Every component must sit on a route that starts at the client and ends at data. Connect or remove the others.",
        nodeIds: stray,
      });
  }

  const apiCount = apis.reduce((sum, node) => sum + instanceCount(node), 0);
  if (
    apiCount > 1 &&
    !validEdges.some(
      (edge) =>
        nodes.get(edge.source)?.kind === "load-balancer" &&
        nodes.get(edge.target)?.kind === "api-server",
    )
  )
    issues.push({
      code: "missing-load-balancer",
      message:
        "Several API servers need a load balancer in front, otherwise clients cannot choose between them.",
      nodeIds: apis.map((node) => node.id),
    });
  if (ofKind("read-replica").length && !ofKind("relational-database").length)
    issues.push({
      code: "replica-without-primary",
      message:
        "A read replica copies a primary database. Add the database first.",
      nodeIds: ofKind("read-replica").map((node) => node.id),
    });
  if (ofKind("local-data").length && apiCount > 1)
    issues.push({
      code: "stateful-api-scaled",
      message:
        "Each API server would hold its own private copy of local data. Use a shared database before adding servers.",
      nodeIds: [...ofKind("local-data"), ...apis].map((node) => node.id),
    });
  return issues;
}

function count(values: string[]): Map<string, number> {
  const result = new Map<string, number>();
  values.forEach((value) => result.set(value, (result.get(value) ?? 0) + 1));
  return result;
}

function reach(
  starts: string[],
  edges: Architecture["edges"],
  direction: "forward" | "backward",
): Set<string> {
  const seen = new Set<string>(starts);
  const queue = [...starts];
  while (queue.length) {
    const id = queue.pop() as string;
    for (const edge of edges) {
      const [from, to] =
        direction === "forward"
          ? [edge.source, edge.target]
          : [edge.target, edge.source];
      if (from === id && !seen.has(to)) {
        seen.add(to);
        queue.push(to);
      }
    }
  }
  return seen;
}

function hasCycle(nodeIds: string[], edges: Architecture["edges"]): boolean {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if (
      edges
        .filter((edge) => edge.source === id)
        .some((edge) => visit(edge.target))
    )
      return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  return nodeIds.some(visit);
}
