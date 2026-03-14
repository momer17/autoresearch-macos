import { useEffect, useRef, useState } from "react";
import { getStatus } from "../lib/api";
import type { StatusResponse } from "../lib/api";

const POLL_INTERVAL = 2000;

// Which pipeline step each status maps to (0-indexed)
const STATUS_STEP: Record<StatusResponse["status"], number> = {
  idle: -1,
  setting_up: 0,
  running_baseline: 2,
  running: 3,
  complete: 4,
  error: 4,
};

const STEPS = [
  { id: "research",  label: "Research",  icon: "🔍" },
  { id: "plan",      label: "Plan",      icon: "📋" },
  { id: "baseline",  label: "Baseline",  icon: "🏗️" },
  { id: "optimise",  label: "Optimise",  icon: "⚡" },
];

const STATUS_COLOR: Record<StatusResponse["status"], string> = {
  idle:             "#555",
  setting_up:       "#f59e0b",
  running_baseline: "#f59e0b",
  running:          "#3b82f6",
  complete:         "#22c55e",
  error:            "#ef4444",
};

const STATUS_LABEL: Record<StatusResponse["status"], string> = {
  idle:             "Idle",
  setting_up:       "Setting up",
  running_baseline: "Running baseline",
  running:          "Running",
  complete:         "Complete",
  error:            "Error",
};

const DONE = new Set<StatusResponse["status"]>(["complete", "error"]);

interface Props {
  metric: string;
  taskType: string;
}

function CodeBlock({ code, label }: { code: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!code) return null;
  return (
    <div style={cs.block}>
      <button style={cs.blockHeader} onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <span style={cs.chevron}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <pre style={cs.code}>{code}</pre>}
    </div>
  );
}

function TextBlock({ text, label }: { text: string; label: string }) {
  const [open, setOpen] = useState(false);
  if (!text) return null;
  return (
    <div style={cs.block}>
      <button style={cs.blockHeader} onClick={() => setOpen((o) => !o)}>
        <span>{label}</span>
        <span style={cs.chevron}>{open ? "▲" : "▼"}</span>
      </button>
      {open && <p style={cs.prose}>{text}</p>}
    </div>
  );
}

