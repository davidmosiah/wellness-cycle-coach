# Security Policy

## Reporting

Email **mosiahdavid@gmail.com** with details and reproduction. Do not open a public issue for security findings.

## Scope

This is a stateless MCP — no data persistence, no outbound calls. The relevant security surfaces are:

- HTTP transport (`--http`) bound to `127.0.0.1` by default with CORS.
- Tool argument validation (zod schemas).

If you find ways to leak the period history passed in tool args, or unintended outbound calls, please report.

## Privacy is the security story

The most valuable contribution is keeping this MCP genuinely stateless. Any change that introduces cycle-data persistence must be opt-in, encrypted, and clearly disclosed. PRs that add cloud telemetry will not be accepted.
