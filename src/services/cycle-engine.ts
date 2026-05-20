/**
 * Cycle engine — pure functions to detect phase, predict next period, and
 * recommend nutrition / training per phase. Does NOT call any external API;
 * all data comes from the agent or other MCP connectors and is passed in.
 */
import {
  CYCLE_PHASES,
  DEFAULT_CYCLE_LENGTH_DAYS,
  DEFAULT_LUTEAL_LENGTH_DAYS,
  DEFAULT_PERIOD_LENGTH_DAYS,
  DELAY_FLAG_DAYS,
  IRREGULAR_CYCLE_MAX_DAYS,
  IRREGULAR_CYCLE_MIN_DAYS,
  IRREGULAR_EXTENDED_THRESHOLD_DAYS,
  IRREGULAR_MODE_WARNING,
  LATE_LUTEAL_GRACE_DAYS,
  type CyclePhase,
} from "../constants.js";

export interface CycleHistoryEntry {
  /** ISO date YYYY-MM-DD when the period started. */
  start_date: string;
  /** Optional length in days. */
  length_days?: number;
}

export interface PhaseEstimate {
  phase: CyclePhase;
  cycle_day: number;
  cycle_length_days: number;
  /** ISO date when the next period is expected. */
  next_period_estimate: string;
  /** Confidence based on how much history was provided (low/medium/high). */
  confidence: "low" | "medium" | "high";
  notes: string[];
  /**
   * Days the current cycle is past its predicted next-period start.
   * Negative or zero when cycle is on time; positive when late.
   */
  days_past_due?: number;
  /**
   * True when the cycle is at least DELAY_FLAG_DAYS past predicted start
   * AND we have at least 3 historical cycles to anchor the prediction.
   */
  delay_flag?: boolean;
  /**
   * v0.3.3 — true when the response was computed in PCOS / irregular-cycle
   * mode (cycle_irregular: true). Triggers when the cycle is past
   * IRREGULAR_EXTENDED_THRESHOLD_DAYS and we are returning the
   * `luteal_extended` placeholder phase instead of a forced classification.
   */
  irregular_window?: boolean;
  /**
   * v0.3.3 — true when phase is late_luteal OR luteal_extended in irregular mode.
   * Surfaced separately so agents can distinguish "1-2 days past" from
   * "35+ days past, may have skipped a cycle".
   */
  late_luteal?: boolean;
  /** v0.3.3 — PCOS / irregular-cycle warning surfaced when cycle_irregular: true. */
  warning?: string;
}

export interface PhaseEstimateOptions {
  /**
   * v0.3.3 — when true, accept cycle lengths up to 90 days and cap confidence
   * at "low" (PCOS / unpredictable luteal). Adds a clinician-defer warning and
   * uses the `luteal_extended` placeholder phase when days since last period
   * exceeds IRREGULAR_EXTENDED_THRESHOLD_DAYS instead of forcing a classification.
   */
  cycle_irregular?: boolean;
}

export function estimateAverageCycleLength(
  history: CycleHistoryEntry[],
  options: PhaseEstimateOptions = {},
): number {
  if (history.length < 2) return DEFAULT_CYCLE_LENGTH_DAYS;
  const sorted = [...history].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const diffs: number[] = [];
  // In standard mode, accept 18-45 day cycles (filters wildly out-of-band entries).
  // In irregular mode, accept IRREGULAR_CYCLE_MIN_DAYS..IRREGULAR_CYCLE_MAX_DAYS (21-90).
  const minDays = options.cycle_irregular ? IRREGULAR_CYCLE_MIN_DAYS : 18;
  const maxDays = options.cycle_irregular ? IRREGULAR_CYCLE_MAX_DAYS : 45;
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1].start_date).getTime();
    const b = new Date(sorted[i].start_date).getTime();
    const days = Math.round((b - a) / 86_400_000);
    if (days >= minDays && days <= maxDays) diffs.push(days);
  }
  if (diffs.length === 0) return DEFAULT_CYCLE_LENGTH_DAYS;
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round(avg);
}

