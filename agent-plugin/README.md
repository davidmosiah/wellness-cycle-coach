# Cycle Coach — Agent Plugins package

Portable [Agent Plugins](https://agent-plugins.org/) v1 package for
[Hermes Agent](https://github.com/NousResearch/hermes-agent) and other Agent Plugins clients:
the `cycle-coach` MCP server (`wellness-cycle-coach@0.4.3` over stdio) plus the `wellness-cycle-coach` workflow skill.

## Install (Hermes Agent)

```bash
hermes plugins install davidmosiah/wellness-cycle-coach/agent-plugin --no-enable
hermes plugins enable wellness-cycle-coach
```

Requires Node.js 20+ (`npx` on PATH). The skill loads as `wellness-cycle-coach:wellness-cycle-coach`.

## Disclosure

Runs the `wellness-cycle-coach@0.4.3` npm package locally over stdio through `npx` (Node.js 20+ required); the package is downloaded from npm on first start. Data source: no network service and no storage: every call computes from period start dates passed in the arguments. Tools that change state: cycle_profile_update (local preferences only). Estimates are statistical and must not be used for contraception or fertility decisions. Cycle history is sensitive: ask before pulling it from another connector and do not repeat dates unnecessarily. The tool set comes from the pinned npm version, not from this repository's source tree.
