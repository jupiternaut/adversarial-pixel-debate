# OpenEvolve Sandbox

This folder adapts OpenEvolve to the app's iteration-control problem. It does not give OpenEvolve write access to production source files.

## Safe Evaluation

```bash
npm run iterate:evolve:eval
```

This loads `initial_program.py`, calls `build_iteration_plan()`, and scores the candidate plan with `evaluator.py`.

## Real Evolution

```bash
npm run iterate:evolve:ui
```

This command uses the local OpenEvolve checkout at `/Users/gengrf/AlphaEvolve/repos/openevolve-community`. It requires an OpenAI-compatible API key or compatible local endpoint configured in `config.yaml`.

The output should be treated as a proposal. Apply any winning candidate through a new OpenSpec change, then run `npm run iterate:gate`.
