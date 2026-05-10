# AGENTS.md — wellness-cycle-coach

## What this is

A stateless MCP server that returns phase-aware menstrual cycle guidance. The agent passes period start dates in via tool arguments. The coach computes phase + recommendations and returns them. Never stores cycle data.

## Source layout

- `src/index.ts` — MCP entry. stdio + Streamable HTTP.
- `src/constants.ts` — Phase enum, defaults (28-day cycle, 14-day luteal, 5-day period).
- `src/services/cycle-engine.ts` — Pure functions: `estimatePhase`, `estimateAverageCycleLength`, `phaseFromDay`, `guidanceForPhase`. Zero IO.
- `src/services/{capabilities,privacy-audit,agent-manifest}.ts` — Standard manifest surfaces.
- `src/tools/cycle-tools.ts` — 11 MCP tools.
- `src/cli/commands.ts` — `doctor`, `setup`, `status`.

## Phase model

- **menstrual**: days 1 → period_length (default 5)
- **follicular**: post-period → ovulation_day - 2
- **ovulatory**: ovulation_day ± 1 (= cycle_length - 14)
- **luteal**: ovulation_day + 2 → next period

## Adding new metrics

If new evidence-based recommendations land, edit `guidanceForPhase()` in `src/services/cycle-engine.ts`. The structure (`emphasize/moderate/avoid`, `style/intensity/notes`) is intentionally simple — keep it that way.

## Safety contract

- Never claim medical accuracy.
- Treat all data as medical-record sensitive.
- Cross-reference recovery scores from WHOOP/Oura/Garmin before recommending late-luteal training intensity.
- Defer to clinician for fertility, pregnancy, or symptom management.
