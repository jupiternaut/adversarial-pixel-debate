# Open Source Release Checklist

Use this before publishing the repository to GitHub.

## Repository Hygiene

- `package.json` has a public package description and `Apache-2.0` license.
- `LICENSE`, `CONTRIBUTING.md`, `SECURITY.md`, and `.env.example` are present.
- `build/icon.svg` and `build/icon.icns` are present; regenerate with `npm run icon` after icon changes.
- `.gitignore` excludes local build output, logs, environment files, and app artifacts.
- No closed-source app assets, screenshots, binaries, or reverse-engineered resources are committed.

## Verification

```bash
npm test
npm run build
npm run dist:mac
```

For UI changes, also run the browser visual check and keep a screenshot under `.codex/` locally. Do not commit `.codex/`.

## GitHub Setup

Recommended first remote name:

```text
adversarial-pixel-debate
```

Recommended repo topics:

```text
codex, oauth, multi-agent, decision-support, threejs, electron
```

Do not publish a release binary until the app has been tested on a clean macOS user profile.
