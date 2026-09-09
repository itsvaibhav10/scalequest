import { useGame } from "../game/GameProvider";
import { questions, calculateStageScore } from "../scoring/calculateStageScore";
import { GoldenCirclePanel } from "../learning/GoldenCirclePanel";
export function InterviewerPanel() {
  const { state, stage, dispatch } = useGame();
  const q = questions[state.stageIndex === 2 ? 2 : 1];
  const score = calculateStageScore(state);
  const result = state.lastResult;
  const prompt = !result
    ? stage.interviewerPrompt
    : !result.valid
      ? "Follow the request. Is there a complete route from the client to its data?"
      : result.errorRate.value > 0
        ? "Read the simulation evidence. Which constraint explains the failed requests?"
        : result.monthlyCost.value > state.workload.monthlyBudgetUsd
          ? "Your architecture is over budget. Which expense is necessary for the requirement?"
          : "Your request path works in this scenario. Explain the decision and its limitations.";
  return (
    <aside className="inspector">
      <div className="inspector-header">
        <h2>Interview guide</h2>
        <span className="quiet-tag">Self-paced</span>
      </div>
      <div className="interviewer-message">
        <div className="guide-avatar">Q</div>
        <div>
          <strong>Think it through</strong>
          <p>{prompt}</p>
        </div>
      </div>
      {(["diagnosis", "tradeoff"] as const).map((field) => (
        <fieldset className="answer-group" key={field}>
          <legend>{q[field].prompt}</legend>
          {q[field].options.map(([id, label]) => (
            <label
              className={
                state.answers[field] === id ? "answer selected" : "answer"
              }
              key={id}
            >
              <input
                type="radio"
                name={field}
                value={id}
                checked={state.answers[field] === id}
                onChange={() => dispatch({ type: "answer", field, value: id })}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      ))}
      {result && (
        <details className="score-details">
          <summary>Your reasoning · {score.total}/100</summary>
          {score.categories.map((c) => (
            <p key={c.label}>
              <strong>
                {c.label} · {c.points}/{c.max}
              </strong>
              <br />
              {c.explanation}
            </p>
          ))}
        </details>
      )}
      <GoldenCirclePanel />
      <details className="decision-history">
        <summary>Decision history</summary>
        {state.history.length ? (
          state.history.map((h, i) => <p key={i}>{h}</p>)
        ) : (
          <p>Run your first experiment to begin.</p>
        )}
      </details>
    </aside>
  );
}
