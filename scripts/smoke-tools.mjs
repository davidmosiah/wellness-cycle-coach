#!/usr/bin/env node
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const EXPECTED_TOOLS = new Set([
  "cycle_agent_manifest",
  "cycle_capabilities",
  "cycle_connection_status",
  "cycle_privacy_audit",
  "cycle_data_inventory",
  "cycle_quickstart",
  "cycle_demo",
  "cycle_estimate_phase",
  "cycle_predict_next_period",
  "cycle_phase_guidance",
  "cycle_recommend_nutrition",
  "cycle_recommend_training",
  "cycle_full_report",
]);

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, WELLNESS_CYCLE_COACH_QUIET: "1" },
});
const client = new Client({ name: "wellness-cycle-coach-smoke", version: "0.0.1" }, { capabilities: {} });

await client.connect(transport);
const { tools } = await client.listTools();
const got = new Set(tools.map((t) => t.name));
for (const expected of EXPECTED_TOOLS) {
  assert.ok(got.has(expected), `missing tool: ${expected}`);
}
console.log(`✓ all ${EXPECTED_TOOLS.size} tools registered`);

const manifest = JSON.parse((await client.callTool({ name: "cycle_agent_manifest", arguments: {} })).content[0].text);
assert.equal(manifest.name, "wellness-cycle-coach-mcp");
assert.ok(manifest.tools.length >= EXPECTED_TOOLS.size);
console.log("✓ cycle_agent_manifest valid shape");

const phaseTest = JSON.parse(
  (
    await client.callTool({
      name: "cycle_estimate_phase",
      arguments: { history: [{ start_date: "2026-04-15" }, { start_date: "2026-05-13" }], today: "2026-05-22" },
    })
  ).content[0].text,
);
assert.equal(typeof phaseTest.phase, "string");
assert.ok(["menstrual", "follicular", "ovulatory", "luteal"].includes(phaseTest.phase));
console.log(`✓ cycle_estimate_phase returns valid phase '${phaseTest.phase}' on day ${phaseTest.cycle_day}`);

const guidance = JSON.parse(
  (await client.callTool({ name: "cycle_phase_guidance", arguments: { phase: "luteal" } })).content[0].text,
);
assert.equal(guidance.phase, "luteal");
assert.ok(guidance.nutrition.emphasize.length > 0);
assert.ok(guidance.training.intensity);
console.log("✓ cycle_phase_guidance returns nutrition + training");

const report = JSON.parse(
  (
    await client.callTool({
      name: "cycle_full_report",
      arguments: {
        history: [{ start_date: "2026-04-01" }, { start_date: "2026-04-29" }],
        today: "2026-05-15",
      },
    })
  ).content[0].text,
);
assert.equal(typeof report.estimate.phase, "string");
assert.ok(report.guidance.nutrition);
console.log(`✓ cycle_full_report works (current phase=${report.estimate.phase})`);

const privacy = JSON.parse((await client.callTool({ name: "cycle_privacy_audit", arguments: {} })).content[0].text);
assert.equal(privacy.outbound_destinations[0], "none — fully local computation");
console.log("✓ cycle_privacy_audit confirms no outbound");

const quickstart = JSON.parse((await client.callTool({ name: "cycle_quickstart", arguments: {} })).content[0].text);
assert.equal(quickstart.ok, true);
assert.ok(Array.isArray(quickstart.steps) && quickstart.steps.length === 3);
console.log("✓ cycle_quickstart returns 3-step walkthrough");

const demo = JSON.parse((await client.callTool({ name: "cycle_demo", arguments: {} })).content[0].text);
assert.equal(demo.is_demo, true);
assert.ok(demo.sample_output.tldr);
console.log(`✓ cycle_demo returns sample payload (tldr: '${demo.sample_output.tldr.slice(0, 60)}...')`);

const reportWithTldr = JSON.parse(
  (
    await client.callTool({
      name: "cycle_full_report",
      arguments: { history: [{ start_date: "2026-04-01" }, { start_date: "2026-04-29" }], today: "2026-05-15" },
    })
  ).content[0].text,
);
assert.ok(reportWithTldr.tldr && typeof reportWithTldr.tldr === "string");
console.log("✓ cycle_full_report includes tldr string");

await client.close();
console.log("\nall smoke checks passed.");
