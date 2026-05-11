import { NPM_PACKAGE_NAME, PINNED_NPM_PACKAGE, SERVER_NAME, SERVER_VERSION } from "../constants.js";
import { buildCapabilities } from "./capabilities.js";
import { buildPrivacyAudit } from "./privacy-audit.js";

export type CycleCoachClient = "claude" | "codex" | "cursor" | "windsurf" | "hermes" | "openclaw" | "generic";

const SUPPORTED_CLIENTS: CycleCoachClient[] = [
  "claude",
  "codex",
  "cursor",
  "windsurf",
  "hermes",
  "openclaw",
  "generic",
];

const TOOLS = [
  "cycle_agent_manifest",
  "cycle_capabilities",
  "cycle_connection_status",
  "cycle_data_inventory",
  "cycle_demo",
  "cycle_estimate_phase",
  "cycle_full_report",
  "cycle_onboarding",
  "cycle_phase_guidance",
  "cycle_predict_next_period",
  "cycle_privacy_audit",
  "cycle_profile_get",
  "cycle_profile_update",
  "cycle_quickstart",
  "cycle_recommend_nutrition",
  "cycle_recommend_training",
] as const;

const RECOMMENDED_FIRST_CALLS = [
  "cycle_profile_get",
  "cycle_quickstart",
  "cycle_full_report",
];

export interface CycleCoachAgentManifest {
  name: string;
  version: string;
  client: string;
  supported_clients: CycleCoachClient[];
  install: { command: string; args: string[]; optional_env: string[] };
  recommended_first_calls: string[];
  tools: ReadonlyArray<string>;
  resources: string[];
  agent_rules: string[];
  community: { repo: string; issues: string; twitter: string; docs: string; invite: string };
  capabilities: ReturnType<typeof buildCapabilities>;
  privacy: ReturnType<typeof buildPrivacyAudit>;
}

export function buildAgentManifest(client: CycleCoachClient = "generic"): CycleCoachAgentManifest {
  return {
    name: SERVER_NAME,
    version: SERVER_VERSION,
    client,
    supported_clients: SUPPORTED_CLIENTS,
    install: {
      command: "npx",
      args: ["-y", PINNED_NPM_PACKAGE],
      optional_env: ["WELLNESS_CYCLE_COACH_LOCAL_DIR"],
    },
    recommended_first_calls: RECOMMENDED_FIRST_CALLS,
    tools: TOOLS,
    resources: [
      "wellness-cycle-coach://agent-manifest",
      "wellness-cycle-coach://capabilities",
      "wellness-cycle-coach://privacy-audit",
    ],
    agent_rules: [
      "Cycle history (period start dates) must be passed in via tool args. This coach is stateless.",
      "Use cycle_estimate_phase to detect the user's current phase before recommending nutrition or training.",
      "Always state confidence level — a single logged period is 'low' confidence.",
      "Cross-reference with WHOOP/Garmin/Oura recovery for late-luteal fatigue patterns.",
      "Never claim medical accuracy. Defer to a clinician for fertility, pregnancy, or symptom-management decisions.",
    ],
    community: {
      repo: "https://github.com/davidmosiah/wellness-cycle-coach",
      issues: "https://github.com/davidmosiah/wellness-cycle-coach/issues",
      twitter: "https://x.com/delx369",
      docs: "https://wellness.delx.ai/connectors/cycle",
      invite:
        "If wellness-cycle-coach helps your agent serve a long-overlooked population, a star on the repository increases visibility for other AI builders.",
    },
    capabilities: buildCapabilities(),
    privacy: buildPrivacyAudit(),
  };
}
