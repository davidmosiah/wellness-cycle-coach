import { CYCLE_PHASES, UPSTREAM_CONNECTORS } from "../constants.js";

export interface CycleCoachCapabilities {
  phases: ReadonlyArray<string>;
  upstream_connectors: ReadonlyArray<string>;
  metrics: ReadonlyArray<string>;
  privacy_modes: ReadonlyArray<"summary" | "structured" | "raw">;
  notes: string[];
}

export function buildCapabilities(): CycleCoachCapabilities {
  return {
    phases: CYCLE_PHASES,
    upstream_connectors: UPSTREAM_CONNECTORS,
    metrics: [
      "current_phase",
      "cycle_day",
      "cycle_length",
      "next_period_estimate",
      "phase_nutrition",
      "phase_training",
      "phase_hydration_ml",
    ],
    privacy_modes: ["summary", "structured", "raw"] as const,
    notes: [
      "All cycle data must be passed in by the agent (or fetched separately from apple-health-mcp / garminmcp / fitbitmcp).",
      "This coach NEVER stores cycle data itself. It is a stateless orchestration layer.",
      "Phase estimates use a rolling-average cycle length; confidence rises with more period history.",
      "Recommendations are evidence-informed defaults — every body is different. Personalize over time.",
    ],
  };
}
