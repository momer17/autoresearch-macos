import { useEffect, useRef, useState } from "react";
import { getStatus } from "../lib/api";
import type { StatusResponse } from "../lib/api";

const POLL_INTERVAL = 3000;

const STATUS_LABEL: Record<StatusResponse["status"], string> = {
  idle: "Idle",
  setting_up: "Setting up...",
  running_baseline: "Running baseline...",
  running: "Running",
  complete: "Complete",
  error: "Error",
};

const STATUS_COLOR: Record<StatusResponse["status"], string> = {
  idle: "#555",
  setting_up: "#f59e0b",
  running_baseline: "#f59e0b",
  running: "#3b82f6",
  complete: "#22c55e",
  error: "#ef4444",
};

const DONE = new Set(["complete", "error"]);

interface Props {
  metric: string;
  taskType: string;
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
        <p style={s.muted}>{connError ? "Connection error — retrying..." : "Loading..."}</p>
      </div>
    );
  }

  const improvement =
    data.baseline !== null && data.best_score !== null
      ? data.baseline - data.best_score
      : null;

  const reversed = [...data.iterations].reverse();

  return (
    <div style={s.page}>
      <div style={s.inner}>

        {/* Header row */}
        <div style={s.headerRow}>
          <h1 style={s.title}>autoresearch</h1>
          <div style={s.headerRight}>
            <span style={s.metricLabel}>Optimising for: <strong>{metric}</strong></span>
            <span style={{ ...s.badge, color: STATUS_COLOR[data.status] }}>
              {STATUS_LABEL[data.status]}
            </span>
          </div>
        </div>

        {connError && <p style={s.connError}>Connection error — retrying...</p>}

        {/* Score panel */}
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
              color: improvement === null ? "#555" : improvement > 0 ? "#22c55e" : improvement < 0 ? "#ef4444" : "#fff",
            }}>
              {improvement === null ? "—" : (improvement > 0 ? "+" : "") + improvement.toFixed(4)}
            </span>
          </div>
        </div>

        {/* Progress bar */}
        {(data.status === "running" || data.status === "complete") && (
          <div style={s.progressSection}>
            <div style={s.progressLabel}>
              Iteration {data.current_iteration} / {data.total_iterations}
            </div>
            <div style={s.progressTrack}>
              <div
                style={{
                  ...s.progressFill,
                  width: data.total_iterations > 0
                    ? `${(data.current_iteration / data.total_iterations) * 100}%`
                    : "0%",
                }}
              />
            </div>
          </div>
        )}

        {/* Research summary */}
        {data.research_summary && (
          <details style={s.details}>
            <summary style={s.summary}>Research summary</summary>
            <p style={s.summaryBody}>{data.research_summary}</p>
          </details>
        )}

        {/* Error state */}
        {data.status === "error" && data.error && (
          <pre style={s.errorBox}>{data.error}</pre>
        )}

        {/* Iteration table */}
        {data.iterations.length > 0 && (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["#", "Score", "Best", "Kept", "Strategy"].map((h) => (
                    <th key={h} style={s.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reversed.map((it) => (
                  <tr key={it.iteration} style={s.tr}>
                    <td style={s.td}>{it.iteration}</td>
                    <td style={s.td}>
                      {it.score !== null ? it.score.toFixed(4) : <span style={s.muted}>crash</span>}
                    </td>
                    <td style={s.td}>{it.best_score.toFixed(4)}</td>
                    <td style={{ ...s.td, color: it.kept ? "#22c55e" : "#ef4444" }}>
                      {it.kept ? "✓" : "✗"}
                    </td>
                    <td style={s.tdStrategy} title={it.strategy}>
                      {it.strategy.length > 80 ? it.strategy.slice(0, 80) + "…" : it.strategy}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {data.iterations.length === 0 && data.status !== "error" && (
          <p style={s.muted}>Waiting for first iteration...</p>
        )}

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f0f0f",
    color: "#fff",
    padding: "2rem 1rem",
  },
  inner: {
    maxWidth: "900px",
    margin: "0 auto",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    margin: 0,
    fontSize: "1.25rem",
    fontWeight: 700,
    color: "#fff",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  metricLabel: {
    fontSize: "0.8rem",
    color: "#555",
  },
  badge: {
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  connError: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#f59e0b",
  },
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
    fontSize: "0.75rem",
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  scoreValue: {
    fontSize: "1.5rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
  },
  progressSection: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  progressLabel: {
    fontSize: "0.8rem",
    color: "#666",
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
    transition: "width 0.4s ease",
  },
  details: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "0.75rem 1rem",
  },
  summary: {
    cursor: "pointer",
    fontSize: "0.875rem",
    color: "#888",
    userSelect: "none" as const,
  },
  summaryBody: {
    margin: "0.75rem 0 0",
    fontSize: "0.85rem",
    color: "#aaa",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
  },
  errorBox: {
    backgroundColor: "#1a0a0a",
    border: "1px solid #5a1a1a",
    borderRadius: "8px",
    padding: "1rem",
    color: "#f87171",
    fontSize: "0.8rem",
    overflowX: "auto",
    whiteSpace: "pre-wrap",
    margin: 0,
  },
  tableWrap: {
    overflowX: "auto",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
    fontSize: "0.85rem",
  },
  th: {
    padding: "0.6rem 0.9rem",
    textAlign: "left" as const,
    color: "#555",
    fontWeight: 500,
    borderBottom: "1px solid #2a2a2a",
    whiteSpace: "nowrap" as const,
  },
  tr: {
    borderBottom: "1px solid #1a1a1a",
  },
  td: {
    padding: "0.6rem 0.9rem",
    color: "#ccc",
    whiteSpace: "nowrap" as const,
    fontVariantNumeric: "tabular-nums",
  },
  tdStrategy: {
    padding: "0.6rem 0.9rem",
    color: "#888",
    maxWidth: "400px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  muted: {
    color: "#444",
    fontSize: "0.875rem",
  },
};
