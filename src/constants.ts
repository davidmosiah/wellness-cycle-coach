export const SERVER_NAME = "wellness-cycle-coach-mcp";
export const SERVER_VERSION = "0.3.1";
export const NPM_PACKAGE_NAME = "wellness-cycle-coach";
export const PINNED_NPM_PACKAGE = `${NPM_PACKAGE_NAME}@${SERVER_VERSION}`;
export const DEFAULT_HOST = "127.0.0.1";
export const DEFAULT_PORT = 3011;
export const LOCAL_DIR_NAME = ".wellness-cycle-coach";

export const CYCLE_PHASES = ["menstrual", "follicular", "ovulatory", "luteal"] as const;
export type CyclePhase = typeof CYCLE_PHASES[number];

/** Default cycle/phase lengths used when the user hasn't logged enough history yet. */
export const DEFAULT_CYCLE_LENGTH_DAYS = 28;
export const DEFAULT_PERIOD_LENGTH_DAYS = 5;
export const DEFAULT_LUTEAL_LENGTH_DAYS = 14;

/** Upstream connector names this coach knows how to consume data from. */
export const UPSTREAM_CONNECTORS = ["apple-health-mcp", "garminmcp", "fitbitmcp"] as const;
export type UpstreamConnector = typeof UPSTREAM_CONNECTORS[number];
