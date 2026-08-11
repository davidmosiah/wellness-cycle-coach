# Changelog

## 0.4.2

- Security: raise `hono` override to **4.13.1** (clears moderate MCP SDK transitive advisories); `@hono/node-server@2.1.0`.


## 0.4.1

- Security: override `fast-uri@3.1.5` and `ip-address@10.4.0` (high transitive).


## [Unreleased]

## [0.4.0] - 2026-08-01

### Fixed

- **`cycle_demo` advertised an incomplete `cycle_full_report` contract.** The demo exists so an agent can see the payload shape before making a real call, but nothing ever compared it against the real tool, and it had drifted:
  - `cross_connector_hints` — the real `cycle_full_report` returns this top-level array on every call; the demo omitted it entirely. An agent that built its rendering off the demo never knew the field existed and silently dropped the cross-connector guidance (nourish meal planning, WHOOP/Garmin/Oura recovery, hydration).
  - `tldr` — the demo re-assembled this string by hand and had lost the trailing `Next period: ~YYYY-MM-DD.` sentence. `tldr` is the field agents render verbatim, so the demo taught that the next-period date is absent from it; an agent appending its own would have shown the date twice.
  - The demo also gave no signal that `warning`, `estimate.warning`, `estimate.irregular_window` and `estimate.late_luteal` exist at all (they appear only with `cycle_irregular: true`), nor that `tldr` carries an extra delay clause on a late cycle. Both are now stated in `notes`, with a pointer to parse `estimate.days_past_due` / `estimate.delay_flag` instead of the tldr text.

  No invented fields were found — everything the demo showed was real. The damage was in what it left out.

### Added

- **`npm run test:demo-contract`, wired into `npm test`.** The gate opens a real MCP stdio session, calls `cycle_demo`, feeds the demo's own `sample_input` back into the real `cycle_full_report`, and fails the build when the key sets diverge in either direction — a key the demo invents, or a contract key the demo omits. It also asserts `tldr` is byte-identical for the same input, and that every field the demo excuses itself from showing as "irregular-mode only" genuinely appears in the irregular-mode payload, so the allowlist cannot become its own fiction. This is what keeps the demo honest between releases instead of drifting for versions again.

## [0.3.7] - 2026-07-30

### Added

- **Agent-readiness (mcp-scorecard):** real `privacy_mode` input on all read tools (`summary|structured|raw`), full MCP resource set (`wellness-cycle-coach://agent-manifest|capabilities|connection-status|inventory|privacy-audit`), `readOnlyHint` annotations on read tools, and `standard_tools` on `cycle_agent_manifest`.

## [0.3.6] - 2026-07-16

### Fixed

- Synchronized the runtime, package, and MCP Registry versions; the runtime had remained on 0.3.4 while package metadata advertised 0.3.5.
- Updated the transitive Hono security override to 4.12.30. The computational boundary remains covered by the cycle-engine contract suite, including irregular cycles, late-luteal behavior, and PCOS-aware guidance.

## [0.3.3] - 2026-05-20

### Added

- **PCOS / irregular-cycle mode** — new optional `cycle_irregular: boolean` flag on `cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_phase_guidance`, `cycle_recommend_nutrition`, `cycle_recommend_training`, and `cycle_full_report`. When `true`:
  - Accepts cycle lengths from 21 to 90 days (instead of the standard 18-45 day filter that drops PCOS-typical 50-90 day cycles).
  - Caps confidence at `"low"` regardless of how much history is logged (PCOS cycle variance is high enough that more data does not increase predictive trust).
  - Surfaces a clinician-defer warning string on every response: *"PCOS / irregular-cycle mode is on. Predictions have high uncertainty. Defer to your clinician for fertility, contraception, or symptom-management decisions."*
  - When `days_since_last > 35` and no period is recorded, returns the new `luteal_extended` phase with `late_luteal: true` and `irregular_window: true` instead of forcing the standard 14-day-luteal classification (which breaks at 35+ days).
- **New tool `cycle_irregular_check`** — takes the user's last 3+ cycle lengths and returns `is_irregular`, `mean_length`, `stdev_length`, `min`, `max`, `coefficient_of_variation`, and a `recommendation` string. Flags as irregular when stdev > 7 days OR any cycle > 35 days OR CV > 0.15. Use this BEFORE deciding whether to enable `cycle_irregular: true` on the other tools.
- **New `luteal_extended` phase** — added to `CYCLE_PHASES`, exposed in `cycle_capabilities` and `cycle_data_inventory`. Includes PCOS-aware guidance for `guidanceForPhase("luteal_extended")` — insulin-sensitivity-aware nutrition, strength-training emphasis, and notes that defer fertility/contraception/amenorrhea decisions to the user's clinician.
- New `agent_rule` documenting the irregular-mode workflow: call `cycle_irregular_check` first, pass `cycle_irregular: true` on subsequent calls when irregular.

### Changed

- Tool count: 16 → 17.
- `cycle_full_report` TL;DR includes `Cycle is N days since last period — irregular-mode extended window.` when in `luteal_extended` so agents surface the extended window without inspecting the full estimate object.
- `cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_phase_guidance`, `cycle_recommend_nutrition`, `cycle_recommend_training`, `cycle_full_report` tool descriptions updated to document the new flag.

## [0.3.2] - 2026-05-19