export function estimatePhase(
  history: CycleHistoryEntry[],
  today: Date = new Date(),
  options: PhaseEstimateOptions = {},
): PhaseEstimate {
  const irregular = options.cycle_irregular === true;
  const sorted = [...history].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const lastPeriod = sorted[sorted.length - 1];
  if (!lastPeriod) {
    const base: PhaseEstimate = {
      phase: "follicular",
      cycle_day: 0,
      cycle_length_days: DEFAULT_CYCLE_LENGTH_DAYS,
      next_period_estimate: "",
      confidence: "low",
      notes: ["No cycle history provided. Returning a 'follicular' default; please log at least one period start date."],
    };
    if (irregular) {
      base.warning = IRREGULAR_MODE_WARNING;
      base.irregular_window = true;
    }
    return base;
  }
  const cycleLength = estimateAverageCycleLength(history, options);
  const cycleDay =
    Math.floor((today.getTime() - new Date(lastPeriod.start_date).getTime()) / 86_400_000) + 1;
  const nextStart = new Date(new Date(lastPeriod.start_date).getTime() + cycleLength * 86_400_000);
  // daysPastDue = how many days *after* the predicted next-period start are we?
  // Positive when cycle is late, zero on the predicted day, negative when before.
  const daysPastDue = Math.floor((today.getTime() - nextStart.getTime()) / 86_400_000);

  // PCOS / irregular mode: when the cycle has run beyond the extended threshold
  // and we have no period record, return `luteal_extended` instead of forcing
  // a classification. The standard 14-day-luteal math breaks at 35+ days.
  const daysSinceLast = cycleDay - 1;
  const useExtended = irregular && daysSinceLast > IRREGULAR_EXTENDED_THRESHOLD_DAYS;
  const phase: CyclePhase = useExtended
    ? "luteal_extended"
    : phaseFromDay(cycleDay, cycleLength, lastPeriod.length_days ?? DEFAULT_PERIOD_LENGTH_DAYS);

  // Confidence: standard scaling, then capped at "low" in irregular mode (high variance).
  let confidence: "low" | "medium" | "high" =
    history.length >= 6 ? "high" : history.length >= 3 ? "medium" : "low";
  if (irregular) confidence = "low";

  // Raise delay_flag when 2+ days late AND we have 3+ historical cycles to trust the prediction.
  // In irregular mode the prediction itself is low-trust, so we still set the flag for visibility
  // but the warning string makes the uncertainty explicit.
  const delayFlag = daysPastDue >= DELAY_FLAG_DAYS && history.length >= 3;

  const notes: string[] = [];
  if (confidence === "low") notes.push("Confidence low; log more periods to improve accuracy.");
  if (phase === "late_luteal") {
    notes.push(
      `Cycle is ${daysPastDue} day(s) past its predicted next-period start. ` +
        "This often resolves within 1-2 days. If it doesn't, see the delay_flag and consider " +
        "a pregnancy test (if applicable) or note other delay factors (stress, travel, illness, training load).",
    );
  }
  if (phase === "luteal_extended") {
    notes.push(
      `Cycle is ${daysSinceLast} days since last period start — past the ${IRREGULAR_EXTENDED_THRESHOLD_DAYS}-day extended threshold. ` +
        "Standard 14-day luteal math no longer applies. In PCOS, ovulation may have been delayed, sporadic, or skipped this cycle. " +
        "Defer to your clinician for fertility, contraception, or symptom-management decisions.",
    );
  }
  if (delayFlag) {
    notes.push(
      `delay_flag=true: cycle is ≥${DELAY_FLAG_DAYS} days late vs prediction from last ${history.length} cycle(s). ` +
        "Consider pregnancy test if applicable; otherwise log the eventual period start so future predictions stay accurate.",
    );
  }

  const result: PhaseEstimate = {
    phase,
    cycle_day: cycleDay,
    cycle_length_days: cycleLength,
    next_period_estimate: nextStart.toISOString().slice(0, 10),
    confidence,
    notes,
    days_past_due: daysPastDue,
    delay_flag: delayFlag,
  };
  if (irregular) {
    result.warning = IRREGULAR_MODE_WARNING;
    if (phase === "luteal_extended") {
      result.irregular_window = true;
      result.late_luteal = true;
    } else if (phase === "late_luteal") {
      result.late_luteal = true;
    }
  }
  return result;
}

/**
 * Map a cycle day to a phase.
 *
 * Bounds (assuming a `cycleLength` of N and `periodLength` of P, with a fixed
 * luteal length of DEFAULT_LUTEAL_LENGTH_DAYS = 14):
 *   - days 1..P                                   → "menstrual"
 *   - days P+1 .. ovulationDay-2                  → "follicular"
 *   - days ovulationDay-1 .. ovulationDay+1       → "ovulatory"
 *   - days ovulationDay+2 .. N + LATE_LUTEAL_GRACE_DAYS → "luteal"
 *   - days N + LATE_LUTEAL_GRACE_DAYS + 1 onward  → "late_luteal"
 *
 * Late luteal is a NEW sub-phase (v0.3.2) that triggers when the cycle is past
 * its expected end. Catches the edge case where a user is exactly 1+ day late
 * and the old logic would still return "luteal" (no signal of anomaly).
 */
