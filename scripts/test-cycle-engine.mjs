#!/usr/bin/env node
/**
 * Unit tests for the pure cycle-engine functions.
 *
 * Focus: the v0.3.2 late_luteal / delay_flag edge cases.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

execFileSync("npm", ["run", "build"], { stdio: "inherit" });

const { estimatePhase, phaseFromDay, guidanceForPhase } = await import("../dist/services/cycle-engine.js");

// ---------- phaseFromDay basic boundaries ----------
// 28-day cycle, 5-day period, 14-day luteal: ovulation day = 14
assert.equal(phaseFromDay(1, 28, 5), "menstrual", "day 1 of 28 with 5-day period = menstrual");
assert.equal(phaseFromDay(5, 28, 5), "menstrual", "day 5 of 28 = menstrual (last period day)");
assert.equal(phaseFromDay(6, 28, 5), "follicular", "day 6 of 28 = follicular");
assert.equal(phaseFromDay(12, 28, 5), "follicular", "day 12 of 28 = follicular (pre-ovulation)");
assert.equal(phaseFromDay(13, 28, 5), "ovulatory", "day 13 of 28 = ovulatory (window start)");
assert.equal(phaseFromDay(14, 28, 5), "ovulatory", "day 14 of 28 = ovulatory");
assert.equal(phaseFromDay(15, 28, 5), "ovulatory", "day 15 of 28 = ovulatory (window end)");
assert.equal(phaseFromDay(16, 28, 5), "luteal", "day 16 of 28 = luteal");
assert.equal(phaseFromDay(28, 28, 5), "luteal", "day 28 = last expected luteal day");
assert.equal(phaseFromDay(29, 28, 5), "luteal", "day 29 (= cycleLength + grace) still luteal");
assert.equal(phaseFromDay(30, 28, 5), "late_luteal", "day 30 (= cycleLength + grace + 1) = late_luteal (v0.3.2 edge case)");
assert.equal(phaseFromDay(35, 28, 5), "late_luteal", "day 35 = late_luteal");
console.log("✓ phaseFromDay boundary tests pass (incl. v0.3.2 late_luteal edge)");

// ---------- estimatePhase with late cycle + 3+ history → delay_flag ----------
// History: 3 cycles, average 28 days. Last period 2026-04-15. Today is 2026-05-15
// (one day past predicted next start of 2026-05-13).
const lateOneDay = estimatePhase(
  [
    { start_date: "2026-02-18" }, // 28d to next
    { start_date: "2026-03-18" }, // 28d to next
    { start_date: "2026-04-15" }, // last
  ],
  new Date("2026-05-15T12:00:00Z"),
);
assert.equal(lateOneDay.cycle_length_days, 28, "average cycle length = 28");
assert.equal(lateOneDay.next_period_estimate, "2026-05-13", "next period predicted 2026-05-13");
assert.equal(lateOneDay.days_past_due, 2, "2 days past predicted start");
assert.equal(lateOneDay.phase, "late_luteal", "phase should be late_luteal");
assert.equal(lateOneDay.delay_flag, true, "delay_flag should be true (2+ days late + 3 history cycles)");
assert.ok(
  lateOneDay.notes.some((n) => /delay_flag=true/.test(n)),
  "notes should include delay_flag=true message",
);
console.log("✓ estimatePhase: 2 days late with 3-cycle history → late_luteal + delay_flag");

// ---------- estimatePhase with late cycle but only 1 history → delay_flag suppressed ----------
const lateButLowConfidence = estimatePhase(
  [{ start_date: "2026-04-15" }],
  new Date("2026-05-15T12:00:00Z"),
);
assert.equal(lateButLowConfidence.cycle_length_days, 28, "default cycle length = 28 with single history");
assert.equal(lateButLowConfidence.days_past_due, 2, "still 2 days past predicted start");
assert.equal(
  lateButLowConfidence.delay_flag,
  false,
  "delay_flag should be FALSE when only 1 historical cycle (low confidence)",
);
// Phase still classifies as late_luteal but without the flag.
assert.equal(lateButLowConfidence.phase, "late_luteal");
console.log("✓ estimatePhase: late cycle with insufficient history → late_luteal but NO delay_flag");

// ---------- estimatePhase exactly on predicted day → still luteal (within grace) ----------
const onTime = estimatePhase(
  [
    { start_date: "2026-02-18" },
    { start_date: "2026-03-18" },
    { start_date: "2026-04-15" },
  ],
  new Date("2026-05-13T12:00:00Z"),
);
assert.equal(onTime.days_past_due, 0, "0 days past predicted start = on time");
assert.equal(onTime.phase, "luteal", "on-the-day cycle is still luteal (within grace)");
assert.equal(onTime.delay_flag, false, "on-time cycle should not raise delay_flag");
console.log("✓ estimatePhase: cycle exactly on predicted day → luteal, no delay_flag");

// ---------- estimatePhase 1 day past predicted → late_luteal (past grace) BUT no delay_flag ----------
// Grace is 1 day, defined on cycleDay boundary (cycleDay <= cycleLength+1 = luteal).
// cycleDay=30 corresponds to days_past_due=1, which is JUST past grace boundary on cycleDay.
const oneDayLate = estimatePhase(
  [
    { start_date: "2026-02-18" },
    { start_date: "2026-03-18" },
    { start_date: "2026-04-15" },
  ],
  new Date("2026-05-14T12:00:00Z"),
);
assert.equal(oneDayLate.days_past_due, 1);
assert.equal(oneDayLate.phase, "late_luteal", "1 day past start → late_luteal (past cycleDay grace)");
assert.equal(oneDayLate.delay_flag, false, "1 day late does not raise delay_flag (need 2+ days)");
console.log("✓ estimatePhase: 1 day past predicted → late_luteal, no delay_flag yet");

// ---------- guidanceForPhase('late_luteal') returns the new shape ----------
const lateGuidance = guidanceForPhase("late_luteal");
assert.equal(lateGuidance.phase, "late_luteal");
assert.equal(lateGuidance.training.intensity, "low-moderate");
assert.ok(lateGuidance.training.style.toLowerCase().includes("restorative"));
assert.ok(lateGuidance.nutrition.emphasize.some((s) => /magnesium/i.test(s)));
assert.ok(lateGuidance.notes.some((n) => /pregnancy test/i.test(n)), "late_luteal notes should mention pregnancy test");
assert.ok(lateGuidance.notes.some((n) => /log the eventual/i.test(n)), "late_luteal notes should hint at logging actual start");
console.log("✓ guidanceForPhase('late_luteal') returns expected shape");

console.log("\nall cycle-engine unit tests passed.");
