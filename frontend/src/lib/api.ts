export const API_BASE_URL = "/api";

// --- Types ---

export interface Iteration {
  iteration: number;
  score: number | null;
  best_score: number;
  strategy: string;
  kept: boolean;
  error: string | null;
}

export interface StatusResponse {
  status: "idle" | "setting_up" | "running_baseline" | "running" | "complete" | "error";
  experiment_id: string | null;
  stage_label: string;
  baseline: number | null;
  best_score: number | null;
  current_iteration: number;
  total_iterations: number;
  // Agent outputs
  research_summary: string;
  program: string;
  baseline_code: string;
  current_strategy: string;
  current_code: string;
  iterations: Iteration[];
  error: string | null;
}

export interface StartRequest {
  file: File;
  target_col: string;
  task_description: string;
  total_iterations?: number;
}

export interface StartResponse {
  experiment_id: string;
  status: string;
  task_type: string;
  metric: string;
}

// --- API calls ---

export async function postStart(payload: StartRequest): Promise<StartResponse> {
  const form = new FormData();
  form.append("file", payload.file);
  form.append("target_col", payload.target_col);
  form.append("task_description", payload.task_description);
  if (payload.total_iterations !== undefined)
    form.append("total_iterations", String(payload.total_iterations));

  const res = await fetch(`${API_BASE_URL}/start`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to start: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getStatus(): Promise<StatusResponse> {
  const res = await fetch(`${API_BASE_URL}/status`);
  if (!res.ok) {
    throw new Error(`Failed to fetch status: ${res.status}`);
  }
  return res.json();
}
