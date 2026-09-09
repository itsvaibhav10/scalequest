import { useState, useMemo, useCallback } from "react";
import {
  ReactFlow,
  Background,
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
import { SystemNode, type SystemFlowNode } from "./SystemNode";
const nodeTypes = { system: SystemNode };
export function ArchitectureCanvas() {
  const { state, dispatch } = useGame();
  const [notice, setNotice] = useState("");
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);
  const learn = useCallback(
    (kind: SystemFlowNode["data"]["kind"]) =>
      dispatch({ type: "show-learning", kind }),
    [dispatch],
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
          onLearn: learn,
        },
      })),
    [state.architecture.nodes, state.lastResult, learn],
  );
  const edges = state.architecture.edges.map((e) => ({
    ...e,
    selected: selectedEdges.includes(e.id),
    animated: !!state.lastResult?.valid,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#7c9cff" },
    style: {
      stroke: "#7c9cff",
      strokeWidth: selectedEdges.includes(e.id) ? 3 : 1.7,
    },
  }));
  function connect(c: Connection) {
    const source = state.architecture.nodes.find((n) => n.id === c.source);
    const target = state.architecture.nodes.find((n) => n.id === c.target);
    if (
      !source ||
      !target ||
      !componentDefinitions[source.kind].connectsTo.includes(target.kind)
    ) {
      setNotice("This connection is not supported. Use Client → API → Data.");
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
          nodes={nodes.map((n) => ({
            ...n,
            selected: selectedNodes.includes(n.id),
          }))}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={changeNodes}
          onEdgesChange={changeEdges}
          onConnect={connect}
          fitView
          fitViewOptions={{ padding: 0.24, maxZoom: 1 }}
          minZoom={0.4}
          maxZoom={1.5}
          deleteKeyCode={["Backspace", "Delete"]}
          colorMode="dark"
        >
          <Background color="#273146" gap={22} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        <div className="canvas-hint">
          Drag from an output dot to connect · select an edge, then Delete
        </div>
      </div>
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
              {state.architecture.edges
                .filter((e) => e.source === n.id)
                .map(
                  (e) =>
                    state.architecture.nodes.find((x) => x.id === e.target)
                      ?.label,
                )
                .join(", ") || "No outgoing connection"}
            </span>
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
