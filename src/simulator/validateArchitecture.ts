import { componentDefinitions } from "../content/components";
import type {
  Architecture,
  ComponentKind,
  ValidationIssue,
} from "../domain/systemDesign";

const knownKinds = new Set<ComponentKind>([
  "client",
  "api-server",
  "local-data",
  "relational-database",
]);
const dataKinds = new Set<ComponentKind>(["local-data", "relational-database"]);

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
  const clients = knownNodes.filter((node) => node.kind === "client");
  const apis = knownNodes.filter((node) => node.kind === "api-server");
  const dataNodes = knownNodes.filter((node) => dataKinds.has(node.kind));
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
  if (!dataNodes.length)
    issues.push({
      code: "missing-data",
      message: "Add a supported data component.",
      nodeIds: [],
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
      message: "Cycles are not supported in this guided slice.",
      nodeIds: knownNodes.map((node) => node.id),
    });
  }

  const paths = clients.flatMap((client) =>
    findDataPaths(client.id, nodes, validEdges),
  );
  if (!paths.length) {
    issues.push({
      code: "disconnected-path",
      message: "Connect one complete client → API server → data path.",
      nodeIds: knownNodes.map((node) => node.id),
    });
  } else if (paths.length !== 1) {
    issues.push({
      code: "ambiguous-path",
      message:
        "This slice supports exactly one request path; remove branching or parallel paths.",
      nodeIds: [...new Set(paths.flat())],
    });
  }

  if (paths.length === 1) {
    const pathIds = new Set(paths[0]);
    const extras = knownNodes
      .filter((node) => !pathIds.has(node.id))
      .map((node) => node.id);
    const pathEdgeKeys = new Set(
      paths[0].slice(0, -1).map((id, index) => `${id}->${paths[0][index + 1]}`),
    );
    const extraEdges = validEdges.filter(
      (edge) => !pathEdgeKeys.has(`${edge.source}->${edge.target}`),
    );
    if (extras.length || extraEdges.length)
      issues.push({
        code: "disconnected-component",
        message:
          "Remove components or connections outside the single simulated request path.",
        nodeIds: [
          ...new Set([
            ...extras,
            ...extraEdges.flatMap((edge) => [edge.source, edge.target]),
          ]),
        ],
      });
  }
  return issues;
}

function count(values: string[]): Map<string, number> {
  const result = new Map<string, number>();
  values.forEach((value) => result.set(value, (result.get(value) ?? 0) + 1));
  return result;
}

function findDataPaths(
  start: string,
  nodes: Map<string, Architecture["nodes"][number]>,
  edges: Architecture["edges"],
): string[][] {
  const paths: string[][] = [];
  const visit = (id: string, path: string[]) => {
    const node = nodes.get(id);
    if (!node || path.includes(id)) return;
    const nextPath = [...path, id];
    if (dataKinds.has(node.kind)) {
      paths.push(nextPath);
      return;
    }
    edges
      .filter((edge) => edge.source === id)
      .forEach((edge) => visit(edge.target, nextPath));
  };
  visit(start, []);
  return paths;
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
