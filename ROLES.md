# Hackathon Roles & Quick Start

## Roles

| Person | Role | Owns |
|--------|------|------|
| Omer | Engine | `backend/api.py`, `backend/orchestrator.py`, `backend/evaluate.py`, GPU machine |
| Person 2 | Agents | `agents/setup/`, `agents/loop/`, `agents/prompts/` |
| Person 3 | Frontend | `frontend/` |

---

## Omer — Engine

Owns the backend and the GPU. Your job is to make the loop run.

**Morning (before 9am):**
```bash
# SSH into the GPU
ssh -p <port> root@<ip>

# Run setup script
bash setup_gpu.sh

# Start the server
cd autoresearch-macos
uvicorn backend.api:app --host 0.0.0.0 --port 8080
```

Share the GPU IP with teammates by 12pm — hard deadline.

**What you build:**
- `backend/api.py` — two endpoints: `POST /start` and `GET /status`
- `backend/orchestrator.py` — calls setup agents once, then loops: get strategy → write model → train → evaluate → keep or discard
- `backend/evaluate.py` — runs `train.py` as a subprocess, captures `val_bpb` score

---

## Person 2 — Agents

Owns all the Claude calls.Crchestrator imports your functions directly — match the signatures exactly.

**Setup (before 9am):**
```bash
git clone https://github.com/momer17/autoresearch-macos.git
cd autoresearch-macos
pip install -r requirements.txt
cp .env.example .env
# add ANTHROPIC_API_KEY to .env
```

**What you build:**

```python
# agents/setup/research_agent.py
def run_research(config: dict, task_description: str) -> str:
    """Returns markdown string of research findings."""

# agents/setup/program_generator.py
def generate_program(config: dict, research: str, task_description: str) -> str:
    """Returns program.md content as string."""

# agents/setup/baseline_generator.py
def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content as string."""

# agents/loop/strategist.py
def get_strategy(model_code: str, program_md: str, research_md: str, history: list) -> str:
    """Returns plain English strategy string."""

# agents/loop/coder.py
def write_model(strategy: str, current_model_code: str) -> str:
    """Returns complete new model.py content as string."""
```

**Calling Claude :**
```python
import anthropic, os
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=2048,
    system="your system prompt",
    messages=[{"role": "user", "content": "your user prompt"}]
)
result = response.content[0].text.strip()
```

**Models to use:**
| Agent | Model |
|-------|-------|
| research_agent | claude-haiku-4-5 |
| program_generator | claude-haiku-4-5 |
| baseline_generator | claude-sonnet-4-6 |
| strategist | claude-opus-4-6 |
| coder | claude-sonnet-4-6 |

---

## Person 3 — Frontend

Owns the UI. It polls `/status` every 3 seconds and displays progress.

**Setup (before 9am):**
```bash
git clone https://github.com/momer17/autoresearch-macos.git
cd autoresearch-macos/frontend
# use whatever framework you want
```

**Use mock data until Omer shares the GPU IP.** The only file that needs the IP is wherever you define your API base URL.

**`GET /status` response shape to build against:**
```json
{
  "status": "running",
  "baseline": 0.71,
  "best_score": 0.84,
  "current_iteration": 3,
  "total_iterations": 8,
  "research_summary": "string",
  "iterations": [
    {
      "iteration": 1,
      "score": 0.74,
      "best_score": 0.74,
      "strategy": "string shown in UI",
      "kept": true,
      "duration_s": 18.4
    }
  ]
}
```

**`POST /start` request shape:**
```json
{
  "target_col": "isFraud",
  "task_description": "Detect fraudulent transactions",
  "csv_path": "/path/to/data.csv"
}
```
