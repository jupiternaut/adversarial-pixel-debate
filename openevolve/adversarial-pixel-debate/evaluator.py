"""OpenEvolve evaluator for iteration-control candidate plans."""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

try:
    from openevolve.evaluation_result import EvaluationResult
except Exception:  # pragma: no cover - keeps direct local evaluation usable.
    EvaluationResult = None


REQUIRED_ROLES = {
    "Product Lead",
    "Architect",
    "Interaction Designer",
    "Programmer",
    "Tester",
    "Reviewer",
}

REQUIRED_STEPS = {
    "npm run iterate:scan",
    "npm run iterate:score",
    "npm test",
    "npm run build",
}


def _load_plan(program_path: str):
    spec = importlib.util.spec_from_file_location("candidate_plan", program_path)
    module = importlib.util.module_from_spec(spec)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Cannot load candidate: {program_path}")
    spec.loader.exec_module(module)
    if not hasattr(module, "build_iteration_plan"):
        raise RuntimeError("Candidate must define build_iteration_plan()")
    plan = module.build_iteration_plan()
    if not isinstance(plan, dict):
        raise RuntimeError("build_iteration_plan() must return a dict")
    return plan


def _score_list(items, expected):
    values = {str(item) for item in items or []}
    return len(values.intersection(expected)) / max(1, len(expected))


def evaluate(program_path: str):
    try:
        plan = _load_plan(program_path)
        plan_text = json.dumps(plan, ensure_ascii=False)

        role_score = _score_list(plan.get("chatdev_roles"), REQUIRED_ROLES)
        verification_score = _score_list(plan.get("verification_steps"), REQUIRED_STEPS)
        openspec_score = min(1.0, plan_text.lower().count("openspec") / 3)
        ledger_score = min(1.0, len(plan.get("ledger_fields") or []) / 6)
        ui_score = min(1.0, len(plan.get("ui_quality_moves") or []) / 3)

        mutation_policy = json.dumps(plan.get("candidate_limits", {}), ensure_ascii=False).lower()
        safety_score = 1.0 if "forbidden" in mutation_policy and "production_mutation" in mutation_policy else 0.35
        complexity_penalty = max(0.0, (len(plan_text) - 4500) / 4500)

        combined_score = max(
            0.0,
            (
                role_score * 0.16
                + verification_score * 0.2
                + openspec_score * 0.2
                + ledger_score * 0.14
                + ui_score * 0.1
                + safety_score * 0.2
            )
            - complexity_penalty * 0.1,
        )

        metrics = {
            "combined_score": combined_score,
            "role_score": role_score,
            "verification_score": verification_score,
            "openspec_score": openspec_score,
            "ledger_score": ledger_score,
            "ui_score": ui_score,
            "safety_score": safety_score,
            "complexity": min(1.0, len(plan_text) / 4500),
        }
        artifacts = {
            "summary": plan.get("version_goal", ""),
            "missing_roles": sorted(REQUIRED_ROLES.difference(set(plan.get("chatdev_roles") or []))),
            "missing_steps": sorted(REQUIRED_STEPS.difference(set(plan.get("verification_steps") or []))),
        }
    except Exception as error:
        metrics = {
            "combined_score": 0.0,
            "role_score": 0.0,
            "verification_score": 0.0,
            "openspec_score": 0.0,
            "ledger_score": 0.0,
            "ui_score": 0.0,
            "safety_score": 0.0,
            "complexity": 0.0,
        }
        artifacts = {"error": str(error)}

    if EvaluationResult is not None:
        return EvaluationResult(metrics=metrics, artifacts=artifacts)
    return {"metrics": metrics, "artifacts": artifacts}


if __name__ == "__main__":
    candidate = sys.argv[1] if len(sys.argv) > 1 else str(Path(__file__).with_name("initial_program.py"))
    result = evaluate(candidate)
    if hasattr(result, "metrics"):
        payload = {"metrics": result.metrics, "artifacts": result.artifacts}
    else:
        payload = result
    print(json.dumps(payload, ensure_ascii=False, indent=2))
