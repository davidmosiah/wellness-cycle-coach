# Changelog

## [Unreleased]

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
