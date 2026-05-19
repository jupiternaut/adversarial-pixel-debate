"""Seed candidate for Adversarial Pixel Debate iteration planning.

OpenEvolve can mutate this file to propose better version-control loops.
The evaluator scores the returned plan; it must not edit app source files.
"""


def build_iteration_plan():
    return {
        "version_goal": "Improve one visible product quality dimension per iteration.",
        "openspec_gate": [
            "Create or update proposal, design, specs, and tasks before implementation.",
            "Mark tasks complete only after code and verification evidence exist.",
            "Reject accepted ledger records when the OpenSpec change is incomplete.",
        ],
        "chatdev_roles": [
            "Product Lead",
            "Architect",
            "Interaction Designer",
            "Programmer",
            "Tester",
            "Reviewer",
        ],
        "candidate_limits": {
            "production_mutation": "forbidden",
            "allowed_outputs": ["proposal text", "score suggestions", "risk notes"],
            "max_files_touched_after_acceptance": 6,
        },
        "ui_quality_moves": [
            "Increase pixel-office object density only when it improves state readability.",
            "Keep operational controls in a modern desktop shell.",
            "Use screenshot evidence for layout regressions.",
        ],
        "verification_steps": [
            "npm run iterate:scan",
            "npm run iterate:score",
            "npm test",
            "npm run build",
        ],
        "ledger_fields": ["id", "status", "summary", "openspecChange", "score", "evidence"],
    }


if __name__ == "__main__":
    import json

    print(json.dumps(build_iteration_plan(), ensure_ascii=False, indent=2))
