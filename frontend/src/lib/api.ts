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
  status: "idle" | "setting_up" | "running_baseline" | "running" | "complete" | "stopped" | "error";
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
  stop_requested: boolean;
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

export interface StopResponse {
  status: string;
  experiment_id?: string | null;
  message: string;
}

// --- Metric helpers ---

const LOWER_IS_BETTER = new Set(["rmse", "mae", "mse", "log_loss", "logloss", "error", "mean_squared_error", "mean_absolute_error", "root_mean_squared_error"]);

export function isLowerBetter(metric: string): boolean {
  return LOWER_IS_BETTER.has(metric.toLowerCase().replace(/ /g, "_"));
}

/** Returns improvement in the direction that means "better" for the metric. Always >= 0 when there is improvement. */
export function calcImprovement(baseline: number, best: number, metric: string): number {
  return isLowerBetter(metric) ? baseline - best : best - baseline;
}

export function calcImprovementPct(baseline: number, best: number, metric: string): number | null {
  if (baseline === 0) return null;
  return (calcImprovement(baseline, best, metric) / Math.abs(baseline)) * 100;
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

export async function postStop(): Promise<StopResponse> {
  const res = await fetch(`${API_BASE_URL}/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to stop: ${res.status} ${text}`);
  }
  return res.json();
}
