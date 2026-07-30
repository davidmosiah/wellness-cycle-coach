import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { buildAgentManifest } from "../services/agent-manifest.js";
import { buildCapabilities } from "../services/capabilities.js";
import { buildPrivacyAudit } from "../services/privacy-audit.js";
import { CYCLE_PHASES, UPSTREAM_CONNECTORS } from "../constants.js";

function jsonResource(uri: URL, data: unknown) {
  return {
    contents: [
      {
        uri: uri.toString(),
        mimeType: "application/json",
        text: JSON.stringify(data, null, 2),
      },
    ],
  };
}

export function registerCycleResources(server: McpServer): void {
  server.registerResource(
    "cycle_agent_manifest",
    "wellness-cycle-coach://agent-manifest",
    {
      title: "Cycle Agent Manifest",
      description: "Machine-readable install and operating instructions for AI agents.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, buildAgentManifest("generic")),
  );

  server.registerResource(
    "cycle_capabilities",
    "wellness-cycle-coach://capabilities",
    {
      title: "Cycle Capabilities",
      description: "Supported phases, upstream connectors, and privacy modes.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, buildCapabilities()),
  );

  server.registerResource(
    "cycle_connection_status",
    "wellness-cycle-coach://connection-status",
    {
      title: "Cycle Connection Status",
      description: "Coach readiness (stateless; history passed in tool args).",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonResource(uri, {
        ok: true,
        stateless: true,
        upstream_connectors: UPSTREAM_CONNECTORS,
        note: "wellness-cycle-coach orchestrates cycle math; period start dates must be passed in tool calls.",
      }),
  );

  server.registerResource(
    "cycle_data_inventory",
    "wellness-cycle-coach://inventory",
    {
      title: "Cycle Data Inventory",
      description: "Phase taxonomy and metric catalog.",
      mimeType: "application/json",
    },
    async (uri) =>
      jsonResource(uri, {
        phases: CYCLE_PHASES,
        metrics: ["current_phase", "cycle_day", "cycle_length", "next_period_estimate"],
        recommendations: ["nutrition", "training", "hydration_ml"],
        privacy_modes: ["summary", "structured", "raw"],
      }),
  );

  server.registerResource(
    "cycle_privacy_audit",
    "wellness-cycle-coach://privacy-audit",
    {
      title: "Cycle Privacy Audit",
      description: "What wellness-cycle-coach stores (none) and agent handling rules.",
      mimeType: "application/json",
    },
    async (uri) => jsonResource(uri, buildPrivacyAudit()),
  );
}
