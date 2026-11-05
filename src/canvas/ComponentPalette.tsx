import { useGame } from "../game/GameProvider";
import { componentDefinitions } from "../content/components";
import type { ComponentKind } from "../domain/systemDesign";
import { readApiStages } from "../content/readApiCampaign";
import { Icon } from "../ui/Icon";
import { layoutNodes } from "./layout";
import { IsoBlock } from "./IsoBlock";

const unlockUsers = (kind: ComponentKind) =>
  readApiStages.find((s) => s.availableComponents.includes(kind))?.userCount;
export function ComponentPalette() {
  const { state, stage, dispatch } = useGame();
  function add(kind: ComponentKind) {
    dispatch({
      type: "set-architecture",
      architecture: {
        ...state.architecture,
        nodes: layoutNodes([
          ...state.architecture.nodes,
          {
            id: crypto.randomUUID(),
            kind,
            label: componentDefinitions[kind].label,
            x: 0,
            y: 0,
            ...(kind === "relational-database" && stage.indexing
              ? { indexed: false }
              : {}),
          },
        ]),
      },
    });
  }
  return (
    <aside className="palette">
      <h2>Toy box</h2>
      <p className="muted small">Add a block, then ask why it exists.</p>
      <div className="palette-items">
        {Object.values(componentDefinitions)
          .sort(
            (a, b) =>
              Number(!stage.availableComponents.includes(a.kind)) -
              Number(!stage.availableComponents.includes(b.kind)),
          )
          .map((c) => {
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
                  <span className="palette-art">
                    <IsoBlock kind={c.kind} size={58} />
                  </span>
                  <span className="palette-text">
                    <strong>{c.label}</strong>
                    <small>
                      {locked
                        ? `Unlocks at ${unlockUsers(c.kind)?.toLocaleString("en-US")} users`
                        : exists
                          ? "Added"
                          : `$${c.monthlyCostUsd}/mo`}
                    </small>
                  </span>
                  <span className="plus">
                    <Icon
                      name={locked ? "lock" : exists ? "check" : "plus"}
                      size={14}
                    />
                  </span>
                </button>
                <button
                  className="palette-info"
                  onClick={() =>
                    dispatch({ type: "show-learning", kind: c.kind })
                  }
                  aria-label={`Explain ${c.label}`}
                >
                  <Icon name="info" size={17} />
                </button>
              </div>
            );
          })}
      </div>
      <div className="palette-note">
        <p>
          More blocks do not make a better design. Add one only for a constraint
          you can point to.
        </p>
      </div>
    </aside>
  );
}
