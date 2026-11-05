---
name: wellness-cycle-coach
description: >-
  Estimate menstrual cycle phase, next period and phase-aware training, nutrition and hydration guidance with the stateless cycle-coach MCP server. Use when the user asks which cycle phase they are in, when the next period is likely, whether their cycle looks irregular, or how to adapt training or food to their cycle. Not for contraception or fertility decisions.
---

# Cycle Coach

MCP server `cycle-coach` from the `wellness-cycle-coach@0.5.0` npm package, run locally through `npx`. It reads current cycle phase and day, next-period estimate, irregularity check, and phase-aware training, nutrition and hydration guidance. Data source: no network service; cycle history is supplied per call and is not stored. Profile preferences are persisted locally in the shared Delx Wellness profile.

## Workflow

1. Start with `cycle_demo`. Then pick what fits the question: `cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_full_report`.
2. Lead with the answer to the user's question and keep supporting detail short.

## Setup (the user runs this in a terminal, not in chat)

No provider setup. Cycle calculations use the period start dates supplied in each call; they do not store cycle history. Profile preferences are persisted locally. Gather period start dates from the user or, with permission, from the apple-health-mcp, garmin-mcp or fitbit-mcp plugins.

## Existing installations

After a plugin update, existing profiles may need attention: field validation, a 256 KiB JSON limit and rejection of symbolic-link profile paths now apply. Older profile writers do not honor the cooperative lock. Do not reset user data or remove an active lock to work around an error; consult the [profile storage and recovery guidance](https://github.com/davidmosiah/wellness-cycle-coach/blob/main/docs/profile-storage.md) and [release migration notes](https://github.com/davidmosiah/wellness-cycle-coach/blob/main/CHANGELOG.md). Keep MCP inputs within the 10,000-element budget.

Use real YYYY-MM-DD dates. Phase calculations use UTC calendar dates and reject history after the reference date.

## Safety

- Tools that change local state: cycle_profile_update (local preferences only). Use them only when the user asks.
- Estimates are statistical and must not be used for contraception or fertility decisions.
- Cycle history is sensitive: ask before pulling it from another connector and do not repeat dates unnecessarily.
- Not medical advice: the data supports personal reflection and planning, not diagnosis or treatment. Point the user to a clinician for symptoms, medication or anything urgent.
