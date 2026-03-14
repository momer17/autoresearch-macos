import { useRef, useState } from "react";
import { postStart } from "../lib/api";

interface Props {
  onStarted: () => void;
}

interface Message {
  role: "bot" | "user";
  text: string;
}

type Stage = "drop_csv" | "pick_target" | "describe_goal" | "starting";

function inferConfig(goal: string, columns: string[], target: string) {
  const isRegression =
    /predict.*(price|cost|value|amount|revenue|sales|score|age|weight|temperature|rate)/i.test(goal) ||
    /regression|continuous|numeric/i.test(goal);
  const task_type = isRegression ? "regression" : "binary_classification";
  const metric = isRegression ? "rmse" : "f1";
  const feature_cols = columns.filter((c) => c !== target).join(", ");
  return { task_type, metric, feature_cols };
}

function parseColumns(csvText: string): string[] {
  const firstLine = csvText.split("\n")[0];
  return firstLine.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
}

export default function StartPage({ onStarted }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", text: "Drop your CSV dataset below to get started." },
  ]);
  const [stage, setStage] = useState<Stage>("drop_csv");
  const [columns, setColumns] = useState<string[]>([]);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [target, setTarget] = useState("");
  const [input, setInput] = useState("");
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function push(role: "bot" | "user", text: string) {
    setMessages((prev) => [...prev, { role, text }]);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  }

  async function handleFile(file: File) {
    if (!file.name.endsWith(".csv")) {
      push("bot", "That does not look like a CSV file. Please drop a .csv file.");
      return;
    }
    const text = await file.text();
    const cols = parseColumns(text);
    if (cols.length === 0) {
      push("bot", "Could not read columns. Make sure the first row is a header.");
      return;
    }
    setCsvFile(file);
    setColumns(cols);
    push("user", "\u{1F4CE} " + file.name);
    push(
      "bot",
      "Found " + cols.length + " columns:\n" + cols.join(", ") + "\n\nWhich column do you want to predict?"
    );
    setStage("pick_target");
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function selectTarget(col: string) {
    setTarget(col);
    push("user", col);
    push("bot", `Got it — predicting "${col}".\n\nDescribe the task in one sentence (e.g. "Detect fraudulent transactions").`);
    setStage("describe_goal");
    setInput("");
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");

    if (stage === "pick_target") {
      const matched = columns.find((c) => c.toLowerCase() === text.toLowerCase()) ?? text;
      selectTarget(matched);
      return;
    }

    if (stage === "describe_goal") {
      push("user", text);
      startExperiment(text);
    }
  }

  async function startExperiment(goal: string) {
    if (!csvFile) return;
    setStage("starting");
    push("bot", "Starting the experiment...");
    const { task_type, metric, feature_cols } = inferConfig(goal, columns, target);
    try {
      await postStart({
        file: csvFile,
        target_col: target,
        task_description: goal,
        metric,
        task_type,
        feature_cols,
        total_iterations: 8,
      });
      onStarted();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      push("bot", "Failed to start: " + msg + "\n\nDrop your CSV again to retry.");
      setStage("drop_csv");
    }
  }

  return (
    <div style={s.page}>
      <div style={s.chatArea}>
        {messages.map((m, i) => (
          <div key={i} style={m.role === "bot" ? s.botRow : s.userRow}>
            <div style={m.role === "bot" ? s.botBubble : s.userBubble}>
              {m.text.split("\n").map((line, j, arr) => (
                <span key={j}>
                  {line}
                  {j < arr.length - 1 && <br />}
                </span>
              ))}
            </div>
          </div>
        ))}

        {stage === "pick_target" && columns.length > 0 && (
          <div style={s.chipsRow}>
            {columns.map((col) => (
              <button key={col} style={s.chip} onClick={() => selectTarget(col)}>
                {col}
              </button>
            ))}
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {stage === "drop_csv" && (
        <div
          style={{ ...s.dropZone, ...(dragging ? s.dropZoneActive : {}) }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <span style={s.dropIcon}>⬆</span>
          <span style={s.dropText}>
            {dragging ? "Release to upload" : "Drop CSV here or click to browse"}
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {(stage === "pick_target" || stage === "describe_goal") && (
        <div style={s.inputRow}>
          <input
            style={s.textInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder={
              stage === "pick_target"
                ? "Type or click a column above..."
                : "Describe the task..."
            }
            autoFocus
          />
          <button style={s.sendBtn} onClick={handleSend}>
            Send
          </button>
        </div>
      )}

      {stage === "starting" && (
        <div style={s.startingBar}>Setting up experiment...</div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#0f0f0f",
    color: "#fff",
  },
  chatArea: {
    flex: 1,
    overflowY: "auto",
    padding: "1.5rem 1rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.75rem",
    maxWidth: "720px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  botRow: { display: "flex", justifyContent: "flex-start" },
  userRow: { display: "flex", justifyContent: "flex-end" },
  botBubble: {
    backgroundColor: "#1e1e1e",
    border: "1px solid #2a2a2a",
    borderRadius: "12px 12px 12px 2px",
    padding: "0.65rem 1rem",
    maxWidth: "80%",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    color: "#e5e5e5",
  },
  userBubble: {
    backgroundColor: "#2563eb",
    borderRadius: "12px 12px 2px 12px",
    padding: "0.65rem 1rem",
    maxWidth: "80%",
    fontSize: "0.9rem",
    lineHeight: "1.5",
    color: "#fff",
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "0.5rem",
    paddingLeft: "0.25rem",
  },
  chip: {
    backgroundColor: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "999px",
    padding: "0.3rem 0.75rem",
    color: "#ccc",
    fontSize: "0.8rem",
    cursor: "pointer",
  },
  dropZone: {
    margin: "0 auto 1.5rem",
    width: "calc(100% - 2rem)",
    maxWidth: "720px",
    border: "2px dashed #2a2a2a",
    borderRadius: "8px",
    padding: "1.5rem",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "0.5rem",
    cursor: "pointer",
    transition: "border-color 0.15s, background-color 0.15s",
    boxSizing: "border-box",
  },
  dropZoneActive: {
    borderColor: "#2563eb",
    backgroundColor: "#0d1a33",
  },
  dropIcon: { fontSize: "1.5rem", color: "#444" },
  dropText: { fontSize: "0.875rem", color: "#555" },
  inputRow: {
    display: "flex",
    gap: "0.5rem",
    padding: "0.75rem 1rem",
    borderTop: "1px solid #1e1e1e",
    maxWidth: "720px",
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },
  textInput: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "6px",
    padding: "0.65rem 0.9rem",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
  },
  sendBtn: {
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    padding: "0.65rem 1.25rem",
    fontSize: "0.9rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  startingBar: {
    textAlign: "center",
    padding: "1rem",
    color: "#555",
    fontSize: "0.875rem",
    borderTop: "1px solid #1e1e1e",
  },
};