### Added

- **`late_luteal` sub-phase + `delay_flag` + `days_past_due` on every phase estimate.** Previously when a cycle was past its expected end (cycleLength + 1 day) the engine still returned `phase: "luteal"` with the same generic guidance. Now the engine returns:
  - `phase: "late_luteal"` whenever the cycle has crossed cycleLength + `LATE_LUTEAL_GRACE_DAYS` (1 day).
  - `days_past_due` — positive integer when late, zero on the predicted day, negative when before.
  - `delay_flag: true` when the cycle is ≥2 days past predicted start AND we have 3+ historical cycles to trust the prediction (avoids false positives on first/second cycles where confidence is low).
- New `guidanceForPhase("late_luteal")` returns restorative/low-impact training and PMS-friendly nutrition (B6, magnesium), plus user-facing notes that mention pregnancy-test guidance and "log eventual period start so future predictions stay accurate".
- `cycle_full_report` TL;DR now includes "Cycle is N day(s) past predicted start" when `delay_flag` is raised so agents surface the delay without needing to inspect the full object.

### Changed

- `cycle_estimate_phase` tool description updated to document `late_luteal` + `delay_flag` + `days_past_due`.

## [0.3.1] - 2026-05-11

### Fixed

- **Profile-store regex no longer false-positives on common wellness words.** Split `SECRET_PATTERNS` into `SECRET_KEY_PATTERNS` (broad, for field names like `oauth_token`) and `SECRET_VALUE_PATTERNS` (high-specificity, only credential shapes: JWTs, `Bearer <token>`, `sk_live_`, `sk-proj-`, `xoxb-`, `github_pat_`, raw `Authorization:` headers). Previously legitimate text like "5 training sessions per week", "limit cookies", "I need to refresh my approach", or "secret sauce: more sleep" was rejected.
- **Partial-profile reads no longer crash downstream.** `readProfileFile` now structurally merges with `DEFAULT_PROFILE` when legacy Hermes/OpenClaw files lacked sub-objects. Previously `buildProfileSummary` and `missingCriticalFields` would throw.
- **Onboarding `privacy_note` no longer hard-codes a single connector path.** Lists multiple example paths so the message reads correctly from every connector.

## [0.3.0] - 2026-05-11

### Added

- **Shared wellness profile support** — vendored canonical `profile-store` (Delx Wellness `ab83d1a`) at `src/services/profile-store.ts`. Reads/writes `~/.delx-wellness/profile.json` (the same file every Delx Wellness MCP can read).
- `cycle_profile_get` MCP tool — returns the user's shared profile, one-line summary, and missing critical fields. Read-only.
- `cycle_profile_update` MCP tool — persist a partial patch with `explicit_user_intent: true`. Rejects secret-like fields (oauth/token/secret/password/cookie/refresh/api_key/session).
- `cycle_onboarding` MCP tool — returns the 11-question onboarding flow + the current profile + a cross-connector hint that `profile.profile.sex_or_gender_context` activates phase-aware coaching (pair with wellness-nourish phase-emphasis meals + whoop-mcp recovery for late-luteal load adjustments).
- `wellness-cycle-coach onboarding [pt-BR|en]` CLI command — emits the flow as JSON on stdout plus a TTY-gated Markdown walkthrough on stderr ("the agent will ask these 11 questions next — non-secret data only, stored at ~/.delx-wellness/profile.json").

### Changed

- Tool count: 13 → 16.
- `recommended_first_calls` now leads with `cycle_profile_get` so agents fetch the user's `sex_or_gender_context` before activating phase-aware coaching.

## [0.2.0] - 2026-05-10

### Added

- `cycle_quickstart` tool — returns a personalized 3-step walkthrough for using the coach (gather history → call full_report → cross-reference with rest of the wellness stack).
- `cycle_demo` tool — returns a sample `cycle_full_report` payload with synthetic data so agents see the contract before integrating real period dates.
- `cycle_full_report` now returns a one-line `tldr` string for quick agent rendering ("Phase: luteal (cycle day 22). Eat: complex carbs, B vitamins. Train: endurance + technique (moderate). Hydrate: 2600 ml. Next period: ~2026-05-27.")
- `doctor` CLI now returns a `recommendations[]` array suggesting next-step tools.

### Changed

- `recommended_first_calls` on the agent manifest now leads with `cycle_quickstart`.
- Tool count: 11 → 13.

## [0.1.0] - 2026-05-10

### Added

- Initial release. Stateless menstrual cycle coach MCP — orchestrates cycle data into phase-aware nutrition + training + hydration recommendations.
- 11 MCP tools: standard 5 (`cycle_agent_manifest`, `cycle_capabilities`, `cycle_connection_status`, `cycle_privacy_audit`, `cycle_data_inventory`) + cycle-specific 6 (`cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_phase_guidance`, `cycle_recommend_nutrition`, `cycle_recommend_training`, `cycle_full_report`).
- Phase detection over 4-phase model: menstrual / follicular / ovulatory / luteal.
- Evidence-informed nutrition + training + hydration guidance per phase.
- Confidence scoring (low/medium/high) based on amount of period history provided.
- CLI: `wellness-cycle-coach status`, `doctor`, `setup`.
- Stateless by design — never persists cycle data. Stress-tested via smoke suite.
