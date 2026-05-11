# Changelog

## [Unreleased]

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
