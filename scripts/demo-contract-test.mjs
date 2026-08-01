#!/usr/bin/env node
/**
 * Contract gate for `cycle_demo`.
 *
 * The demo tool exists so agents can see the payload shape before making a real
 * call. A hand-written example nobody compares against reality drifts silently,
 * and an agent that trusts it writes a parser for fields that never arrive (or
 * misses fields that do).
 *
 * This repo is stateless — there is no export file to fixture. The demo carries
 * its own `sample_input`, so the gate feeds that input straight back into the
 * REAL `cycle_full_report` tool over a real MCP stdio session and compares the
 * result with the demo's advertised `sample_output`. Failures in both directions:
 *
 *   - a key in the demo that the real tool never returns -> invented contract
 *   - a key the real tool returns that the demo omits     -> incomplete contract
 *
 * Arrays are compared as the union of their elements' key paths, because a
 * payload can hold both populated and empty entries and either alone
 * under-describes the shape.
 *
 * `tldr` is additionally compared as an exact string. It is the one field agents
 * render verbatim, the demo re-assembles it by hand, and same-input/same-output
 * is deterministic — so anything less than equality lets the copy drift (it did:
 * the demo dropped the trailing "Next period: ~..." sentence for versions).
 */
import assert from "node:assert/strict";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * Keys `cycle_full_report` emits ONLY in irregular / late-cycle mode. The demo
 * sample is an on-time luteal cycle, so it legitimately cannot show them inline
 * — it names them in `notes` instead.
 *
 * This is deliberately narrow, and it is not a free pass: every key listed here
 * must actually appear in the irregular-mode payload (checked below). Adding a
 * key here to silence the gate defeats the gate.
 */
const CONDITIONAL_IN_REAL = new Map([
  ["warning", "top-level clinician-defer warning; only with cycle_irregular: true"],
  ["estimate.warning", "clinician-defer warning on the estimate; only with cycle_irregular: true"],
  ["estimate.irregular_window", "only when irregular mode returns the luteal_extended placeholder"],
  ["estimate.late_luteal", "only in irregular mode, on late_luteal / luteal_extended"],
]);

/** Arguments that exercise the irregular-mode surface the demo notes describe. */
const IRREGULAR_INPUT = {
  history: [{ start_date: "2026-03-01" }, { start_date: "2026-04-15" }],
  today: "2026-06-01",
  cycle_irregular: true,
};

function keyPaths(value, prefix = "", out = new Set()) {
  if (Array.isArray(value)) {
    // Union across elements: entries can be populated or empty.
    for (const item of value) keyPaths(item, `${prefix}[]`, out);
    return out;
  }
  if (value === null || typeof value !== "object") return out;
  for (const key of Object.keys(value)) {
    const p = prefix ? `${prefix}.${key}` : key;
    out.add(p);
    keyPaths(value[key], p, out);
  }
  return out;
}

function diff(demoSet, realSet) {
  const invented = [...demoSet].filter((k) => !realSet.has(k)).sort();
  const missing = [...realSet]
    .filter((k) => !demoSet.has(k) && !CONDITIONAL_IN_REAL.has(k))
    .sort();
  return { invented, missing };
}

function report(name, invented, missing) {
  const lines = [];
  if (invented.length > 0) {
    lines.push(
      `\n  ${name}: ${invented.length} key(s) in the demo that the real tool NEVER returns.`,
      `  An agent trusting these writes a parser for data that never arrives:`,
      ...invented.map((k) => `    - ${k}`),
    );
  }
  if (missing.length > 0) {
    lines.push(
      `\n  ${name}: ${missing.length} key(s) the real tool returns but the demo omits.`,
      `  Agents reading the demo will not know these exist:`,
      ...missing.map((k) => `    + ${k}`),
    );
  }
  return lines.join("\n");
}

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
  env: { ...process.env, WELLNESS_CYCLE_COACH_QUIET: "1" },
});
const client = new Client({ name: "wellness-cycle-coach-demo-contract", version: "0.0.1" }, { capabilities: {} });
await client.connect(transport);

