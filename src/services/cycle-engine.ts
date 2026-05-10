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
}

export function estimateAverageCycleLength(history: CycleHistoryEntry[]): number {
  if (history.length < 2) return DEFAULT_CYCLE_LENGTH_DAYS;
  const sorted = [...history].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const diffs: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    const a = new Date(sorted[i - 1].start_date).getTime();
    const b = new Date(sorted[i].start_date).getTime();
    const days = Math.round((b - a) / 86_400_000);
    if (days >= 18 && days <= 45) diffs.push(days);
  }
  if (diffs.length === 0) return DEFAULT_CYCLE_LENGTH_DAYS;
  const avg = diffs.reduce((a, b) => a + b, 0) / diffs.length;
  return Math.round(avg);
}

export function estimatePhase(history: CycleHistoryEntry[], today: Date = new Date()): PhaseEstimate {
  const sorted = [...history].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const lastPeriod = sorted[sorted.length - 1];
  if (!lastPeriod) {
    return {
      phase: "follicular",
      cycle_day: 0,
      cycle_length_days: DEFAULT_CYCLE_LENGTH_DAYS,
      next_period_estimate: "",
      confidence: "low",
      notes: ["No cycle history provided. Returning a 'follicular' default; please log at least one period start date."],
    };
  }
  const cycleLength = estimateAverageCycleLength(history);
  const cycleDay =
    Math.floor((today.getTime() - new Date(lastPeriod.start_date).getTime()) / 86_400_000) + 1;
  const phase = phaseFromDay(cycleDay, cycleLength, lastPeriod.length_days ?? DEFAULT_PERIOD_LENGTH_DAYS);
  const nextStart = new Date(new Date(lastPeriod.start_date).getTime() + cycleLength * 86_400_000);
  const confidence: "low" | "medium" | "high" = history.length >= 6 ? "high" : history.length >= 3 ? "medium" : "low";
  return {
    phase,
    cycle_day: cycleDay,
    cycle_length_days: cycleLength,
    next_period_estimate: nextStart.toISOString().slice(0, 10),
    confidence,
    notes: confidence === "low" ? ["Confidence low; log more periods to improve accuracy."] : [],
  };
}

export function phaseFromDay(cycleDay: number, cycleLength: number, periodLength: number): CyclePhase {
  if (cycleDay <= periodLength) return "menstrual";
  const ovulationDay = cycleLength - DEFAULT_LUTEAL_LENGTH_DAYS;
  if (cycleDay < ovulationDay - 1) return "follicular";
  if (cycleDay <= ovulationDay + 1) return "ovulatory";
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
  }
}

export function listAllPhases(): ReadonlyArray<CyclePhase> {
  return CYCLE_PHASES;
}
