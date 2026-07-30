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
  "cycle_irregular_check",
  "cycle_profile_get",
  "cycle_profile_update",
  "cycle_onboarding",
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
assert.ok(Array.isArray(manifest.standard_tools) && manifest.standard_tools.length > 0);
console.log("✓ cycle_agent_manifest valid shape (incl. standard_tools)");

const privacyModeTool = tools.find((t) => t.name === "cycle_estimate_phase");
assert.ok(privacyModeTool, "cycle_estimate_phase must exist");
assert.ok(
  privacyModeTool.inputSchema?.properties?.privacy_mode || privacyModeTool.inputSchema?.properties?.privacyMode,
  "cycle_estimate_phase must expose privacy_mode in inputSchema",
);
assert.equal(privacyModeTool.annotations?.readOnlyHint, true, "cycle_estimate_phase must be annotated readOnlyHint");
console.log("✓ privacy_mode + readOnlyHint present on cycle_estimate_phase");

const { resources } = await client.listResources();
assert.ok(resources.length >= 3, `expected ≥3 MCP resources, got ${resources.length}`);
console.log(`✓ listResources returns ${resources.length} resources`);

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

const irregularCheck = JSON.parse(
  (
    await client.callTool({
      name: "cycle_irregular_check",
      arguments: { cycle_lengths_days: [45, 60, 38] },
    })
  ).content[0].text,
);
assert.equal(irregularCheck.is_irregular, true, "45/60/38 should flag as irregular");
assert.ok(/clinician/i.test(irregularCheck.recommendation), "irregular recommendation should hint at clinician");
console.log(`✓ cycle_irregular_check flags 45/60/38 (mean=${irregularCheck.mean_length}, stdev=${irregularCheck.stdev_length})`);

const irregularRegular = JSON.parse(
  (
    await client.callTool({
      name: "cycle_irregular_check",
      arguments: { cycle_lengths_days: [28, 27, 29] },
    })
  ).content[0].text,
);
assert.equal(irregularRegular.is_irregular, false, "28/27/29 should NOT flag as irregular");
console.log("✓ cycle_irregular_check leaves 28/27/29 alone");

const pcosReport = JSON.parse(
  (
    await client.callTool({
      name: "cycle_full_report",
      arguments: {
        history: [{ start_date: "2026-03-01" }, { start_date: "2026-04-15" }],
        today: "2026-05-20",
        cycle_irregular: true,
      },
    })
  ).content[0].text,
);
assert.equal(pcosReport.estimate.confidence, "low", "PCOS mode should cap confidence at 'low'");
assert.ok(pcosReport.estimate.warning, "PCOS-mode estimate should have warning");
assert.ok(/clinician/i.test(pcosReport.estimate.warning), "warning should reference clinician");
console.log(`✓ cycle_full_report in PCOS mode caps confidence + adds warning (phase=${pcosReport.estimate.phase})`);

await client.close();
console.log("\nall smoke checks passed.");