const call = async (name, args) =>
  JSON.parse((await client.callTool({ name, arguments: args })).content[0].text);

const demo = await call("cycle_demo", {});
assert.ok(demo.sample_input, "cycle_demo must publish sample_input");
assert.ok(demo.sample_output, "cycle_demo must publish sample_output");

// The real tool, driven by the demo's OWN advertised input.
const real = await call("cycle_full_report", demo.sample_input);

const failures = [];
const demoSet = keyPaths(demo.sample_output);
const realSet = keyPaths(real);
const { invented, missing } = diff(demoSet, realSet);
if (invented.length > 0 || missing.length > 0) {
  failures.push(report("cycle_full_report", invented, missing));
} else {
  console.log(`PASS cycle_full_report — ${demoSet.size} key paths match the real tool`);
}

// tldr is rendered verbatim by agents and rebuilt by hand in the demo.
// Same input, same tool version => byte-identical or it drifted.
if (demo.sample_output.tldr !== real.tldr) {
  failures.push(
    `\n  tldr: the demo string differs from what cycle_full_report returns for the same input.` +
      `\n    demo: ${JSON.stringify(demo.sample_output.tldr)}` +
      `\n    real: ${JSON.stringify(real.tldr)}`,
  );
} else {
  console.log("PASS tldr is byte-identical to the real tool output for the same input");
}

// Every conditional key the demo excuses itself from showing must genuinely
// exist in the irregular-mode payload — otherwise the allowlist is inventing
// contract just as badly as the demo would.
const realIrregular = await call("cycle_full_report", IRREGULAR_INPUT);
const irregularSet = keyPaths(realIrregular);
for (const [key, reason] of CONDITIONAL_IN_REAL) {
  assert.ok(
    irregularSet.has(key),
    `CONDITIONAL_IN_REAL lists "${key}" (${reason}) but the real irregular-mode payload does not contain it`,
  );
}
console.log(`PASS all ${CONDITIONAL_IN_REAL.size} conditional keys exist in the real irregular-mode payload`);

// Nothing may appear in irregular mode that is neither in the demo nor documented.
const undocumented = [...irregularSet].filter((k) => !demoSet.has(k) && !CONDITIONAL_IN_REAL.has(k)).sort();
if (undocumented.length > 0) {
  failures.push(
    `\n  irregular mode: ${undocumented.length} key(s) the real tool returns that are neither in the demo` +
      `\n  nor documented in CONDITIONAL_IN_REAL:` +
      undocumented.map((k) => `\n    + ${k}`).join(""),
  );
} else {
  console.log("PASS irregular-mode payload introduces no undocumented keys");
}

// The demo must stay honest about being synthetic, whatever the shape says.
assert.equal(demo.is_demo, true, "demo payload must be tagged is_demo=true");
assert.ok(Array.isArray(demo.notes) && demo.notes.length > 0, "demo payload must carry notes");
console.log("PASS demo payload is tagged synthetic");

// A cycle coach demo must never ship anything resembling real personal health
// data or location — synthetic dates and guidance copy only.
const encoded = JSON.stringify(demo);
for (const needle of ["latitude", "longitude", "deviceuuid", "email", "user_id"]) {
  assert.ok(!encoded.toLowerCase().includes(needle), `demo payload must not contain "${needle}"`);
}
console.log("PASS demo payload carries no identifying or positional keys");

await client.close();

if (failures.length > 0) {
  console.error("\nFAIL demo contract drifted from the real tool:");
  console.error(failures.join("\n"));
  console.error(
    "\nFix the cycle_demo handler in src/tools/cycle-tools.ts so the example matches what" +
      "\ncycle_full_report returns. Do not widen CONDITIONAL_IN_REAL to silence this —" +
      "\nthat is how the drift got here.\n",
  );
  process.exit(1);
}

console.log(`\ndemo-contract: ${demoSet.size} key paths verified against the real cycle_full_report`);
console.log(JSON.stringify({ ok: true, suite: "demo-contract", key_paths: demoSet.size }));
