import { NPM_PACKAGE_NAME, SERVER_VERSION } from "../constants.js";
import { buildCapabilities } from "../services/capabilities.js";
import { buildPrivacyAudit } from "../services/privacy-audit.js";

const COMMANDS = new Set(["status", "doctor", "setup"]);

function printCommunityCTA(): void {
  if (process.env.WELLNESS_CYCLE_COACH_QUIET === "1") return;
  if (!process.stderr.isTTY) return;
  process.stderr.write(
    `\n✨ wellness-cycle-coach v${SERVER_VERSION} — built so AI agents finally serve menstruating users. A star ⭐ helps surface this to other builders.\n` +
      `   ⭐  https://github.com/davidmosiah/wellness-cycle-coach\n` +
      `   💬  https://github.com/davidmosiah/wellness-cycle-coach/issues\n` +
      `   🐦  https://x.com/delx369\n` +
      `   (silence with WELLNESS_CYCLE_COACH_QUIET=1)\n\n`,
  );
}

export function isCliCommand(args: string[]): boolean {
  const command = args[0];
  return command !== undefined && COMMANDS.has(command);
}

export async function runCliCommand(args: string[]): Promise<number> {
  const [command] = args;
  switch (command) {
    case "status":
      console.log(JSON.stringify({ name: NPM_PACKAGE_NAME, version: SERVER_VERSION, stateless: true }, null, 2));
      printCommunityCTA();
      return 0;
    case "doctor":
      console.log(
        JSON.stringify(
          {
            ok: true,
            package: NPM_PACKAGE_NAME,
            version: SERVER_VERSION,
            stateless: true,
            capabilities: buildCapabilities(),
            privacy: buildPrivacyAudit(),
            recommendations: [
              "Try cycle_demo to see a sample output before integrating real data.",
              "Try cycle_quickstart to get a 3-step setup tailored to your client.",
              "Pass period start dates via tool args; this MCP is stateless by design.",
            ],
          },
          null,
          2,
        ),
      );
      printCommunityCTA();
      return 0;
    case "setup":
      console.log(
        JSON.stringify(
          {
            mcpServers: {
              "wellness-cycle-coach": {
                command: "npx",
                args: ["-y", NPM_PACKAGE_NAME],
              },
            },
            next_steps: [
              "Pass period start dates via tool args to cycle_estimate_phase / cycle_full_report.",
              "Pair with apple-health-mcp / garminmcp / fitbitmcp to fetch period history automatically.",
              "Cross-reference recovery + nutrition for full coaching context.",
            ],
          },
          null,
          2,
        ),
      );
      printCommunityCTA();
      return 0;
    default:
      return -1;
  }
}
