import { useEffect, useRef } from "react";

export type AgentType = "research" | "plan" | "baseline" | "strategy" | "coder" | "eval" | "system";

export interface TimelineEntry {
  id: number;
  label: string;
  timestamp: Date;
  agentType: AgentType;
  iteration?: number;
}

export function detectAgentType(label: string): AgentType {
  const l = label.toLowerCase();
  if (l.includes("research")) return "research";
  if (l.includes("program") || l.includes("plan") || l.includes("generator")) return "plan";
  if (l.includes("baseline")) return "baseline";
  if (l.includes("strategist") || l.includes("strategy")) return "strategy";
  if (l.includes("coder") || (l.includes("code") && !l.includes("baseline"))) return "coder";
  if (l.includes("evaluat")) return "eval";
  return "system";
}

export function extractIteration(label: string): number | undefined {
  const m = label.match(/iteration\s+(\d+)/i);
  return m ? parseInt(m[1], 10) : undefined;
}

const AGENT_META: Record<AgentType, { color: string; bg: string; name: string }> = {
  research:  { color: "#a855f7", bg: "#1e0a2a", name: "Research" },
  plan:      { color: "#3b82f6", bg: "#0d1a33", name: "Planner" },
  baseline:  { color: "#f59e0b", bg: "#1f1500", name: "Baseline" },
  strategy:  { color: "#f97316", bg: "#1f0d00", name: "Strategist" },
  coder:     { color: "#06b6d4", bg: "#001a1f", name: "Coder" },
  eval:      { color: "#22c55e", bg: "#052e16", name: "Evaluator" },
  system:    { color: "#6b7280", bg: "#111", name: "System" },
};

function fmt(d: Date) {
  return d.toLocaleTimeString("en-GB", { hour12: false });
}

interface Props {
  entries: TimelineEntry[];
  isLive: boolean;
}

export default function AgentTimeline({ entries, isLive }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isLive && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [entries.length, isLive]);

  if (entries.length === 0) return null;

  return (
    <div style={s.wrapper}>
      <div style={s.header}>
        <span style={s.title}>Agent Activity</span>
        {isLive && (
          <span style={s.liveBadge}>
            <span style={s.liveDot} />
            live
          </span>
        )}
        <span style={s.count}>{entries.length} events</span>
      </div>

      <div style={s.feed}>
        {entries.map((entry, idx) => {
          const meta = AGENT_META[entry.agentType];
          const isLast = idx === entries.length - 1;
          return (
            <div key={entry.id} style={s.row}>
              {/* Vertical connector */}
              <div style={s.connCol}>
                <div style={{ ...s.dot, backgroundColor: meta.color, boxShadow: isLast && isLive ? `0 0 6px ${meta.color}` : "none" }} />
                {idx < entries.length - 1 && <div style={s.line} />}
              </div>

              {/* Content */}
              <div style={s.content}>
                <div style={s.contentTop}>
                  <span style={{ ...s.agentBadge, color: meta.color, backgroundColor: meta.bg, borderColor: meta.color + "44" }}>
                    {meta.name}
                  </span>
                  {entry.iteration !== undefined && (
                    <span style={s.iterBadge}>iter {entry.iteration}</span>
                  )}
                  <span style={s.time}>{fmt(entry.timestamp)}</span>
                </div>
                <div style={s.labelText}>{entry.label}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    border: "1px solid #2a2a2a",
    borderRadius: "10px",
    overflow: "hidden",
    backgroundColor: "#0d0d0d",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "0.6rem",
    padding: "0.65rem 1rem",
    backgroundColor: "#111",
    borderBottom: "1px solid #1e1e1e",
  },
  title: {
    fontSize: "0.78rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#555",
    flex: 1,
  },
  liveBadge: {
    display: "flex",
    alignItems: "center",
    gap: "0.3rem",
    fontSize: "0.72rem",
    color: "#22c55e",
    fontWeight: 600,
  },
  liveDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#22c55e",
    animation: "pulse 1.2s ease-in-out infinite",
  },
  count: {
    fontSize: "0.72rem",
    color: "#444",
  },
  feed: {
    maxHeight: "260px",
    overflowY: "auto" as const,
    padding: "0.75rem 1rem",
  },
  row: {
    display: "flex",
    gap: "0.75rem",
    minHeight: "44px",
  },
  connCol: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    width: "10px",
    flexShrink: 0,
    paddingTop: "3px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    flexShrink: 0,
    transition: "box-shadow 0.3s ease",
  },
  line: {
    flex: 1,
    width: "1px",
    backgroundColor: "#1e1e1e",
    marginTop: "3px",
  },
  content: {
    flex: 1,
    paddingBottom: "0.75rem",
  },
  contentTop: {
    display: "flex",
    alignItems: "center",
    gap: "0.4rem",
    marginBottom: "0.2rem",
  },
  agentBadge: {
    fontSize: "0.68rem",
    fontWeight: 700,
    padding: "1px 6px",
    borderRadius: "4px",
    border: "1px solid",
    letterSpacing: "0.04em",
  },
  iterBadge: {
    fontSize: "0.68rem",
    color: "#555",
    backgroundColor: "#1a1a1a",
    padding: "1px 5px",
    borderRadius: "4px",
    fontVariantNumeric: "tabular-nums",
  },
  time: {
    fontSize: "0.68rem",
    color: "#333",
    marginLeft: "auto",
    fontVariantNumeric: "tabular-nums",
    fontFamily: "monospace",
  },
  labelText: {
    fontSize: "0.8rem",
    color: "#888",
    lineHeight: "1.4",
  },
};