export default function DashboardPage({ metric }: Props) {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [connError, setConnError] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) clearInterval(intervalRef.current);
  }

  async function poll() {
    try {
      const res = await getStatus();
      setData(res);
      setConnError(false);
      if (DONE.has(res.status)) stopPolling();
    } catch {
      setConnError(true);
    }
  }

  useEffect(() => {
    poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL);
    return stopPolling;
  }, []);

  if (!data) {
    return (
      <div style={s.page}>
        <p style={s.muted}>{connError ? "Connection error — retrying…" : "Connecting…"}</p>
      </div>
    );
  }

  const step = STATUS_STEP[data.status];
  const improvement =
    data.baseline !== null && data.best_score !== null
      ? data.best_score - data.baseline
      : null;

  const reversed = [...data.iterations].reverse();
  const isRunning = data.status === "running" || data.status === "complete";

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* ── Header ── */}
        <div style={s.headerRow}>
          <div>
            <div style={s.logo}>autoresearch</div>
            <div style={s.metricLine}>Optimising for <strong>{metric}</strong></div>
          </div>
          <span style={{ ...s.badge, color: STATUS_COLOR[data.status] }}>
            ● {STATUS_LABEL[data.status]}
          </span>
        </div>

        {connError && <p style={s.connError}>⚠ Connection error — retrying…</p>}

        {/* ── Pipeline steps ── */}
        <div style={s.pipeline}>
          {STEPS.map((st, idx) => {
            const done = step > idx;
            const active = step === idx;
            return (
              <div key={st.id} style={s.pipelineItem}>
                <div style={{
                  ...s.stepCircle,
                  ...(done  ? s.stepDone   : {}),
                  ...(active ? s.stepActive : {}),
                }}>
                  {done ? "✓" : st.icon}
                </div>
                <span style={{
                  ...s.stepLabel,
                  color: done ? "#22c55e" : active ? "#fff" : "#444",
                }}>
                  {st.label}
                </span>
                {idx < STEPS.length - 1 && (
                  <div style={{ ...s.connector, backgroundColor: done ? "#22c55e" : "#2a2a2a" }} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Current activity ── */}
        {data.stage_label && data.status !== "complete" && (
          <div style={s.stageBar}>
            <span style={s.stageDot} />
            {data.stage_label}
          </div>
        )}

        {/* ── Scores ── */}
        <div style={s.scoreRow}>
          <div style={s.scoreCard}>
            <span style={s.scoreLabel}>Baseline</span>
            <span style={s.scoreValue}>
              {data.baseline !== null ? data.baseline.toFixed(4) : "—"}
            </span>
          </div>
          <div style={s.scoreCard}>
            <span style={s.scoreLabel}>Best</span>
            <span style={s.scoreValue}>
              {data.best_score !== null ? data.best_score.toFixed(4) : "—"}
            </span>
          </div>
          <div style={s.scoreCard}>
            <span style={s.scoreLabel}>Improvement</span>
            <span style={{
              ...s.scoreValue,
              color: improvement === null ? "#555"
                   : improvement > 0  ? "#22c55e"
                   : improvement < 0  ? "#ef4444"
                   : "#fff",
            }}>
              {improvement === null ? "—" : (improvement > 0 ? "+" : "") + improvement.toFixed(4)}
            </span>
          </div>
        </div>

        {/* ── Progress bar (optimise phase) ── */}
        {isRunning && data.total_iterations > 0 && (
          <div style={s.progressSection}>
            <div style={s.progressLabel}>
              Iteration {data.current_iteration} / {data.total_iterations}
            </div>
            <div style={s.progressTrack}>
              <div style={{
                ...s.progressFill,
                width: `${(data.current_iteration / data.total_iterations) * 100}%`,
              }} />
            </div>
          </div>
        )}

        {/* ── Agent outputs ── */}
        <div style={s.outputsSection}>
          <TextBlock label="🔍 Research findings" text={data.research_summary} />
          <TextBlock label="📋 Experiment plan"   text={data.program} />
          <CodeBlock label="🏗️ Baseline model"    code={data.baseline_code} />
          {data.current_strategy && (
            <TextBlock label={`⚡ Current strategy (iter ${data.current_iteration})`} text={data.current_strategy} />
          )}
          {data.current_code && (
            <CodeBlock label={`⚡ Generated code (iter ${data.current_iteration})`} code={data.current_code} />
          )}
        </div>

        {/* ── Error ── */}
        {data.status === "error" && data.error && (
          <pre style={s.errorBox}>{data.error}</pre>
        )}

        {/* ── Iteration table ── */}
        {data.iterations.length > 0 && (
          <div style={s.tableWrap}>
            <div style={s.tableTitle}>Iteration history</div>
            <table style={s.table}>
              <thead>
                <tr>
                  {["#", "Score", "Best", "Δ", "Kept", "Strategy"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reversed.map((it) => {
                  return (
                    <tr key={it.iteration} style={s.tr}>
                      <td style={s.td}>{it.iteration}</td>
                      <td style={s.td}>
                        {it.score !== null ? it.score.toFixed(4) : <span style={s.muted}>crash</span>}
                      </td>
                      <td style={s.td}>{it.best_score.toFixed(4)}</td>
                      <td style={{ ...s.td, color: it.kept ? "#22c55e" : "#ef4444" }}>
                        {it.score !== null && data.baseline !== null
                          ? (it.score - data.baseline > 0 ? "+" : "") + (it.score - data.baseline).toFixed(4)
                          : "—"}
                      </td>
                      <td style={{ ...s.td, color: it.kept ? "#22c55e" : "#ef4444" }}>
                        {it.kept ? "✓" : "✗"}
                      </td>
                      <td style={s.tdStrategy} title={it.strategy}>
                        {it.strategy.length > 90 ? it.strategy.slice(0, 90) + "…" : it.strategy}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {data.iterations.length === 0 && data.status !== "error" && data.status !== "idle" && (
          <p style={s.muted}>Waiting for first iteration…</p>
        )}

      </div>
    </div>
  );
}

// Shared collapsible block styles
const cs: Record<string, React.CSSProperties> = {
  block: {
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    overflow: "hidden",
  },
  blockHeader: {
    width: "100%",
    background: "#161616",
    border: "none",
    padding: "0.65rem 1rem",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    color: "#888",
    fontSize: "0.85rem",
    fontWeight: 500,
    textAlign: "left" as const,
  },
  chevron: { fontSize: "0.7rem", color: "#555" },
  code: {
    margin: 0,
    padding: "1rem",
    backgroundColor: "#0a0a0a",
    color: "#a5f3a0",
    fontSize: "0.78rem",
    lineHeight: "1.6",
    overflowX: "auto",
    whiteSpace: "pre",
    fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
  },
  prose: {
    margin: 0,
    padding: "0.75rem 1rem",
    backgroundColor: "#111",
    color: "#aaa",
    fontSize: "0.85rem",
    lineHeight: "1.7",
    whiteSpace: "pre-wrap",
  },
};

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f0f0f",
    color: "#fff",
    padding: "2rem 1rem",
  },
  inner: {
    maxWidth: "960px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  headerRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  logo: {
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  metricLine: {
    fontSize: "0.8rem",
    color: "#555",
    marginTop: "0.2rem",
  },
  badge: {
    fontSize: "0.85rem",
    fontWeight: 600,
    marginTop: "0.2rem",
  },
  connError: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#f59e0b",
  },
  // Pipeline
  pipeline: {
    display: "flex",
    alignItems: "center",
    gap: "0",
    padding: "1rem 1.25rem",
    backgroundColor: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
  },
  pipelineItem: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    flex: 1,
  },
  stepCircle: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    backgroundColor: "#1a1a1a",
    border: "2px solid #2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "0.85rem",
    flexShrink: 0,
    color: "#444",
  },
  stepDone: {
    backgroundColor: "#052e16",
    borderColor: "#22c55e",
    color: "#22c55e",
    fontSize: "0.75rem",
    fontWeight: 700,
  },
  stepActive: {
    borderColor: "#2563eb",
    backgroundColor: "#0d1a33",
    color: "#fff",
    animation: "pulse 1.5s ease-in-out infinite",
  },
  stepLabel: {
    fontSize: "0.78rem",
    fontWeight: 500,
    whiteSpace: "nowrap" as const,
  },
  connector: {
    flex: 1,
    height: "2px",
    marginInline: "0.4rem",
    borderRadius: "2px",
    minWidth: "12px",
  },
  // Stage bar
  stageBar: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    fontSize: "0.85rem",
    color: "#888",
    padding: "0.6rem 0.9rem",
    backgroundColor: "#111",
    borderRadius: "6px",
    border: "1px solid #1e1e1e",
  },
  stageDot: {
    display: "inline-block",
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    backgroundColor: "#2563eb",
    flexShrink: 0,
    animation: "pulse 1.2s ease-in-out infinite",
  },
  // Scores
  scoreRow: {
    display: "flex",
    gap: "1rem",
  },
  scoreCard: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.35rem",
  },
  scoreLabel: {
    fontSize: "0.72rem",
    color: "#555",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
  },
  scoreValue: {
    fontSize: "1.6rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    color: "#fff",
  },
  // Progress
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  progressLabel: {
    fontSize: "0.8rem",
    color: "#555",
  },
  progressTrack: {
    height: "6px",
    backgroundColor: "#1e1e1e",
    borderRadius: "999px",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#2563eb",
    borderRadius: "999px",
    transition: "width 0.5s ease",
  },
  // Agent outputs
  outputsSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  // Error
  errorBox: {
    backgroundColor: "#1a0a0a",
    border: "1px solid #5a1a1a",
    borderRadius: "8px",
    padding: "1rem",
    color: "#f87171",
    fontSize: "0.78rem",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  // Table
  tableWrap: {
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    overflow: "hidden",
  },
  tableTitle: {
    padding: "0.65rem 1rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#555",
    backgroundColor: "#161616",
    borderBottom: "1px solid #2a2a2a",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.83rem",
  },
  th: {
    padding: "0.55rem 0.9rem",
    textAlign: "left" as const,
    color: "#555",
    fontWeight: 500,
    borderBottom: "1px solid #2a2a2a",
    whiteSpace: "nowrap" as const,
  },
  tr: { borderBottom: "1px solid #1a1a1a" },
  td: {
    padding: "0.55rem 0.9rem",
    color: "#ccc",
    whiteSpace: "nowrap" as const,
    fontVariantNumeric: "tabular-nums",
  },
  tdStrategy: {
    padding: "0.55rem 0.9rem",
    color: "#777",
    maxWidth: "380px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  muted: { color: "#444", fontSize: "0.875rem", margin: 0 },
};
