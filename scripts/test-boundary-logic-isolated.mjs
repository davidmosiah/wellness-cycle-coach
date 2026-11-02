// Standalone pure-module + temporary-file harness, not upstream integration.
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
const { parseCycleDate, validateCycleHistoryDates } = await import("../src/services/cycle-date.ts");
const { validateProfileShape } = await import("../src/services/profile-validation.ts");
// Synthetic subset of v1 defaults exercises every validator branch.
const defaults = {
  profile: { preferred_name: "", language: "en", units: "metric" },
  devices: { connected: [] }, goals: { primary: "", secondary: [] },
  training: { sports: [] }, nutrition: { dietary_preferences: [] },
  preferences: { language_priority: ["en"], reply_style: "concise", telegram_style: "concise", ask_before_logging: true },
  safety: { medical_constraints: [] }, notes: "",
};
const home = await mkdtemp(join(tmpdir(), "cycle-owned-logic-"));
try {
  const path = join(home, "synthetic-profile.json");
  const initial = JSON.stringify({ schema: "delx-wellness-profile/v1", devices: { connected: ["whoop"] } });
  await writeFile(path, initial, { mode: 0o600 });
  async function harnessSave(patch) {
    validateProfileShape(patch, defaults);
    const current = JSON.parse(await readFile(path, "utf8"));
    validateProfileShape(current, defaults, true);
    await writeFile(path, JSON.stringify({ ...current, ...patch }), { mode: 0o600 });
  }
  for (const patch of [
    null, [], { profile: "abc" }, { devices: { connected: null } },
    { devices: { connected: "whoop" } }, { devices: { connected: [42] } },
    { preferences: { ask_before_logging: "false" } }, { profile: { language: "xx" } },
    { preferences: { language_priority: ["xx"] } }, { notes: 42 },
    { unknown: true }, { profile: { unknown: true } }, { version: 1 },
    JSON.parse('{"profile":{"__proto__":{}}}'),
  ]) {
    await assert.rejects(harnessSave(patch), /Invalid wellness profile patch/);
    assert.equal(await readFile(path, "utf8"), initial);
  }
  for (const patch of [
    {}, { profile: {} }, { profile: { language: "pt-BR", units: "imperial" } },
    { devices: { connected: ["oura"] } }, { preferences: { ask_before_logging: false } },
    { notes: "synthetic note" },
  ]) validateProfileShape(patch, defaults);
  await harnessSave({ notes: "synthetic note" });
  assert.equal(JSON.parse(await readFile(path, "utf8")).notes, "synthetic note");
  const corrupt = JSON.stringify({ schema: "delx-wellness-profile/v1", devices: { connected: null } });
  await writeFile(path, corrupt);
  await assert.rejects(harnessSave({ notes: "must not overwrite" }));
  assert.equal(await readFile(path, "utf8"), corrupt);
  const day = new Date("2026-05-15T00:00:00Z");
  for (const start_date of ["2026-05-16", "2027-01-01", "2026-02-30", "2025-02-29", "2026-13-01"]) {
    assert.throws(() => validateCycleHistoryDates([{ start_date }], day));
  }
  validateCycleHistoryDates([{ start_date: "2026-05-15" }], day);
  validateCycleHistoryDates([{ start_date: "2026-05-15" }], new Date("2026-05-15T23:59:59Z"));
  assert.throws(() => validateCycleHistoryDates([{ start_date: "2026-05-15" }], new Date("2026-05-15T10:00:00+12:00")), /after the reference date/);
  validateCycleHistoryDates([{ start_date: "2026-05-15" }], new Date("2026-05-14T23:30:00-02:00"));
  validateCycleHistoryDates([{ start_date: "2024-02-29" }], day);
  assert.throws(() => validateCycleHistoryDates([], new Date("invalid")));
  assert.equal(parseCycleDate("2024-02-29").toISOString(), "2024-02-29T00:00:00.000Z");
  const store = await readFile(new URL("../src/services/profile-store.ts", import.meta.url), "utf8");
  assert.ok(store.indexOf("validateProfileShape(patch,") < store.indexOf("const current = await getProfile()"));
  assert.match(store, /validateProfileShape\(parsed, DEFAULT_PROFILE as unknown as Record<string, unknown>, true\)/);
  const engine = await readFile(new URL("../src/services/cycle-engine.ts", import.meta.url), "utf8");
  assert.match(engine, /validateCycleHistoryDates\(history, today\)/);
  console.log("Isolated date/profile validator tests passed; application wiring inspected, not executed.");
} finally { await rm(home, { recursive: true, force: true }); }
