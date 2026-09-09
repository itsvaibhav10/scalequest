import { useGame } from "../game/GameProvider";
import { componentDefinitions } from "../content/components";
import type { ComponentKind } from "../domain/systemDesign";
import { Icon } from "../ui/Icon";
export function ComponentPalette() {
  const { state, stage, dispatch } = useGame();
  function add(kind: ComponentKind) {
    const count = state.architecture.nodes.length;
    dispatch({
      type: "set-architecture",
      architecture: {
        ...state.architecture,
        nodes: [
          ...state.architecture.nodes,
          {
            id: crypto.randomUUID(),
            kind,
            label: componentDefinitions[kind].label,
            x: count * 245,
            y: 120,
          },
        ],
      },
    });
  }
  return (
    <aside className="palette">
      <h2>Components</h2>
      <p className="muted small">Add a piece. Understand its purpose.</p>
      <div className="palette-items">
        {Object.values(componentDefinitions).map((c) => {
          const locked = !stage.availableComponents.includes(c.kind);
          const exists = state.architecture.nodes.some(
            (n) => n.kind === c.kind,
          );
          return (
            <div
              className={`palette-item ${locked ? "locked" : ""}`}
              key={c.kind}
            >
              <button
                className="palette-add"
                disabled={locked || exists}
                onClick={() => add(c.kind)}
                aria-label={`Add ${c.label}`}
              >
                <Icon name={c.kind} />
                <span>
                  <strong>{c.label}</strong>
                  <small>
                    {locked
                      ? "Unlocks at 100 users"
                      : exists
                        ? "On your canvas"
                        : `$${c.monthlyCostUsd}/mo · add to canvas`}
                  </small>
                </span>
                {locked ? (
                  <Icon name="lock" size={14} />
                ) : (
                  <span className="plus">{exists ? "✓" : "+"}</span>
                )}
              </button>
              <button
                className="palette-info"
                onClick={() =>
                  dispatch({ type: "show-learning", kind: c.kind })
                }
                aria-label={`Explain ${c.label}`}
              >
                Why this component?
              </button>
            </div>
          );
        })}
      </div>
      <div className="upcoming">
        <h3>Later in the campaign</h3>
        {[
          "Index & connection pool",
          "Load balancer",
          "Cache & read replicas",
          "Rate limiting",
        ].map((c) => (
          <div key={c}>
            <Icon name="lock" size={13} />
            {c}
          </div>
        ))}
        <p>
          These concepts arrive with new constraints. First, master the
          fundamentals.
        </p>
      </div>
      <div className="palette-note">
        <Icon name="book" />
        <p>
          More components ≠ a better design.
          <br />
          Solve the constraint you have.
        </p>
      </div>
    </aside>
  );
}
