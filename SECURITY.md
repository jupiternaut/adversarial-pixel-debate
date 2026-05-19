# Security Policy

This project runs local commands through the official Codex CLI. Treat local credentials and generated logs as sensitive.

## Supported Scope

Security reports should focus on this repository's source code, Electron packaging, WebSocket server, local file handling, and Codex CLI invocation layer.

## Credential Boundary

The app must not:

- read `~/.codex/auth.json`;
- ask users to paste OAuth tokens;
- write `OPENAI_API_KEY` automatically;
- silently fall back to another paid AI provider.

The expected authentication flow is the official Codex CLI login flow.

## Reporting

Open a private security advisory or contact the maintainer before publishing exploit details. Include the affected version, reproduction steps, and expected impact.
