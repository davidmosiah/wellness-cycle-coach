---
name: wellness-cycle-coach
description: >-
  Estimate menstrual cycle phase, next period and phase-aware training, nutrition and hydration guidance with the stateless cycle-coach MCP server. Use when the user asks which cycle phase they are in, when the next period is likely, whether their cycle looks irregular, or how to adapt training or food to their cycle. Not for contraception or fertility decisions.
---

# Cycle Coach

MCP server `cycle-coach` from the `wellness-cycle-coach@0.4.3` npm package, run locally through `npx`. It reads current cycle phase and day, next-period estimate, irregularity check, and phase-aware training, nutrition and hydration guidance. Data source: no network service and no storage: every call computes from period start dates passed in the arguments.

## Workflow

1. Start with `cycle_demo`. Then pick what fits the question: `cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_full_report`.
2. Lead with the answer to the user's question and keep supporting detail short.

## Setup (the user runs this in a terminal, not in chat)

No setup. The connector is stateless: gather period start dates from the user or from the apple-health-mcp, garmin-mcp or fitbit-mcp plugins and pass them in each call.

## Safety

- Tools that change local state: cycle_profile_update (local preferences only). Use them only when the user asks.
- Estimates are statistical and must not be used for contraception or fertility decisions.
- Cycle history is sensitive: ask before pulling it from another connector and do not repeat dates unnecessarily.
- Not medical advice: the data supports personal reflection and planning, not diagnosis or treatment. Point the user to a clinician for symptoms, medication or anything urgent.
