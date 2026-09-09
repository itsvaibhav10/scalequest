import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Icon } from "../ui/Icon";
import { componentDefinitions } from "../content/components";
import type { ComponentKind } from "../domain/systemDesign";
export type SystemFlowNode = Node<
  {
    kind: ComponentKind;
    label: string;
    critical: boolean;
    onLearn: (kind: ComponentKind) => void;
  },
  "system"
>;
export function SystemNode({ data, selected }: NodeProps<SystemFlowNode>) {
  const def = componentDefinitions[data.kind];
  return (
    <div
      className={`system-node ${selected ? "selected" : ""} ${data.critical ? "critical" : ""}`}
    >
      {data.kind !== "client" && (
        <Handle type="target" position={Position.Left} />
      )}
      <div className={`node-symbol symbol-${data.kind}`}>
        <Icon name={data.kind} size={26} />
      </div>
      <strong>{data.label}</strong>
      <span>
        {data.kind === "client"
          ? "Web / mobile"
          : data.kind === "local-data"
            ? "Process memory"
            : data.kind === "api-server"
              ? "Product lookups"
              : "Durable product storage"}
      </span>
      <div className="node-footer">
        <span>
          {data.critical
            ? "! Needs attention"
            : data.kind === "client"
              ? "Request origin"
              : `$${def.monthlyCostUsd}/mo`}
        </span>
        <button
          className="nodrag node-learn"
          aria-label={`Learn about ${def.label}`}
          onClick={() => data.onLearn(data.kind)}
        >
          Learn
        </button>
      </div>
      {(data.kind === "client" || data.kind === "api-server") && (
        <Handle type="source" position={Position.Right} />
      )}
    </div>
  );
}
