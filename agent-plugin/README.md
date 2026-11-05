# Cycle Coach — Agent Plugins package

Portable [Agent Plugins](https://agent-plugins.org/) v1 package for
[Hermes Agent](https://github.com/NousResearch/hermes-agent) and other Agent Plugins clients:
the `cycle-coach` MCP server (`wellness-cycle-coach@0.5.0` over stdio) plus the `wellness-cycle-coach` workflow skill.

## Install (Hermes Agent)

```bash
hermes plugins install davidmosiah/wellness-cycle-coach/agent-plugin --no-enable
hermes plugins enable wellness-cycle-coach
```

Requires Node.js 20+ (`npx` on PATH). The skill loads as `wellness-cycle-coach:wellness-cycle-coach`.

## Updating an existing plugin

The plugin pins runtime 0.5.0; existing installations are not updated automatically. Update the installed plugin explicitly and restart the connector. Node.js 20+, the stdio launch and its working directory are unchanged.

Profiles must pass field validation, fit within 256 KiB of UTF-8 JSON and use regular files; symbolic links, including dangling links and legacy profile paths, are rejected. Invalid or oversized existing profiles require explicit correction/restoration rather than a reset to defaults. The shared profile lock coordinates only participating writers: older connectors and external editors do not honor it. Never remove a lock while a writer may be active. Follow the [profile storage and recovery guidance](https://github.com/davidmosiah/wellness-cycle-coach/blob/main/docs/profile-storage.md); do not bypass these checks.

MCP tool inputs have a 10,000-element budget. The [release migration notes](https://github.com/davidmosiah/wellness-cycle-coach/blob/main/CHANGELOG.md) also describe HTTP restrictions (loopback only, 1 MiB bodies, no compression); this plugin uses stdio, so those HTTP restrictions do not change its launch.

Cycle calculations require real YYYY-MM-DD calendar dates. Phase computation and its consumers reject history after the reference date, using UTC calendar semantics; next-period prediction validates calendar dates without that future-history check.

## Disclosure

Runs the `wellness-cycle-coach@0.5.0` npm package locally over stdio through `npx` (Node.js 20+ required); the package is downloaded from npm on first start. Data source: no network service; cycle history is supplied per call and is not stored. Profile preferences are persisted locally in the shared Delx Wellness profile. Tools that change state: cycle_profile_update (local preferences only). Estimates are statistical and must not be used for contraception or fertility decisions. Cycle history is sensitive: ask before pulling it from another connector and do not repeat dates unnecessarily. The tool set comes from the pinned npm version, not from this repository's source tree.
