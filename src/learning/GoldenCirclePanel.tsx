import { useState } from "react";
import { useGame } from "../game/GameProvider";
import { componentDefinitions } from "../content/components";
export function GoldenCirclePanel() {
  const { state } = useGame();
  const [tab, setTab] = useState<"why" | "how" | "what">("why");
  const kind =
    state.selectedLearningKind ??
    (state.stageIndex === 2 ? "relational-database" : "local-data");
  const component = componentDefinitions[kind];
  const learning = component.learning;
  return (
    <section className="learning-panel">
      <div className="section-label">UNDER THE HOOD</div>
      <h3>{component.label}</h3>
      <div className="tabs" role="tablist" aria-label="Golden Circle">
        {(["why", "how", "what"] as const).map((t) => (
          <button
            role="tab"
            aria-selected={tab === t}
            key={t}
            onClick={() => setTab(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="learning-content" role="tabpanel">
        <h4>
          {tab === "why"
            ? "Why use it?"
            : tab === "how"
              ? "How does it work?"
              : "What changes in the system?"}
        </h4>
        <p className={tab === "what" ? "technical-copy" : ""}>
          {learning[tab]}
        </p>
      </div>
      <details>
        <summary>Trade-offs to remember</summary>
        <ul>
          {learning.tradeoffs.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </details>
      <details>
        <summary>When not to use it</summary>
        <p>{learning.whenNotToUse}</p>
      </details>
    </section>
  );
}
