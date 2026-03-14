import { useRef, useState } from "react";
import { postStart } from "../lib/api";
import type { ExperimentMeta } from "../App";

interface Props {
  onStarted: (meta: ExperimentMeta) => void;
}

function parseColumns(csvText: string): string[] {
  const firstLine = csvText.split("\n")[0];
  return firstLine.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

export default function StartPage({ onStarted }: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [target, setTarget] = useState("");
  const [description, setDescription] = useState("");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file.");
      return;
    }
    const text = await file.text();
    const cols = parseColumns(text);
    if (cols.length === 0) {
      setError("Could not read column headers from the first row.");
      return;
    }
    setCsvFile(file);
    setColumns(cols);
    setTarget("");
    setError("");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  async function handleStart() {
    if (!csvFile || !target || !description.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await postStart({
        file: csvFile,
        target_col: target,
        task_description: description.trim(),
        total_iterations: 8,
      });
      onStarted({ metric: res.metric, task_type: res.task_type });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start experiment.");
      setLoading(false);
    }
  }

  const canStart = !!csvFile && !!target && description.trim().length > 0 && !loading;

  return (
    <div style={s.page}>
      <div style={s.card}>
        <div style={s.logo}>autoresearch</div>
        <p style={s.sub}>Autonomous ML optimisation — upload your dataset to begin.</p>

        {/* CSV drop zone */}
        <div style={s.section}>
          <label style={s.label}>Dataset (CSV)</label>
          <div
            style={{ ...s.dropZone, ...(dragging ? s.dropActive : {}), ...(csvFile ? s.dropDone : {}) }}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {csvFile ? (
              <div style={s.fileInfo}>
                <span style={s.fileIcon}>📄</span>
                <div>
                  <div style={s.fileName}>{csvFile.name}</div>
                  <div style={s.fileMeta}>{columns.length} columns detected</div>
                </div>
                <button
                  style={s.changeBtn}
                  onClick={(e) => { e.stopPropagation(); setCsvFile(null); setColumns([]); setTarget(""); }}
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <span style={s.dropIcon}>⬆</span>
                <span style={s.dropText}>
                  {dragging ? "Release to upload" : "Drop CSV here or click to browse"}
                </span>
              </>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </div>
        </div>

        {/* Target column chips */}
        {columns.length > 0 && (
          <div style={s.section}>
            <label style={s.label}>Target column — what do you want to predict?</label>
            <div style={s.chips}>
              {columns.map((col) => (
                <button
                  key={col}
                  style={{ ...s.chip, ...(target === col ? s.chipActive : {}) }}
                  onClick={() => setTarget(col)}
                >
                  {col}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Task description */}
        <div style={s.section}>
          <label style={s.label}>Task description</label>
          <textarea
            style={s.textarea}
            rows={3}
            placeholder='e.g. "Predict whether a customer will churn based on their usage history."'
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {error && <p style={s.error}>{error}</p>}

        <button style={{ ...s.startBtn, ...(!canStart ? s.startBtnDisabled : {}) }} onClick={handleStart} disabled={!canStart}>
          {loading ? "Starting…" : "Start Experiment"}
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0f0f0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
  },
  card: {
    width: "100%",
    maxWidth: "560px",
    display: "flex",
    flexDirection: "column",
    gap: "1.5rem",
  },
  logo: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#fff",
    letterSpacing: "-0.02em",
  },
  sub: {
    margin: 0,
    fontSize: "0.9rem",
    color: "#555",
    lineHeight: "1.5",
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
  },
  label: {
    fontSize: "0.75rem",
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#666",
  },
  dropZone: {
    border: "2px dashed #2a2a2a",
    borderRadius: "10px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    textAlign: "center" as const,
  },
  dropActive: {
    borderColor: "#2563eb",
    backgroundColor: "#0d1a33",
  },
  dropDone: {
    borderColor: "#2a2a2a",
    backgroundColor: "#111",
    alignItems: "flex-start",
  },
  dropIcon: { fontSize: "1.5rem", color: "#444" },
  dropText: { fontSize: "0.875rem", color: "#555" },
  fileInfo: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    width: "100%",
  },
  fileIcon: { fontSize: "1.5rem" },
  fileName: { fontSize: "0.9rem", color: "#e5e5e5", fontWeight: 500 },
  fileMeta: { fontSize: "0.75rem", color: "#555" },
  changeBtn: {
    marginLeft: "auto",
    backgroundColor: "transparent",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "0.25rem 0.6rem",
    color: "#888",
    fontSize: "0.75rem",
    cursor: "pointer",
  },
  chips: {
    display: "flex",
    flexWrap: "wrap" as const,
    gap: "0.4rem",
  },
  chip: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "999px",
    padding: "0.3rem 0.8rem",
    color: "#aaa",
    fontSize: "0.8rem",
    cursor: "pointer",
    transition: "border-color 0.1s, color 0.1s",
  },
  chipActive: {
    borderColor: "#2563eb",
    color: "#fff",
    backgroundColor: "#0d1a33",
  },
  textarea: {
    backgroundColor: "#111",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "0.75rem 0.9rem",
    color: "#e5e5e5",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    outline: "none",
    resize: "vertical" as const,
    fontFamily: "inherit",
  },
  error: {
    margin: 0,
    fontSize: "0.85rem",
    color: "#ef4444",
  },
  startBtn: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    padding: "0.85rem",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
    width: "100%",
  },
  startBtnDisabled: {
    backgroundColor: "#1a2a4a",
    color: "#445",
    cursor: "not-allowed",
  },
};
