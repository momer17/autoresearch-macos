# autoresearch

Autonomous ML optimisation system. An agent loop that iteratively improves a machine learning model on any CSV dataset, guided by scientific research and a user-defined goal.

---

## Team

| Person | Role | Owns |
|--------|------|------|
| Omer | Engine | evaluate.py, api.py, orchestrator.py, GPU machine |
| Person 2 | Agents | agents/setup/*, agents/loop/*, agents/prompts/* |
| Person 3 | Frontend | frontend/ |

---

## Setup

### 1. Clone and install

```bash
git clone <repo-url>
cd autoresearch
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Authenticate with GCP

```bash
gcloud auth application-default login
```


### 3. Set environment variables

```bash
cp .env.example .env
# Fill in your ANTHROPIC_VERTEX_PROJECT_ID and TAVILY_API_KEY
```

### 4. Verify Claude access

Run to confirm Vertex AI is working:

```python
python -c "
from anthropic import AnthropicVertex
import os
client = AnthropicVertex(project_id=os.getenv('ANTHROPIC_VERTEX_PROJECT_ID'), region='us-east5')
r = client.messages.create(model='claude-sonnet-4-6', max_tokens=20, messages=[{'role':'user','content':'ping'}])
print('OK:', r.content[0].text)
"
```

---

## Interface contracts

Implementation requirements for agent functions.

### Setup agents (called once on /start)

```python
# agents/setup/research_agent.py
def run_research(config: dict, task_description: str) -> str:
    """Returns markdown string of research findings."""
    ...

# agents/setup/program_generator.py
def generate_program(config: dict, research: str, task_description: str) -> str:
    """Returns program.md content as string."""
    ...

# agents/setup/baseline_generator.py
def generate_baseline(config: dict, task_description: str) -> str:
    """Returns complete model.py content as string."""
    ...
```

### Loop agents 

```python
# agents/loop/strategist.py
def get_strategy(model_code: str, program_md: str, research_md: str, history: list) -> str:
    """Returns plain English strategy string."""
    ...

# agents/loop/coder.py
def write_model(strategy: str, current_model_code: str) -> str:
    """Returns complete new model.py content as string."""
    ...
```

---

## Config shape

```json
{
  "experiment_id": "abc123",
  "target_col": "isFraud",
  "feature_cols": ["V1", "V2", "..."],
  "metric": "f1",
  "task_description": "Detect fraudulent transactions..."
}
```

---

## GET /status response shape

```json
{
  "status": "running | complete | error",
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

---

## Models in use

| Agent | Model | Why |
|-------|-------|-----|
| Research agent | claude-haiku-4-5-20251001 | Cheap, fast, summarisation |
| Program generator | claude-haiku-4-5-20251001 | Cheap, fast, structured output |
| Baseline generator | claude-sonnet-4-6 | Needs to write genuinely good starting code |
| Strategist | claude-opus-4-6 | Core reasoning — quality matters most here |
| Coder | claude-sonnet-4-6 | Fast, reliable Python, lower cost than Opus |

---

## Calling Claude via Vertex 

```python
from anthropic import AnthropicVertex
import os

client = AnthropicVertex(
    project_id=os.getenv("ANTHROPIC_VERTEX_PROJECT_ID"),
    region=os.getenv("VERTEX_REGION", "us-east5")
)

response = client.messages.create(
    model="claude-opus-4-6",
    max_tokens=2048,
    system="your system prompt",
    messages=[{"role": "user", "content": "your user prompt"}]
)

result = response.content[0].text.strip()
```

---

## Deployment

### GPU machine

```bash
# SSH into instance
# Clone repo, pip install -r requirements.txt
# Copy .env with real values
uvicorn backend.api:app --host 0.0.0.0 --port 8080
```

### Frontend

```bash
cd frontend
# Update lib/api.ts with the GPU machine IP
```

---

## Demo datasets

1. **Fraud detection** — IEEE-CIS or PaySim (Kaggle)
2. **Customer churn** — Telco Customer Churn (Kaggle)
3. **Medical** — Pima Indians Diabetes (UCI)

Place small versions (<5MB) in `data/samples/`.

---

## Repo structure

```
autoresearch/
├── backend/
│   ├── evaluate.py          ← LOCKED - do not modify
│   ├── api.py               ← FastAPI app + /start + /status endpoints
│   └── orchestrator.py      ← Main loop: setup → baseline → iterate
├── agents/
│   ├── setup/
│   │   ├── research_agent.py     ← run_research()
│   │   ├── program_generator.py  ← generate_program()
│   │   └── baseline_generator.py ← generate_baseline()
│   ├── loop/
│   │   ├── strategist.py    ← get_strategy()
│   │   └── coder.py         ← write_model()
│   └── prompts/             ← .txt files for each agent
├── data/samples/            ← demo CSVs (gitignored)
├── experiments/             ← run outputs (gitignored)
├── frontend/                ← Person 3's domain
├── requirements.txt
├── .env.example
└── README.md
```
