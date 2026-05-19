# Contributing

Adversarial Pixel Debate is a local-first desktop app. Contributions should keep the project easy to inspect, safe to run, and visually original.

## Development

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm test
npm run build
npm run dist:mac
```

## Ground Rules

- Do not copy closed-source app code, PixelHQ assets, paid packs, or third-party sprite sheets into this repo.
- Do not read, copy, or commit `~/.codex/auth.json`, API keys, OAuth tokens, or local app logs containing credentials.
- Keep the Codex path OAuth-safe: call the official `codex` CLI and let it use the user's existing login state.
- Put new visual assets through `scripts/generate-war-room-assets.mjs` and `asset-manifest.json`.
- Keep UI changes dense and desktop-tool oriented. Avoid marketing-page patterns.

## Pull Request Checklist

- The change has a narrow purpose.
- `npm test` passes.
- `npm run build` passes.
- New assets are deterministic and listed in the manifest.
- Screenshots or notes are included for visible UI changes.
