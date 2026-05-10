import { LOCAL_DIR_NAME } from "../constants.js";

export interface CycleCoachPrivacyAudit {
  local_storage: string;
  outbound_destinations: string[];
  what_is_logged: string[];
  what_is_never_logged: string[];
  agent_rules: string[];
}

export function buildPrivacyAudit(): CycleCoachPrivacyAudit {
  return {
    local_storage: `~/${LOCAL_DIR_NAME} (only diagnostic logs; no cycle data is persisted)`,
    outbound_destinations: ["none — fully local computation"],
    what_is_logged: [
      "Diagnostic information from doctor command (versions, env presence) — no cycle data.",
    ],
    what_is_never_logged: [
      "Period dates, cycle history, symptoms, ovulation predictions, or any reproductive-health data.",
      "User identifiers, names, or contact info.",
    ],
    agent_rules: [
      "Treat menstrual cycle data with the same sensitivity as medical records.",
      "Do not surface predictions to third parties without explicit user consent.",
      "Never claim diagnostic accuracy — these are evidence-informed defaults, not medical guidance.",
      "When the user is in late luteal phase and reports fatigue/mood drop, normalize it; do not pathologize.",
      "If the user asks about pregnancy/fertility decisions, defer to a clinician.",
    ],
  };
}
