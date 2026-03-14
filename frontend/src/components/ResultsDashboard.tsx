import type { Iteration } from "../lib/api";

interface Props {
  iterations: Iteration[];
  baseline: number | null;
  best_score: number | null;
  metric: string;
}

// ─── Stat card ───────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div style={sc.card}>
      <span style={sc.label}>{label}</span>
      <span style={{ ...sc.value, color: accent ?? "#fff" }}>{value}</span>
      {sub && <span style={sc.sub}>{sub}</span>}
    </div>
  );
}

const sc: Record<string, React.CSSProperties> = {
  card: {
    flex: 1,
    minWidth: "120px",
    backgroundColor: "#111",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    padding: "1rem 1.1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
  },
  label: {
    fontSize: "0.68rem",
    color: "#444",
    textTransform: "uppercase" as const,
    letterSpacing: "0.07em",
    fontWeight: 600,
  },
  value: {
    fontSize: "1.7rem",
    fontWeight: 700,
    fontVariantNumeric: "tabular-nums",
    lineHeight: 1,
  },
  sub: {
    fontSize: "0.72rem",
    color: "#444",
    marginTop: "0.1rem",
  },
};

// ─── Score progression chart ─────────────────────────────────────────────────

function ScoreChart({ iterations, baseline }: { iterations: Iteration[]; baseline: number | null }) {
  const W = 660, H = 200;
  const PAD = { top: 24, right: 28, bottom: 40, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const scored = iterations.filter((it) => it.score !== null);
  if (scored.length === 0) return null;

  const allVals: number[] = scored.map((it) => it.score as number);
  iterations.forEach((it) => allVals.push(it.best_score));
  if (baseline !== null) allVals.push(baseline);

  const rawMin = Math.min(...allVals);
  const rawMax = Math.max(...allVals);
  const range = rawMax - rawMin || 0.001;
  const pad = range * 0.12;
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const totalRange = maxV - minV;

  const n = iterations.length;

  function xOf(i: number) {
    return PAD.left + (n <= 1 ? cW / 2 : (i / (n - 1)) * cW);
  }
  function yOf(v: number) {
    return PAD.top + (1 - (v - minV) / totalRange) * cH;
  }

  // Best score path & area fill
  const bestPts = iterations.map((it, i) => ({ x: xOf(i), y: yOf(it.best_score) }));
  const bestLinePath = bestPts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const chartBottom = PAD.top + cH;
  const areaPath =
    bestLinePath +
    ` L ${bestPts[bestPts.length - 1].x.toFixed(1)} ${chartBottom} L ${PAD.left} ${chartBottom} Z`;

  // Per-iteration score path (skip nulls)
  let scorePath = "";
  iterations.forEach((it, i) => {
    if (it.score === null) return;
    const x = xOf(i).toFixed(1);
    const y = yOf(it.score).toFixed(1);
    scorePath += scorePath === "" ? `M ${x} ${y}` : ` L ${x} ${y}`;
  });

  // Grid lines (5)
  const gridLines = Array.from({ length: 5 }, (_, i) => {
    const v = minV + (totalRange * i) / 4;
    return { y: yOf(v), v };
  });

  const gradId = `area-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* Grid */}
      {gridLines.map((gl, i) => (
        <g key={i}>
          <line x1={PAD.left} y1={gl.y} x2={PAD.left + cW} y2={gl.y} stroke="#1a1a1a" strokeWidth={1} />
          <text x={PAD.left - 6} y={gl.y + 4} fill="#3a3a3a" fontSize={10} textAnchor="end" fontFamily="monospace">
            {gl.v.toFixed(3)}
          </text>
        </g>
      ))}

      {/* Chart border bottom */}
      <line x1={PAD.left} y1={chartBottom} x2={PAD.left + cW} y2={chartBottom} stroke="#2a2a2a" strokeWidth={1} />

      {/* Baseline dashed line */}
      {baseline !== null && (
        <>
          <line
            x1={PAD.left}
            y1={yOf(baseline)}
            x2={PAD.left + cW}
            y2={yOf(baseline)}
            stroke="#f59e0b"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            opacity={0.6}
          />
          <text x={PAD.left + cW + 5} y={yOf(baseline) + 4} fill="#f59e0b" fontSize={9} opacity={0.7}>
            baseline
          </text>
        </>
      )}

      {/* Best score area fill */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Best score line */}
      <path d={bestLinePath} fill="none" stroke="#3b82f6" strokeWidth={2.5} strokeLinejoin="round" />

      {/* Per-iteration score line */}
      {scorePath && (
        <path d={scorePath} fill="none" stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="5 3" opacity={0.65} strokeLinejoin="round" />
      )}

      {/* Score dots */}
      {iterations.map((it, i) => {
        if (it.score === null) {
          return (
            <text key={i} x={xOf(i)} y={chartBottom - 8} fill="#333" fontSize={10} textAnchor="middle">
              ✗
            </text>
          );
        }
        const cx = xOf(i);
        const cy = yOf(it.score);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r={5} fill={it.kept ? "#22c55e" : "#ef4444"} stroke="#0d0d0d" strokeWidth={1.5} />
          </g>
        );
      })}

      {/* X axis tick labels */}
      {iterations.map((it, i) => (
        <text key={i} x={xOf(i)} y={H - 8} fill="#3a3a3a" fontSize={10} textAnchor="middle" fontFamily="monospace">
          {it.iteration}
        </text>
      ))}

      {/* Axis label */}
      <text x={PAD.left + cW / 2} y={H - 1} fill="#2e2e2e" fontSize={10} textAnchor="middle">
        Iteration
      </text>

      {/* Legend */}
      <g>
        <line x1={PAD.left} y1={PAD.top - 8} x2={PAD.left + 18} y2={PAD.top - 8} stroke="#3b82f6" strokeWidth={2.5} />
        <text x={PAD.left + 22} y={PAD.top - 4} fill="#444" fontSize={10}>
          Best score
        </text>
        <line x1={PAD.left + 86} y1={PAD.top - 8} x2={PAD.left + 104} y2={PAD.top - 8} stroke="#06b6d4" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.65} />
        <text x={PAD.left + 108} y={PAD.top - 4} fill="#444" fontSize={10}>
          Iter score
        </text>
        <circle cx={PAD.left + 182} cy={PAD.top - 8} r={4} fill="#22c55e" />
        <text x={PAD.left + 190} y={PAD.top - 4} fill="#444" fontSize={10}>
          Kept
        </text>
        <circle cx={PAD.left + 224} cy={PAD.top - 8} r={4} fill="#ef4444" />
        <text x={PAD.left + 232} y={PAD.top - 4} fill="#444" fontSize={10}>
          Dropped
        </text>
      </g>
    </svg>
  );
}

// ─── Per-iteration bar chart ──────────────────────────────────────────────────

function BarChart({ iterations, baseline }: { iterations: Iteration[]; baseline: number | null }) {
  const W = 420, H = 160;
  const PAD = { top: 12, right: 16, bottom: 32, left: 52 };
  const cW = W - PAD.left - PAD.right;
  const cH = H - PAD.top - PAD.bottom;

  const scored = iterations.filter((it) => it.score !== null);
  if (scored.length === 0) return null;

  const allVals: number[] = scored.map((it) => it.score as number);
  if (baseline !== null) allVals.push(baseline);

  const rawMax = Math.max(...allVals);
  const rawMin = Math.min(...allVals);
  const range = rawMax - rawMin || 0.001;
  const pad = range * 0.15;
  const minV = rawMin - pad;
  const maxV = rawMax + pad;
  const totalRange = maxV - minV;

  const n = iterations.length;
  const slotW = cW / n;
  const barW = Math.max(4, Math.min(slotW * 0.6, 36));

  function xOf(i: number) {
    return PAD.left + slotW * i + slotW / 2;
  }
  function yOf(v: number) {
    return PAD.top + (1 - (v - minV) / totalRange) * cH;
  }
  function hOf(v: number) {
    return ((v - minV) / totalRange) * cH;
  }

  const chartBottom = PAD.top + cH;
  const baselineY = baseline !== null ? yOf(baseline) : null;

  const gridCount = 4;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
      {/* Grid */}
      {Array.from({ length: gridCount + 1 }, (_, i) => {
        const v = minV + (totalRange * i) / gridCount;
        const y = yOf(v);
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={PAD.left + cW} y2={y} stroke="#1a1a1a" strokeWidth={1} />
            <text x={PAD.left - 4} y={y + 4} fill="#3a3a3a" fontSize={9} textAnchor="end" fontFamily="monospace">
              {v.toFixed(2)}
            </text>
          </g>
        );
      })}

      {/* Baseline */}
      {baselineY !== null && (
        <line x1={PAD.left} y1={baselineY} x2={PAD.left + cW} y2={baselineY} stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="4 2" opacity={0.55} />
      )}

      {/* Bars */}
      {iterations.map((it, i) => {
        const bx = xOf(i) - barW / 2;
        if (it.score === null) {
          return (
            <g key={i}>
              <rect x={bx} y={chartBottom - 12} width={barW} height={12} fill="#1a1a1a" rx={2} />
              <text x={xOf(i)} y={chartBottom - 14} fill="#2a2a2a" fontSize={8} textAnchor="middle">err</text>
            </g>
          );
        }
        const by = yOf(it.score);
        const bh = Math.max(2, hOf(it.score));
        return (
          <g key={i}>
            <rect x={bx} y={by} width={barW} height={bh} rx={2}
              fill={it.kept ? "#2563eb" : "#5a1a1a"}
              opacity={it.kept ? 1 : 0.75}
            />
          </g>
        );
      })}

      {/* X labels */}
      {iterations.map((it, i) => (
        <text key={i} x={xOf(i)} y={H - 6} fill="#333" fontSize={9} textAnchor="middle" fontFamily="monospace">
          {it.iteration}
        </text>
      ))}

      {/* Legend */}
      <g transform={`translate(${PAD.left}, ${PAD.top - 1})`}>
        <rect x={0} y={0} width={9} height={7} fill="#2563eb" rx={1} />
        <text x={13} y={7} fill="#444" fontSize={9}>Kept</text>
        <rect x={42} y={0} width={9} height={7} fill="#5a1a1a" rx={1} />
        <text x={56} y={7} fill="#444" fontSize={9}>Dropped</text>
      </g>
    </svg>
  );
}

// ─── Donut chart ─────────────────────────────────────────────────────────────

function DonutChart({ kept, total, crashed }: { kept: number; total: number; crashed: number }) {
  if (total === 0) return null;

  const r = 48;
  const cx = 70, cy = 70;
  const strokeW = 14;
  const circ = 2 * Math.PI * r;

  const failed = total - kept - crashed;
  const keptArc = (kept / total) * circ;
  const failedArc = (failed / total) * circ;
  const crashedArc = (crashed / total) * circ;

  const pct = Math.round((kept / total) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
      <svg viewBox="0 0 140 140" style={{ width: "140px", height: "140px" }}>
        {/* Background track */}
        <circle r={r} cx={cx} cy={cy} fill="none" stroke="#1a1a1a" strokeWidth={strokeW} />

        {/* Kept (blue) */}
        {keptArc > 0 && (
          <circle r={r} cx={cx} cy={cy} fill="none"
            stroke="#3b82f6" strokeWidth={strokeW}
            strokeDasharray={`${keptArc} ${circ}`}
            strokeDashoffset={0}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {/* Failed (red) */}
        {failedArc > 0 && (
          <circle r={r} cx={cx} cy={cy} fill="none"
            stroke="#7f1d1d" strokeWidth={strokeW}
            strokeDasharray={`${failedArc} ${circ}`}
            strokeDashoffset={-keptArc}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {/* Crashed (gray) */}
        {crashedArc > 0 && (
          <circle r={r} cx={cx} cy={cy} fill="none"
            stroke="#374151" strokeWidth={strokeW}
            strokeDasharray={`${crashedArc} ${circ}`}
            strokeDashoffset={-(keptArc + failedArc)}
            transform={`rotate(-90 ${cx} ${cy})`}
            strokeLinecap="round"
          />
        )}

        {/* Center label */}
        <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize={22} fontWeight={700} fontFamily="monospace">
          {pct}%
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="#555" fontSize={11}>
          kept
        </text>
      </svg>

      {/* Legend */}
      <div style={dc.legend}>
        <LegendRow color="#3b82f6" label="Improved" count={kept} total={total} />
        <LegendRow color="#7f1d1d" label="Dropped" count={failed} total={total} />
        {crashed > 0 && <LegendRow color="#374151" label="Crashed" count={crashed} total={total} />}
      </div>
    </div>
  );
}

function LegendRow({ color, label, count, total }: { color: string; label: string; count: number; total: number }) {
  return (
    <div style={dc.legendRow}>
      <span style={{ ...dc.dot, backgroundColor: color }} />
      <span style={dc.legendLabel}>{label}</span>
      <span style={dc.legendCount}>{count}</span>
      <span style={dc.legendPct}>{Math.round((count / total) * 100)}%</span>
    </div>
  );
}

const dc: Record<string, React.CSSProperties> = {
  legend: { display: "flex", flexDirection: "column", gap: "0.35rem", width: "100%" },
  legendRow: { display: "flex", alignItems: "center", gap: "0.5rem" },
  dot: { width: "8px", height: "8px", borderRadius: "2px", flexShrink: 0 },
  legendLabel: { fontSize: "0.78rem", color: "#666", flex: 1 },
  legendCount: { fontSize: "0.78rem", color: "#888", fontVariantNumeric: "tabular-nums", fontFamily: "monospace" },
  legendPct: { fontSize: "0.72rem", color: "#444", fontVariantNumeric: "tabular-nums", fontFamily: "monospace", width: "32px", textAlign: "right" as const },
};

// ─── Main export ─────────────────────────────────────────────────────────────

export default function ResultsDashboard({ iterations, baseline, best_score, metric }: Props) {
  if (iterations.length === 0) return null;

  const kept = iterations.filter((it) => it.kept).length;
  const crashed = iterations.filter((it) => it.score === null).length;
  const successRate = (kept / iterations.length) * 100;
  const improvement = baseline !== null && best_score !== null ? best_score - baseline : null;
  const improvementPct =
    improvement !== null && baseline !== null && baseline !== 0
      ? (improvement / Math.abs(baseline)) * 100
      : null;

  return (
    <div style={s.wrapper}>
      {/* Section header */}
      <div style={s.sectionHeader}>
        <span style={s.sectionIcon}>📊</span>
        <span style={s.sectionTitle}>Experiment Summary</span>
      </div>

      {/* Stat cards */}
      <div style={s.statsRow}>
        <StatCard label="Iterations" value={String(iterations.length)} />
        <StatCard
          label="Improvements"
          value={String(kept)}
          sub={`of ${iterations.length} iterations`}
          accent="#3b82f6"
        />
        <StatCard
          label="Success rate"
          value={`${successRate.toFixed(0)}%`}
          accent={successRate >= 50 ? "#22c55e" : "#f97316"}
        />
        <StatCard
          label={`Best ${metric}`}
          value={best_score !== null ? best_score.toFixed(4) : "—"}
          sub={baseline !== null ? `baseline ${baseline.toFixed(4)}` : undefined}
          accent="#fff"
        />
        {improvementPct !== null && (
          <StatCard
            label="Total gain"
            value={`${improvementPct > 0 ? "+" : ""}${improvementPct.toFixed(1)}%`}
            accent={improvementPct > 0 ? "#22c55e" : "#ef4444"}
          />
        )}
      </div>

      {/* Score progression chart */}
      <div style={s.chartCard}>
        <div style={s.chartTitle}>Score Progression</div>
        <div style={s.chartBody}>
          <ScoreChart iterations={iterations} baseline={baseline} />
        </div>
      </div>

      {/* Bottom row: bar chart + donut */}
      <div style={s.bottomRow}>
        <div style={{ ...s.chartCard, flex: 3 }}>
          <div style={s.chartTitle}>Per-Iteration Scores</div>
          <div style={s.chartBody}>
            <BarChart iterations={iterations} baseline={baseline} />
          </div>
        </div>
        <div style={{ ...s.chartCard, flex: 1, minWidth: "200px" }}>
          <div style={s.chartTitle}>Outcome Breakdown</div>
          <div style={{ ...s.chartBody, alignItems: "center", justifyContent: "center" }}>
            <DonutChart kept={kept} total={iterations.length} crashed={crashed} />
          </div>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "1rem",
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
    paddingBottom: "0.25rem",
    borderBottom: "1px solid #1e1e1e",
  },
  sectionIcon: { fontSize: "1rem" },
  sectionTitle: {
    fontSize: "0.85rem",
    fontWeight: 700,
    color: "#666",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
  },
  statsRow: {
    display: "flex",
    gap: "0.75rem",
    flexWrap: "wrap" as const,
  },
  chartCard: {
    backgroundColor: "#0d0d0d",
    border: "1px solid #1e1e1e",
    borderRadius: "10px",
    overflow: "hidden",
  },
  chartTitle: {
    padding: "0.6rem 1rem",
    fontSize: "0.72rem",
    fontWeight: 600,
    color: "#444",
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    borderBottom: "1px solid #141414",
  },
  chartBody: {
    padding: "1rem",
    display: "flex",
    flexDirection: "column" as const,
  },
  bottomRow: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap" as const,
  },
};
