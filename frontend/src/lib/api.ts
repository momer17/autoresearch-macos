export const API_BASE_URL = "http://localhost:8080";

// --- Types ---

export interface Iteration {
  iteration: number;
  score: number;
  best_score: number;
  strategy: string;
  kept: boolean;
  duration_s: number;
}

export interface StatusResponse {
  status: "running" | "complete" | "error";
  baseline: number;
  best_score: number;
  current_iteration: number;
  total_iterations: number;
  research_summary: string;
  iterations: Iteration[];
}

export interface StartRequest {
  target_col: string;
  task_description: string;
  csv_path: string;
}

// --- API calls ---

export async function postStart(payload: StartRequest): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start: ${res.status} ${text}`);
  }
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE_URL}/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch status: ${res.status}`);
  }
  return res.json();
}
