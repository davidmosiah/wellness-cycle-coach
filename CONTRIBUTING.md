# Contributing

Thank you for considering a contribution to wellness-cycle-coach. This project exists to fix a long-standing gap: AI agents have not been built with menstruating users in mind. Help is welcome.

1. **File an issue first** for non-trivial changes.
2. **Branch from `main`**, name it `feat/<thing>` or `fix/<thing>`.
3. **Run `npm test`** before opening a PR.
4. **Update CHANGELOG.md** under `## [Unreleased]`.

## Areas with high-leverage contributions

- **Internationalization** of guidance text (Portuguese, Spanish, etc.) — currently English defaults.
- **Better evidence citations** for the per-phase recommendations.
- **Edge cases**: PCOS, irregular cycles, perimenopause, post-pill, breastfeeding.
- **Connector adapters**: helpers that take raw data from apple-health-mcp / garminmcp / fitbitmcp and feed it into `cycle_estimate_phase`.

## Tone

- Recommendations are advisory, not medical.
- Never pathologize normal variation.
- Be explicit about confidence levels.

## License

By contributing you agree your changes are released under MIT.
