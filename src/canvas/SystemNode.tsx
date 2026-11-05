import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Icon } from "../ui/Icon";
import { IsoBlock } from "./IsoBlock";
import { componentDefinitions } from "../content/components";
import type { ComponentKind } from "../domain/systemDesign";
import { MAX_INSTANCES } from "../simulator/nodeSpec";
export type SystemFlowNode = Node<
  {
    kind: ComponentKind;
    label: string;
    critical: boolean;
    count?: number;
    indexed?: boolean;
    /** Show the index toggle; set by chapters that teach indexing. */
    indexable: boolean;
    /** Load from the last run, as a fraction of capacity. */
    utilization?: number;
    onLearn: (kind: ComponentKind) => void;
    onOptions: (
      id: string,
      patch: { count?: number; indexed?: boolean },
    ) => void;
  },
  "system"
>;
const subtitle: Record<ComponentKind, string> = {
  client: "Web or mobile",
  "rate-limiter": "Rejects abusive traffic",
  "load-balancer": "Spreads requests",
  "api-server": "Product lookups",
  cache: "Answers hot reads",
  "local-data": "Process memory",
  "relational-database": "Durable storage",
  "read-replica": "Read-only copies",
};
export function loadState(utilization: number | undefined) {
  if (utilization === undefined) return null;
  if (!Number.isFinite(utilization) || utilization > 1) return "over";
  return utilization > 0.7 ? "busy" : "ok";
}
const stateWord = { ok: "healthy", busy: "busy", over: "overloaded" } as const;
export function SystemNode({ id, data, selected }: NodeProps<SystemFlowNode>) {
  const def = componentDefinitions[data.kind];
  const count = data.count ?? 1;
  const scalable = !!def.scalable;
  const indexable = data.kind === "relational-database" && data.indexable;
  const indexed = data.indexed !== false;
  const state = loadState(data.utilization);
  return (
    <div
      className={`toy-node ${selected ? "selected" : ""} ${state ? `is-${state}` : ""} ${data.critical && !state ? "is-over" : ""}`}
    >
      {def.acceptsFrom.length > 0 && (
        <Handle type="target" position={Position.Left} style={{ top: 66 }} />
      )}
      <div className="toy-art">
        <IsoBlock kind={data.kind} count={count} />
        {state && (
          <span className={`toy-load toy-load--${state}`}>
            {Number.isFinite(data.utilization)
              ? `${Math.round((data.utilization ?? 0) * 100)}%`
              : "0 capacity"}{" "}
            {stateWord[state]}
          </span>
        )}
      </div>
      <strong className="toy-name">
        {data.label}
        {scalable && count > 1 && <span className="toy-count">×{count}</span>}
      </strong>
      <span className="toy-sub">{subtitle[data.kind]}</span>
      {scalable && (
        <div
          className="nodrag toy-stepper"
          role="group"
          aria-label={`${data.label} instances`}
        >
          <button
            aria-label={`Fewer ${data.label} instances`}
            disabled={count <= 1}
            onClick={() => data.onOptions(id, { count: count - 1 })}
          >
            <Icon name="minus" size={14} />
          </button>
          <output aria-live="polite">{count} instances</output>
          <button
            aria-label={`More ${data.label} instances`}
            disabled={count >= MAX_INSTANCES}
            onClick={() => data.onOptions(id, { count: count + 1 })}
          >
            <Icon name="plus" size={14} />
          </button>
        </div>
      )}
      {indexable && (
        <button
          className={`nodrag toy-toggle ${indexed ? "on" : ""}`}
          aria-pressed={indexed}
          aria-label="Index on product id"
          onClick={() => data.onOptions(id, { indexed: !indexed })}
        >
          <span className="toy-toggle-knob" aria-hidden="true" />
          Index
          <b>{indexed ? "on" : "off"}</b>
        </button>
      )}
      <div className="toy-foot">
        <span>
          {data.kind === "client"
            ? "Starts every request"
            : `$${def.monthlyCostUsd * (scalable ? count : 1)}/mo`}
        </span>
        <button
          className="nodrag toy-learn"
          aria-label={`Learn about ${def.label}`}
          onClick={() => data.onLearn(data.kind)}
        >
          <Icon name="info" size={14} /> Why
        </button>
      </div>
      {def.connectsTo.length > 0 && (
        <Handle type="source" position={Position.Right} style={{ top: 66 }} />
      )}
    </div>
  );
}
