# Changelog

## [Unreleased]

## [0.1.0] - 2026-05-10

### Added

- Initial release. Stateless menstrual cycle coach MCP — orchestrates cycle data into phase-aware nutrition + training + hydration recommendations.
- 11 MCP tools: standard 5 (`cycle_agent_manifest`, `cycle_capabilities`, `cycle_connection_status`, `cycle_privacy_audit`, `cycle_data_inventory`) + cycle-specific 6 (`cycle_estimate_phase`, `cycle_predict_next_period`, `cycle_phase_guidance`, `cycle_recommend_nutrition`, `cycle_recommend_training`, `cycle_full_report`).
- Phase detection over 4-phase model: menstrual / follicular / ovulatory / luteal.
- Evidence-informed nutrition + training + hydration guidance per phase.
- Confidence scoring (low/medium/high) based on amount of period history provided.
- CLI: `wellness-cycle-coach status`, `doctor`, `setup`.
- Stateless by design — never persists cycle data. Stress-tested via smoke suite.
