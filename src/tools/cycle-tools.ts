import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  estimatePhase,
  guidanceForPhase,
  estimateAverageCycleLength,
  type CycleHistoryEntry,
} from "../services/cycle-engine.js";
import { buildAgentManifest } from "../services/agent-manifest.js";
import { buildCapabilities } from "../services/capabilities.js";
import { buildPrivacyAudit } from "../services/privacy-audit.js";
import { CYCLE_PHASES, UPSTREAM_CONNECTORS } from "../constants.js";

function jsonResponse(payload: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
    structuredContent: payload as Record<string, unknown>,
  };
}

const HistorySchema = z.array(
  z.object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    length_days: z.number().int().positive().optional(),
  }),
);

export function registerCycleTools(server: McpServer): void {
  server.registerTool(
    "cycle_agent_manifest",
    {
      title: "Cycle agent manifest",
      description:
        "Returns the wellness-cycle-coach agent manifest: tool list, supported clients, env vars, recommended first calls, capabilities, privacy posture, and community links.",
      inputSchema: {
        client: z
          .enum(["claude", "codex", "cursor", "windsurf", "hermes", "openclaw", "generic"])
          .optional(),
      },
    },
    async ({ client }) => jsonResponse(buildAgentManifest(client ?? "generic")),
  );

  server.registerTool(
    "cycle_capabilities",
    {
      title: "Cycle capabilities",
      description: "Lists supported phases, upstream connectors this coach reads from, available metrics, and privacy modes.",
      inputSchema: {},
    },
    async () => jsonResponse(buildCapabilities()),
  );

  server.registerTool(
    "cycle_connection_status",
    {
      title: "Cycle connection status",
      description:
        "Reports the coach is alive and reminds the agent that cycle data must be passed in via tool args (this MCP is stateless).",
      inputSchema: {},
    },
    async () =>
      jsonResponse({
        ok: true,
        stateless: true,
        upstream_connectors: UPSTREAM_CONNECTORS,
        note: "wellness-cycle-coach orchestrates cycle math; period start dates must be passed in tool calls (or fetched separately from apple-health-mcp / garminmcp / fitbitmcp).",
      }),
  );

  server.registerTool(
    "cycle_privacy_audit",
    {
      title: "Cycle privacy audit",
      description: "Returns what wellness-cycle-coach stores locally (none), what it sends out (none), and agent rules for handling cycle data.",
      inputSchema: {},
    },
    async () => jsonResponse(buildPrivacyAudit()),
  );

  server.registerTool(
    "cycle_data_inventory",
    {
      title: "Cycle data inventory",
      description: "Returns the metric catalog and phase taxonomy used by the coach.",
      inputSchema: {},
    },
    async () =>
      jsonResponse({
        phases: CYCLE_PHASES,
        metrics: ["current_phase", "cycle_day", "cycle_length", "next_period_estimate"],
        recommendations: ["nutrition", "training", "hydration_ml"],
      }),
  );

  server.registerTool(
    "cycle_estimate_phase",
    {
      title: "Cycle estimate phase",
      description:
        "Given a list of recent period start dates (from any source), returns the current phase, cycle day, estimated cycle length, next-period date, and confidence.",
      inputSchema: {
        history: HistorySchema.describe(
          "Array of {start_date: 'YYYY-MM-DD', length_days?: number}. Sorted automatically.",
        ),
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Optional reference date; defaults to system today."),
      },
    },
    async ({ history, today }) => {
      const referenceDate = today ? new Date(today + "T12:00:00Z") : new Date();
      const estimate = estimatePhase(history as CycleHistoryEntry[], referenceDate);
      return jsonResponse(estimate);
    },
  );

  server.registerTool(
    "cycle_predict_next_period",
    {
      title: "Cycle predict next period",
      description: "Given period history, returns the average cycle length and the next-expected period start date with confidence.",
      inputSchema: {
        history: HistorySchema,
      },
    },
    async ({ history }) => {
      const cycleLength = estimateAverageCycleLength(history as CycleHistoryEntry[]);
      const sorted = [...(history as CycleHistoryEntry[])].sort((a, b) => a.start_date.localeCompare(b.start_date));
      const lastStart = sorted[sorted.length - 1]?.start_date;
      if (!lastStart) {
        return jsonResponse({ ok: false, error: "no_history", hint: "Pass at least one period start date." });
      }
      const next = new Date(new Date(lastStart).getTime() + cycleLength * 86_400_000)
        .toISOString()
        .slice(0, 10);
      const confidence: "low" | "medium" | "high" =
        history.length >= 6 ? "high" : history.length >= 3 ? "medium" : "low";
      return jsonResponse({ ok: true, cycle_length_days: cycleLength, next_period_estimate: next, confidence });
    },
  );

  server.registerTool(
    "cycle_phase_guidance",
    {
      title: "Cycle phase guidance",
      description: "Returns evidence-informed nutrition + training + hydration recommendations for a given phase.",
      inputSchema: {
        phase: z.enum(CYCLE_PHASES),
      },
    },
    async ({ phase }) => jsonResponse(guidanceForPhase(phase)),
  );

  server.registerTool(
    "cycle_recommend_nutrition",
    {
      title: "Cycle recommend nutrition",
      description:
        "Given period history, returns nutrition recommendations for the user's current phase. Combine with wellness-nourish for full meal planning.",
      inputSchema: {
        history: HistorySchema,
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async ({ history, today }) => {
      const reference = today ? new Date(today + "T12:00:00Z") : new Date();
      const estimate = estimatePhase(history as CycleHistoryEntry[], reference);
      const guidance = guidanceForPhase(estimate.phase);
      return jsonResponse({
        phase: estimate.phase,
        cycle_day: estimate.cycle_day,
        confidence: estimate.confidence,
        nutrition: guidance.nutrition,
        notes: guidance.notes,
      });
    },
  );

  server.registerTool(
    "cycle_recommend_training",
    {
      title: "Cycle recommend training",
      description:
        "Given period history, returns training recommendations for the user's current phase. Pair with WHOOP/Oura/Garmin recovery for late-luteal load adjustments.",
      inputSchema: {
        history: HistorySchema,
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async ({ history, today }) => {
      const reference = today ? new Date(today + "T12:00:00Z") : new Date();
      const estimate = estimatePhase(history as CycleHistoryEntry[], reference);
      const guidance = guidanceForPhase(estimate.phase);
      return jsonResponse({
        phase: estimate.phase,
        cycle_day: estimate.cycle_day,
        confidence: estimate.confidence,
        training: guidance.training,
        notes: guidance.notes,
      });
    },
  );

  server.registerTool(
    "cycle_full_report",
    {
      title: "Cycle full report",
      description: "Single-call report: phase + nutrition + training + hydration + next-period estimate.",
      inputSchema: {
        history: HistorySchema,
        today: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      },
    },
    async ({ history, today }) => {
      const reference = today ? new Date(today + "T12:00:00Z") : new Date();
      const estimate = estimatePhase(history as CycleHistoryEntry[], reference);
      const guidance = guidanceForPhase(estimate.phase);
      return jsonResponse({
        estimate,
        guidance,
        cross_connector_hints: [
          "Pair nutrition with `wellness-nourish` for meal planning that respects phase emphasis.",
          "Pair training with `whoop-mcp` / `garminmcp` / `ouramcp` recovery for late-luteal load adjustments.",
          "Pair hydration target with `wellness-nourish` hydration tools.",
        ],
      });
    },
  );
}
