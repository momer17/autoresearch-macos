import type { StatusResponse } from "./api";

export const mockStatus: StatusResponse = {
  status: "running",
  baseline: 0.9979,
  best_score: 0.9612,
  current_iteration: 5,
  total_iterations: 10,
  research_summary:
    "Research indicates that transformer-based language models benefit significantly from improved attention mechanisms and learning rate scheduling. Key findings: (1) Cosine annealing with warm restarts outperforms flat LR schedules on short training budgets. (2) Rotary positional embeddings (RoPE) improve generalisation over learned embeddings. (3) Increasing depth over width tends to be more parameter-efficient at this scale.",
  iterations: [
    {
      iteration: 1,
      score: 0.9979,
      best_score: 0.9979,
      strategy: "Baseline — no changes, establishing reference score.",
      kept: true,
      duration_s: 312.4,
    },
    {
      iteration: 2,
      score: 0.9843,
      best_score: 0.9843,
      strategy: "Increase learning rate from 3e-4 to 6e-4 with cosine decay.",
      kept: true,
      duration_s: 308.1,
    },
    {
      iteration: 3,
      score: 1.0102,
      best_score: 0.9843,
      strategy: "Switch activation from GELU to SwiGLU.",
      kept: false,
      duration_s: 311.7,
    },
    {
      iteration: 4,
      score: 0.9721,
      best_score: 0.9721,
      strategy: "Add cosine warm-up over first 100 steps, keep LR at 6e-4.",
      kept: true,
      duration_s: 309.9,
    },
    {
      iteration: 5,
      score: 0.9612,
      best_score: 0.9612,
      strategy: "Replace learned positional embeddings with RoPE.",
      kept: true,
      duration_s: 315.2,
    },
  ],
};
