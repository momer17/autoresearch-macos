"""
End-to-end local test of the full agent pipeline.

Runs each agent in sequence and prints its output so you can verify
each stage before committing.

Usage:
    source venv/bin/activate
    python test.py
"""

from dotenv import load_dotenv
load_dotenv()

import textwrap

CSV_PATH = "data/uploads/54d3207a.csv"
TASK = "Predict whether a customer will churn"

config = {
    "task_type": "binary_classification",
    "metric": "f1",
    "target_col": "Churn",
    "feature_cols": [
        "gender", "SeniorCitizen", "Partner", "Dependents", "tenure",
        "PhoneService", "MultipleLines", "InternetService", "OnlineSecurity",
        "OnlineBackup", "DeviceProtection", "TechSupport", "StreamingTV",
        "StreamingMovies", "Contract", "PaperlessBilling", "PaymentMethod",
        "MonthlyCharges", "TotalCharges",
    ],
    "csv_path": CSV_PATH,
}


def section(title: str):
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print('=' * 60)


# ---------------------------------------------------------------------------
# 1. Research agent
# ---------------------------------------------------------------------------
section("STEP 1: research_agent — run_research()")

from agents.setup.research_agent import run_research
research = run_research(config, TASK)
print(research)


# ---------------------------------------------------------------------------
# 2. Program generator
# ---------------------------------------------------------------------------
section("STEP 2: program_generator — generate_program()")

from agents.setup.program_generator import generate_program
program = generate_program(config, research, TASK)
print(program)


# ---------------------------------------------------------------------------
# 3. Baseline generator
# ---------------------------------------------------------------------------
section("STEP 3: baseline_generator — generate_baseline()")

from agents.setup.baseline_generator import generate_baseline
baseline_code = generate_baseline(config, TASK)
print(baseline_code)


# ---------------------------------------------------------------------------
# 4. Strategist
# ---------------------------------------------------------------------------
section("STEP 4: strategist — get_strategy()")

from agents.loop.strategist import get_strategy
strategy = get_strategy(
    model_code=baseline_code,
    program_md=program,
    research_md=research,
    history=[],
    config=config,
)
print(strategy)


# ---------------------------------------------------------------------------
# 5. Coder
# ---------------------------------------------------------------------------
section("STEP 5: coder — write_model()")

from agents.loop.coder import write_model
new_code = write_model(strategy, baseline_code, config)
print(new_code)
