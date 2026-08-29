export const SERVER_NAME = "wellness-cycle-coach-mcp";
export const SERVER_VERSION = "0.4.3";
export const NPM_PACKAGE_NAME = "wellness-cycle-coach";
export const PINNED_NPM_PACKAGE = `${NPM_PACKAGE_NAME}@${SERVER_VERSION}`;
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 3011;
export const LOCAL_DIR_NAME = ".wellness-cycle-coach";

export const CYCLE_PHASES = [
  "menstrual",
  "follicular",
  "ovulatory",
  "luteal",
  "late_luteal",
  "luteal_extended",
] as const;
export type CyclePhase = typeof CYCLE_PHASES[number];

/** Number of days past predicted next-period start before we flag the cycle as late. */
export const LATE_LUTEAL_GRACE_DAYS = 1;
/** Number of days past predicted next-period start before we raise `delay_flag`. */
export const DELAY_FLAG_DAYS = 2;

/** Default cycle/phase lengths used when the user hasn't logged enough history yet. */
export const DEFAULT_CYCLE_LENGTH_DAYS = 28;
export const DEFAULT_PERIOD_LENGTH_DAYS = 5;
export const DEFAULT_LUTEAL_LENGTH_DAYS = 14;

/**
 * PCOS / irregular-cycle accepted range. Standard mode constrains to 21-35; with
 * `cycle_irregular: true` the engine accepts cycles up to 90 days (typical for
 * PCOS where ovulation can be sporadic or absent for months).
 */
export const IRREGULAR_CYCLE_MIN_DAYS = 21;
export const IRREGULAR_CYCLE_MAX_DAYS = 90;
/**
 * Days since last period after which we stop forcing a phase classification and
 * return the `luteal_extended` placeholder phase when `cycle_irregular: true`.
 */
export const IRREGULAR_EXTENDED_THRESHOLD_DAYS = 35;
/** Standard PCOS / irregular-mode warning string surfaced on every irregular-mode response. */
export const IRREGULAR_MODE_WARNING =
  "PCOS / irregular-cycle mode is on. Predictions have high uncertainty. Defer to your clinician for fertility, contraception, or symptom-management decisions.";

/** Upstream connector names this coach knows how to consume data from. */
export const UPSTREAM_CONNECTORS = ["apple-health-mcp", "garminmcp", "fitbitmcp"] as const;
export type UpstreamConnector = typeof UPSTREAM_CONNECTORS[number];
