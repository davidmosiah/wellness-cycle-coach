#!/usr/bin/env node
/**
 * Unit tests for the pure cycle-engine functions.
 *
 * Focus: the v0.3.2 late_luteal / delay_flag edge cases and v0.3.3 PCOS mode.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

execFileSync("npm", ["run", "build"], { stdio: "inherit" });

const { estimatePhase, phaseFromDay, guidanceForPhase, checkIrregularity, estimateAverageCycleLength } = await import(
  "../dist/services/cycle-engine.js"
);

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

// ---------- v0.3.3 PCOS / irregular-cycle mode ----------

// 45-day cycle in standard mode → filtered out of average (45 is the boundary; ≤45 still accepted),
// but a 60-day cycle is filtered out. In irregular mode, both are accepted.
const long45 = estimateAverageCycleLength(
  [{ start_date: "2026-02-01" }, { start_date: "2026-03-18" }], // 45 days
  { cycle_irregular: true },
);
assert.equal(long45, 45, "irregular mode accepts 45-day cycle in average");
console.log("✓ estimateAverageCycleLength irregular mode: 45-day cycle → 45");

const long60 = estimateAverageCycleLength(
  [{ start_date: "2026-02-01" }, { start_date: "2026-04-02" }], // 60 days
  { cycle_irregular: true },
);
assert.equal(long60, 60, "irregular mode accepts 60-day cycle in average");
console.log("✓ estimateAverageCycleLength irregular mode: 60-day cycle → 60");

const long60Standard = estimateAverageCycleLength([
  { start_date: "2026-02-01" },
  { start_date: "2026-04-02" }, // 60 days, filtered out in standard mode
]);
assert.equal(long60Standard, 28, "standard mode filters out 60-day cycle → falls back to default 28");
console.log("✓ estimateAverageCycleLength standard mode: 60-day cycle filtered out, falls back to default");

// 45-day cycle history, today is mid-cycle in irregular mode
const pcos45 = estimatePhase(
  [{ start_date: "2026-02-01" }, { start_date: "2026-03-18" }, { start_date: "2026-05-02" }],
  new Date("2026-05-20T12:00:00Z"),
  { cycle_irregular: true },
);
assert.equal(pcos45.confidence, "low", "irregular mode caps confidence at low even with 3 history entries");
assert.ok(pcos45.warning, "irregular mode response has warning");
assert.ok(/clinician/i.test(pcos45.warning), "warning mentions clinician");
console.log(`✓ estimatePhase irregular 45-day mid-cycle: phase=${pcos45.phase}, confidence=low, has warning`);

// Long single cycle (60 days since last) → luteal_extended
const pcos60Extended = estimatePhase(
  [{ start_date: "2026-03-01" }],
  new Date("2026-05-01T12:00:00Z"), // 61 days later
  { cycle_irregular: true },
);
assert.equal(pcos60Extended.phase, "luteal_extended", "60+ days since last + irregular → luteal_extended");
assert.equal(pcos60Extended.irregular_window, true, "luteal_extended sets irregular_window");
assert.equal(pcos60Extended.late_luteal, true, "luteal_extended sets late_luteal flag");
assert.ok(pcos60Extended.notes.some((n) => /extended threshold/i.test(n)), "notes mention extended threshold");
console.log("✓ estimatePhase irregular 60+ days since last → luteal_extended + irregular_window + late_luteal");

// luteal_extended guidance is returned with the new shape
const extGuidance = guidanceForPhase("luteal_extended");
assert.equal(extGuidance.phase, "luteal_extended");
assert.ok(extGuidance.nutrition.emphasize.some((s) => /insulin/i.test(s) || /protein/i.test(s) || /sugar/i.test(s) || /carb/i.test(s)));
assert.ok(extGuidance.notes.some((n) => /clinician/i.test(n)), "luteal_extended guidance mentions clinician");
console.log("✓ guidanceForPhase('luteal_extended') returns PCOS-aware shape");

// stdev > 7 → irregular
const stdev12 = checkIrregularity([28, 50, 35, 25, 40]);
assert.equal(stdev12.is_irregular, true, "stdev > 7 days → irregular");
assert.ok(stdev12.stdev_length > 7);
console.log(`✓ checkIrregularity: stdev=${stdev12.stdev_length} → irregular`);

// any cycle > 35 → irregular
const oneOutlier = checkIrregularity([28, 27, 40]);
assert.equal(oneOutlier.is_irregular, true, "single 40-day outlier → irregular");
assert.ok(/clinician/i.test(oneOutlier.recommendation));
console.log(`✓ checkIrregularity: 28/27/40 → irregular (max=${oneOutlier.max})`);

// CV > 0.15 → irregular
// stdev/mean > 0.15. With cycles [25, 30, 36]: mean=30.33, stdev≈4.5, cv≈0.149 → just under
// With [22, 30, 38]: mean=30, stdev≈6.5, cv≈0.218 → irregular
const cvHigh = checkIrregularity([22, 30, 38]);
assert.equal(cvHigh.is_irregular, true, "CV > 0.15 → irregular");
assert.ok(cvHigh.coefficient_of_variation > 0.15);
console.log(`✓ checkIrregularity: CV=${cvHigh.coefficient_of_variation} → irregular`);

// Regular cycles → not flagged
const regular = checkIrregularity([28, 29, 27]);
assert.equal(regular.is_irregular, false, "28/29/27 → regular");
assert.ok(/regular/i.test(regular.recommendation));
console.log("✓ checkIrregularity: 28/29/27 → regular, no flag");

// Fewer than 3 lengths → insufficient
const tooFew = checkIrregularity([28]);
assert.equal(tooFew.is_irregular, false);
assert.ok(/at least 3/i.test(tooFew.recommendation));
console.log("✓ checkIrregularity: 1 length → 'log more periods' recommendation");

console.log("\nall cycle-engine unit tests passed.");
