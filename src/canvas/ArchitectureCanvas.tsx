import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Controls,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import { useGame } from "../game/GameProvider";
import { componentDefinitions } from "../content/components";
import { SystemNode, loadState, type SystemFlowNode } from "./SystemNode";
import { PacketEdge, type PacketEdgeData } from "./PacketEdge";
import { MAX_INSTANCES } from "../simulator/nodeSpec";
const nodeTypes = { system: SystemNode };
const edgeTypes = { packet: PacketEdge };
export function ArchitectureCanvas() {
  const { state, stage, dispatch } = useGame();
  const [notice, setNotice] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const learn = useCallback(
    (kind: SystemFlowNode["data"]["kind"]) =>
      dispatch({ type: "show-learning", kind }),
    [dispatch],
  );
  const setOptions = useCallback(
    (id: string, patch: { count?: number; indexed?: boolean }) =>
      dispatch({
        type: "set-architecture",
        architecture: {
          ...state.architecture,
          nodes: state.architecture.nodes.map((n) =>
            n.id === id ? { ...n, ...patch } : n,
          ),
        },
      }),
    [dispatch, state.architecture],
  );
  const nodes = useMemo(
    () =>
      state.architecture.nodes.map((n) => ({
        id: n.id,
        type: "system" as const,
        position: { x: n.x, y: n.y },
        data: {
          kind: n.kind,
          label: n.label,
          critical:
            !!state.lastResult?.issues.some((i) => i.nodeIds.includes(n.id)) ||
            !!state.lastResult?.bottlenecks.some((b) => b.componentId === n.id),
          count: n.count,
          indexed: n.indexed,
          indexable: stage.indexing,
          utilization: state.lastResult?.nodeLoads.find(
            (load) => load.componentId === n.id,
          )?.utilization,
          onLearn: learn,
          onOptions: setOptions,
        },
      })),
    [
      state.architecture.nodes,
      state.lastResult,
      learn,
      setOptions,
      stage.indexing,
    ],
  );
  const edges = state.architecture.edges.map((e) => {
    const load = state.lastResult?.nodeLoads.find(
      (l) => l.componentId === e.target,
    );
    const data: PacketEdgeData = {
      flowing: !!state.lastResult?.valid,
      status: loadState(load?.utilization) ?? "ok",
    };
    return {
      ...e,
      type: "packet" as const,
      selected: selectedEdges.includes(e.id),
      markerEnd: { type: MarkerType.ArrowClosed, color: "#2b2140" },
      data,
    };
  });
  function connect(c: Connection) {
    const source = state.architecture.nodes.find((n) => n.id === c.source);
    const target = state.architecture.nodes.find((n) => n.id === c.target);
    if (
      !source ||
      !target ||
      !componentDefinitions[source.kind].connectsTo.includes(target.kind) ||
      !componentDefinitions[target.kind].acceptsFrom.includes(source.kind)
    ) {
      setNotice(
        "This connection is not supported. Requests flow client → rate limiter → load balancer → API → cache → data.",
      );
      return;
    }
    if (
      state.architecture.edges.some(
        (e) => e.source === c.source && e.target === c.target,
      )
    )
      return;
    dispatch({
      type: "set-architecture",
      architecture: {
        ...state.architecture,
        edges: [
          ...state.architecture.edges,
          { id: crypto.randomUUID(), source: c.source, target: c.target },
        ],
      },
    });
    setNotice("");
  }
  function changeNodes(changes: NodeChange<SystemFlowNode>[]) {
    const selections = changes.filter((c) => c.type === "select");
    if (selections.length)
      setSelectedNodes((old) => {
        const next = new Set(old);
        for (const c of selections) {
          if (c.selected) next.add(c.id);
          else next.delete(c.id);
        }
        return [...next];
      });
    const meaningful = changes.filter(
      (c) => c.type === "position" || c.type === "remove",
    );
    if (!meaningful.length) return;
    const next = applyNodeChanges(meaningful, nodes);
    const ids = next.map((n) => n.id);
    dispatch({
      type: "set-architecture",
      positionsOnly: meaningful.every((c) => c.type === "position"),
      architecture: {
        nodes: next.map((n) => ({
          id: n.id,
          kind: n.data.kind,
          label: n.data.label,
          x: n.position.x,
          y: n.position.y,
          ...(n.data.count !== undefined ? { count: n.data.count } : {}),
          ...(n.data.indexed !== undefined ? { indexed: n.data.indexed } : {}),
        })),
        edges: state.architecture.edges.filter(
          (e) => ids.includes(e.source) && ids.includes(e.target),
        ),
      },
    });
  }
  function changeEdges(changes: EdgeChange[]) {
    const selections = changes.filter((c) => c.type === "select");
    if (selections.length)
      setSelectedEdges((old) => {
        const next = new Set(old);
        for (const c of selections) {
          if (c.selected) next.add(c.id);
          else next.delete(c.id);
        }
        return [...next];
      });
    const removals = changes.filter((c) => c.type === "remove");
    if (removals.length)
      dispatch({
        type: "set-architecture",
        architecture: {
          ...state.architecture,
          edges: applyEdgeChanges(removals, edges),
        },
      });
  }
  return (
    <>
      <div className="canvas-frame">
        <ReactFlow
          key={state.architecture.nodes.length}
          nodes={nodes.map((n) => ({
            ...n,
            selected: selectedNodes.includes(n.id),
          }))}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={changeNodes}
          onEdgesChange={changeEdges}
          onConnect={connect}
          fitView
          fitViewOptions={{ padding: 0.1, maxZoom: 1 }}
          minZoom={0.4}
          maxZoom={1.5}
          deleteKeyCode={["Backspace", "Delete"]}
        >
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <p className="canvas-hint">
        Drag from a block’s right dot to the next block’s left dot to connect.
        Select a road and press Delete to remove it.
      </p>
      {notice && (
        <p className="inline-notice" role="status">
          {notice}
        </p>
      )}
      <details className="architecture-list">
        <summary>Architecture as list · keyboard connection editor</summary>
        {state.architecture.nodes.map((n) => (
          <div key={n.id}>
            <strong>{n.label}</strong>
            <button
              aria-label={`Remove ${n.label}`}
              onClick={() =>
                dispatch({
                  type: "set-architecture",
                  architecture: {
                    nodes: state.architecture.nodes.filter(
                      (x) => x.id !== n.id,
                    ),
                    edges: state.architecture.edges.filter(
                      (e) => e.source !== n.id && e.target !== n.id,
                    ),
                  },
                })
              }
            >
              Remove
            </button>
            <span>
              {state.architecture.edges.filter((e) => e.source === n.id)
                .length === 0 && "No outgoing connection"}
              {state.architecture.edges
                .filter((e) => e.source === n.id)
                .map((e) => {
                  const target = state.architecture.nodes.find(
                    (x) => x.id === e.target,
                  );
                  return (
                    <button
                      key={e.id}
                      aria-label={`Disconnect ${n.label} from ${target?.label}`}
                      onClick={() =>
                        dispatch({
                          type: "set-architecture",
                          architecture: {
                            ...state.architecture,
                            edges: state.architecture.edges.filter(
                              (x) => x.id !== e.id,
                            ),
                          },
                        })
                      }
                    >
                      → {target?.label} ✕
                    </button>
                  );
                })}
            </span>
            {componentDefinitions[n.kind].scalable && (
              <label>
                Instances
                <input
                  type="number"
                  min="1"
                  max={MAX_INSTANCES}
                  aria-label={`Instances of ${n.label}`}
                  value={n.count ?? 1}
                  onChange={(e) =>
                    setOptions(n.id, {
                      count: Math.min(
                        MAX_INSTANCES,
                        Math.max(1, Math.round(Number(e.target.value)) || 1),
                      ),
                    })
                  }
                />
              </label>
            )}
            {n.kind === "relational-database" && stage.indexing && (
              <label>
                <input
                  type="checkbox"
                  checked={n.indexed !== false}
                  onChange={(e) =>
                    setOptions(n.id, { indexed: e.target.checked })
                  }
                />
                Index on product id
              </label>
            )}
            {componentDefinitions[n.kind].connectsTo.length > 0 && (
              <select
                aria-label={`Connect ${n.label} to`}
                value=""
                onChange={(e) =>
                  connect({
                    source: n.id,
                    target: e.target.value,
                    sourceHandle: null,
                    targetHandle: null,
                  })
                }
              >
                <option value="">Connect to…</option>
                {state.architecture.nodes
                  .filter((x) =>
                    componentDefinitions[n.kind].connectsTo.includes(x.kind),
                  )
                  .map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.label}
                    </option>
                  ))}
              </select>
            )}
          </div>
        ))}
      </details>
    </>
  );
}