export function phaseFromDay(cycleDay: number, cycleLength: number, periodLength: number): CyclePhase {
  if (cycleDay <= periodLength) return "menstrual";
  const ovulationDay = cycleLength - DEFAULT_LUTEAL_LENGTH_DAYS;
  if (cycleDay < ovulationDay - 1) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulatory";
  // Past the expected next-period start + grace? Flag as late_luteal so the
  // agent can surface a delay note instead of generic luteal guidance.
  if (cycleDay > cycleLength + LATE_LUTEAL_GRACE_DAYS) return "late_luteal";
  return "luteal";
}

export interface PhaseGuidance {
  phase: CyclePhase;
  nutrition: {
    emphasize: string[];
    moderate: string[];
    avoid: string[];
    hydration_ml_target: number;
  };
  training: {
    style: string;
    intensity: "low" | "low-moderate" | "moderate" | "moderate-high" | "high";
    notes: string[];
  };
  notes: string[];
}

export function guidanceForPhase(phase: CyclePhase): PhaseGuidance {
  switch (phase) {
    case "menstrual":
      return {
        phase,
        nutrition: {
          emphasize: ["iron-rich (lentils, beef, dark leafy greens)", "vitamin C (citrus, peppers) to boost iron absorption", "magnesium (dark chocolate, pumpkin seeds, spinach)", "omega-3 (fatty fish, walnuts, flax)"],
          moderate: ["caffeine (can worsen cramps)", "alcohol"],
          avoid: ["very salty foods (worsens bloating)"],
          hydration_ml_target: 2500,
        },
        training: {
          style: "restorative — yoga, walking, mobility, light strength",
          intensity: "low-moderate",
          notes: ["Listen to body. If energy is good on day 3+, progressive load is fine.", "Avoid heavy inversions if they're uncomfortable for you."],
        },
        notes: ["Energy and pain tolerance often dip on days 1-2.", "Cravings for iron-rich foods are common and physiologically reasonable."],
      };
    case "follicular":
      return {
        phase,
        nutrition: {
          emphasize: ["complex carbs (oats, sweet potato, quinoa)", "fermented foods (kimchi, kefir, sauerkraut)", "leafy greens", "lean protein"],
          moderate: ["alcohol", "high-glycemic snacks"],
          avoid: [],
          hydration_ml_target: 2400,
        },
        training: {
          style: "build — strength, sprints, new skills, longer endurance",
          intensity: "moderate-high",
          notes: ["Body is most receptive to strength gains here.", "Higher pain tolerance and faster recovery."],
        },
        notes: ["Estrogen rising → mood, energy, cognitive performance typically peak.", "Best time to schedule challenging workouts and demanding cognitive work."],
      };
    case "ovulatory":
      return {
        phase,
        nutrition: {
          emphasize: ["antioxidants (berries, citrus, green tea)", "fiber (cruciferous vegetables)", "lean protein", "zinc (oysters, beef, pumpkin seeds)"],
          moderate: ["caffeine"],
          avoid: [],
          hydration_ml_target: 2500,
        },
        training: {
          style: "peak — high intensity, PRs, plyometrics, sprints",
          intensity: "high",
          notes: ["Estrogen + testosterone both elevated — power output peaks.", "Watch joint laxity (knee/ankle) on cutting movements."],
        },
        notes: ["1-3 day window. Body temperature rises ~0.3°C after ovulation.", "Libido often peaks; mood is typically high."],
      };
    case "luteal":
      return {
        phase,
        nutrition: {
          emphasize: ["complex carbs (slow-release energy)", "B vitamins (eggs, salmon, leafy greens)", "magnesium (dark chocolate, almonds)", "calcium (dairy or fortified alternatives)"],
          moderate: ["caffeine (sleep sensitivity rises)", "refined sugar (PMS worse)"],
          avoid: ["heavy alcohol (sleep disruption + mood)"],
          hydration_ml_target: 2600,
        },
        training: {
          style: "endurance + technique — Zone 2 cardio, mobility, mind-body work",
          intensity: "moderate",
          notes: ["Resting heart rate typically rises 3-5 bpm.", "Recovery slower; protein needs may rise 5-10%."],
        },
        notes: ["Progesterone dominant. Sleep quality may dip. Watch caffeine after noon.", "Mood/energy can drop in late luteal (PMS window)."],
      };
    case "late_luteal":
      return {
        phase,
        nutrition: {
          emphasize: ["complex carbs", "magnesium-rich foods (dark chocolate, pumpkin seeds, spinach)", "B6 (banana, salmon, chickpeas) — may ease PMS symptoms", "warm hydrating foods (soups, herbal tea)"],
          moderate: ["caffeine (sleep + anxiety sensitivity peak)", "refined sugar (worsens mood swings)", "salt (worsens bloating)"],
          avoid: ["heavy alcohol", "skipped meals (blood-sugar dips amplify PMS)"],
          hydration_ml_target: 2700,
        },
        training: {
          style: "restorative + low-impact — yoga, walking, mobility, easy Zone 1-2",
          intensity: "low-moderate",
          notes: ["Energy and recovery are lowest of the cycle.", "Avoid heavy strength PRs and high-intensity intervals — they spike cortisol when the body is already taxed."],
        },
        notes: [
          "Cycle is past its expected end. Common causes: stress, travel, illness, training load, pregnancy.",
          "If applicable, a pregnancy test is appropriate if the cycle is 7+ days late.",
          "Log the eventual period start date so future cycle-length estimates stay accurate.",
        ],
      };
    case "luteal_extended":
      return {
        phase,
        nutrition: {
          emphasize: ["whole-food carbs (sweet potato, oats, lentils) — steady blood sugar", "fiber (greens, beans) — helps gut estrogen clearance", "anti-inflammatory fats (olive oil, fatty fish, walnuts)", "protein at every meal (insulin-sensitivity matters in PCOS)"],
          moderate: ["caffeine", "refined sugar (insulin-resistance interaction)", "alcohol"],
          avoid: ["ultra-processed snacks", "skipped meals (blood-sugar dips compound PCOS symptoms)"],
          hydration_ml_target: 2700,
        },
        training: {
          style: "steady, sustainable — Zone 2 cardio, moderate strength, mobility, walking",
          intensity: "moderate",
          notes: [
            "PCOS-aware default. With ovulation delayed or skipped, you may feel surprisingly normal — train to RPE, not to a phase.",
            "Strength training improves insulin sensitivity and is a high-leverage habit for PCOS.",
            "Avoid stacking high-intensity work with low sleep — cortisol load worsens PCOS symptoms.",
          ],
        },
        notes: [
          "Standard 14-day-luteal math does not apply at this point in the cycle. Treat this as a placeholder, not a diagnosis.",
          "Common in PCOS: ovulation can be delayed by weeks, sporadic, or absent for a given cycle.",
          "If a period eventually starts, log it so future cycle-length estimates stay accurate.",
          "Defer to your clinician for fertility, contraception, or symptom-management decisions — especially if amenorrhea is new or unexplained.",
        ],
      };
  }
}

