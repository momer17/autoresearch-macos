import { useState } from "react";
import { postStart } from "../lib/api";
import type { StartRequest } from "../lib/api";

interface Props {
  onStarted: () => void;
}

export default function StartPage({ onStarted }: Props) {
  const [form, setForm] = useState<StartRequest>({
    target_col: "",
    task_description: "",
    csv_path: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await postStart(form);
      onStarted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>autoresearch</h1>
        <p style={styles.subtitle}>Autonomous ML optimisation</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>
            Target column
            <input
              name="target_col"
              value={form.target_col}
              onChange={handleChange}
              placeholder="e.g. isFraud"
              required
              style={styles.input}
            />
          </label>

          <label style={styles.label}>
            Task description
            <textarea
              name="task_description"
              value={form.task_description}
              onChange={handleChange}
              placeholder="e.g. Detect fraudulent transactions in payment data"
              required
              rows={3}
              style={{ ...styles.input, resize: "vertical" }}
            />
          </label>

          <label style={styles.label}>
            CSV path (on GPU machine)
            <input
              name="csv_path"
              value={form.csv_path}
              onChange={handleChange}
              placeholder="e.g. /data/samples/fraud.csv"
              required
              style={styles.input}
            />
          </label>

          {error && <p style={styles.error}>{error}</p>}

          <button type="submit" disabled={loading} style={loading ? styles.buttonDisabled : styles.button}>
            {loading ? "Starting…" : "Start experiment"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0f0f0f",
    padding: "2rem",
  },
  card: {
    width: "100%",
    maxWidth: "480px",
    backgroundColor: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "8px",
    padding: "2rem",
  },
  title: {
    margin: 0,
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#fff",
  },
  subtitle: {
    margin: "0.25rem 0 1.75rem",
    fontSize: "0.875rem",
    color: "#666",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  label: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
    fontSize: "0.875rem",
    color: "#ccc",
  },
  input: {
    backgroundColor: "#111",
    border: "1px solid #333",
    borderRadius: "4px",
    padding: "0.6rem 0.75rem",
    color: "#fff",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  error: {
    margin: 0,
    padding: "0.6rem 0.75rem",
    backgroundColor: "#2a0a0a",
    border: "1px solid #5a1a1a",
    borderRadius: "4px",
    color: "#f87171",
    fontSize: "0.85rem",
  },
  button: {
    padding: "0.7rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "pointer",
  },
  buttonDisabled: {
    padding: "0.7rem",
    backgroundColor: "#1e3a6e",
    color: "#6b7280",
    border: "none",
    borderRadius: "4px",
    fontSize: "0.95rem",
    fontWeight: 600,
    cursor: "not-allowed",
  },
};
