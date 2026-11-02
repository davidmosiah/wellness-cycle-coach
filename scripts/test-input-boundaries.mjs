// Run after build. Synthetic data only; never touches the real user's HOME.
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (!process.env.CYCLE_BOUNDARY_CHILD) {
  const home = await mkdtemp(join(tmpdir(), "cycle-input-test-"));
  try {
    const result = spawnSync(process.execPath, [fileURLToPath(import.meta.url)], {
      env: { ...process.env, HOME: home, USERPROFILE: home, CYCLE_BOUNDARY_CHILD: "1" },
      stdio: "inherit",
    });
    assert.equal(result.status, 0, "isolated boundary checks must pass");
  } finally { await rm(home, { recursive: true, force: true }); }
} else {
  const { estimatePhase, phaseFromDay, estimateAverageCycleLength } = await import("../dist/services/cycle-engine.js");
  const { parseCycleDate } = await import("../dist/services/cycle-date.js");
  const { getProfile, updateProfile, getProfilePath, buildProfileSummary } = await import("../dist/services/profile-store.js");
  const today = new Date("2026-05-15T00:00:00Z");
  for (const start_date of ["2026-05-16", "2027-05-15"]) {
    assert.throws(() => estimatePhase([{ start_date }], today), /after the reference date/);
  }
  assert.equal(estimatePhase([{ start_date: "2026-05-15" }], today).cycle_day, 1);
  assert.equal(estimatePhase([{ start_date: "2026-05-15" }], new Date("2026-05-15T23:59:59Z")).cycle_day, 1);
  assert.throws(() => estimatePhase([{ start_date: "2026-05-15" }], new Date("2026-05-15T10:00:00+12:00")), /after the reference date/);
  assert.equal(estimatePhase([{ start_date: "2026-05-15" }], new Date("2026-05-14T23:30:00-02:00")).cycle_day, 1);
  for (const value of ["2026-02-30", "2026-13-01", "2025-02-29", "2026-5-01"]) {
    assert.throws(() => parseCycleDate(value));
    assert.throws(() => estimateAverageCycleLength([{ start_date: value }]));
  }
  assert.equal(parseCycleDate("2024-02-29").toISOString().slice(0, 10), "2024-02-29");
  assert.throws(() => estimatePhase([], new Date("invalid")), /Reference date/);
  for (const day of [0, -1, NaN, Infinity, 1.5]) assert.throws(() => phaseFromDay(day, 28, 5));

  await updateProfile({ devices: { connected: ["whoop"] }, notes: "synthetic profile" });
  const before = await readFile(getProfilePath(), "utf8");
  for (const patch of [
    { devices: { connected: "whoop" } }, { devices: { connected: null } },
    { devices: { connected: [1] } }, { profile: "abc" }, { notes: 42 },
    { preferences: { ask_before_logging: "false" } }, { profile: { language: "xx" } },
    { unknown: "field" }, { profile: { unknown: "field" } },
    JSON.parse('{"profile":{"__proto__":{"polluted":true}}}'),
  ]) {
    await assert.rejects(updateProfile(patch), /Invalid wellness profile patch/);
    assert.equal(await readFile(getProfilePath(), "utf8"), before, "rejected patch must not change disk");
  }
  assert.match(buildProfileSummary(await getProfile()), /whoop/);
  // Partial v1 legacy documents receive defaults, but corruption is not silently lost.
  await writeFile(getProfilePath(), JSON.stringify({ schema: "delx-wellness-profile/v1", devices: { connected: ["oura"] } }));
  assert.match(buildProfileSummary(await getProfile()), /oura/);
  const bad = JSON.stringify({ schema: "delx-wellness-profile/v1", devices: { connected: null } });
  await writeFile(getProfilePath(), bad);
  await assert.rejects(getProfile(), /Stored wellness profile is invalid/);
  await assert.rejects(updateProfile({ notes: "do not overwrite" }), /Stored wellness profile is invalid/);
  assert.equal(await readFile(getProfilePath(), "utf8"), bad);
  console.log("Synthetic cycle/profile input boundary checks passed.");
}