export function listAllPhases(): ReadonlyArray<CyclePhase> {
  return CYCLE_PHASES;
}

export interface IrregularityReport {
  is_irregular: boolean;
  mean_length: number;
  stdev_length: number;
  min: number;
  max: number;
  coefficient_of_variation: number;
  recommendation: string;
  inputs: number[];
}

/**
 * v0.3.3 — quick check on whether a user's last 3 (or more) cycle lengths look
 * regular or irregular. Heuristic — NOT a clinical diagnosis. Triggers on any
 * of: stdev > 7 days, any cycle > 35 days, or CV > 0.15.
 */
export function checkIrregularity(lengths: number[]): IrregularityReport {
  if (lengths.length < 3) {
    return {
      is_irregular: false,
      mean_length: 0,
      stdev_length: 0,
      min: 0,
      max: 0,
      coefficient_of_variation: 0,
      recommendation:
        "Need at least 3 cycle lengths to assess regularity. Log more periods and call again.",
      inputs: lengths,
    };
  }
  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((acc, x) => acc + (x - mean) ** 2, 0) / lengths.length;
  const stdev = Math.sqrt(variance);
  const min = Math.min(...lengths);
  const max = Math.max(...lengths);
  const cv = mean > 0 ? stdev / mean : 0;
  const isIrregular = stdev > 7 || max > 35 || cv > 0.15;
  const recommendation = isIrregular
    ? "Your cycle length variance suggests irregular patterns. Consider enabling cycle_irregular: true on the other tools, and discuss with a clinician if this is recent or unexplained."
    : "Your cycles appear regular — standard predictions are reliable";
  return {
    is_irregular: isIrregular,
    mean_length: Math.round(mean * 10) / 10,
    stdev_length: Math.round(stdev * 10) / 10,
    min,
    max,
    coefficient_of_variation: Math.round(cv * 1000) / 1000,
    recommendation,
    inputs: lengths,
  };
}
