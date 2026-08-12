<!-- delx-wellness header v2 -->
<h1 align="center">Wellness Cycle Coach</h1>

<h3 align="center">
  Menstrual cycle coach MCP for AI agents — now with PCOS-aware mode.<br>
  Built so AI finally serves the <strong>50% of users</strong> agents have ignored — without ever storing cycle data.
</h3>

<p align="center">
  <a href="https://www.npmjs.com/package/wellness-cycle-coach"><img src="https://img.shields.io/npm/v/wellness-cycle-coach?style=for-the-badge&labelColor=0F172A&color=10B981&logo=npm&logoColor=white" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/wellness-cycle-coach"><img src="https://img.shields.io/npm/dm/wellness-cycle-coach?style=for-the-badge&labelColor=0F172A&color=0EA5A3&logo=npm&logoColor=white" alt="npm downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/LICENSE-MIT-22C55E?style=for-the-badge&labelColor=0F172A" alt="License MIT" /></a>
  <a href="https://wellness.delx.ai/connectors/cycle"><img src="https://img.shields.io/badge/SITE-wellness.delx.ai-0EA5A3?style=for-the-badge&labelColor=0F172A" alt="Site" /></a>
</p>

<p align="center">
  <a href="https://github.com/davidmosiah/wellness-cycle-coach/stargazers"><img src="https://img.shields.io/github/stars/davidmosiah/wellness-cycle-coach?style=for-the-badge&labelColor=0F172A&color=FBBF24&logo=github" alt="GitHub stars" /></a>
  <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/BUILT_FOR-MCP-7C3AED?style=for-the-badge&labelColor=0F172A" alt="Built for MCP" /></a>
  <a href="https://github.com/davidmosiah/delx-wellness-hermes"><img src="https://img.shields.io/badge/HERMES-one--command_setup-10B981?style=for-the-badge&labelColor=0F172A" alt="Hermes" /></a>
  <a href="https://github.com/davidmosiah/delx-wellness-openclaw"><img src="https://img.shields.io/badge/OPENCLAW-one--command_setup-FB923C?style=for-the-badge&labelColor=0F172A" alt="OpenClaw" /></a>
</p>

<p align="center">
  <strong>🌙 Why this exists:</strong> Most AI agents treat the body as a single context-free unit. But energy, recovery, training tolerance, nutrient needs and even cognitive bandwidth shift across the menstrual cycle. <code>wellness-cycle-coach</code> gives any agent <strong>phase-aware</strong> guidance — and never stores cycle data to do it.
</p>

> ⚡ **One-command install** — pick your runtime:
> - [Delx Wellness for Hermes](https://github.com/davidmosiah/delx-wellness-hermes): `npx -y delx-wellness-hermes setup`
> - [Delx Wellness for OpenClaw](https://github.com/davidmosiah/delx-wellness-openclaw): `npx -y delx-wellness-openclaw setup`

---

## HTTP (v2 stateless)

Default is **stdio**. Optional Streamable HTTP — no session id, JSON responses, loopback only:

```bash
npx -y wellness-cycle-coach --http
# GET  http://127.0.0.1:3000/health
# POST http://127.0.0.1:3000/mcp   (sessionless)
```

Env: `WELLNESS_CYCLE_COACH_HOST`, `WELLNESS_CYCLE_COACH_PORT`, `WELLNESS_CYCLE_COACH_TRANSPORT=http`.

<!-- /delx-wellness header v2 -->

## Overview

Pass in period start dates (from any source — Apple Health Cycle, Garmin women's health, Fitbit female health, or direct user input) and get back the user's current phase plus phase-aware recommendations for nutrition, training, and hydration. **Stateless** — the MCP itself never persists cycle data. **Supports PCOS-aware mode via the `cycle_irregular` flag (v0.3.3)** — accepts cycles 21-90 days, caps confidence at 'low', and returns a `luteal_extended` placeholder when standard 14-day-luteal math no longer applies.

## Try It In 60 Seconds

```bash
npx -y wellness-cycle-coach doctor

# Or use the MCP directly via your client:
# {
#   "mcpServers": {
#     "wellness-cycle-coach": {
#       "command": "npx",
#       "args": ["-y", "wellness-cycle-coach"]
#     }
#   }
# }
```

Then in your agent:

```json
{
  "name": "cycle_full_report",
  "arguments": {
    "history": [
      { "start_date": "2026-04-01" },
      { "start_date": "2026-04-29" }
    ]
  }
}
```

Returns current phase + nutrition emphasize/moderate/avoid + training style/intensity + hydration target + next-period estimate.

## Tools (17)

| Tool | Purpose |
|---|---|
| `cycle_agent_manifest` | Runtime contract |
| `cycle_capabilities` | Phases, upstream connectors, metrics |
| `cycle_connection_status` | Health + stateless reminder |
| `cycle_privacy_audit` | What's logged (nothing) vs sent out (nothing) |
| `cycle_data_inventory` | Phase taxonomy + metric catalog |
| **`cycle_estimate_phase`** | **Current phase + cycle day + confidence** |
| `cycle_predict_next_period` | Average cycle length + next-period date |
| `cycle_phase_guidance` | Recommendations for any specific phase |
| **`cycle_recommend_nutrition`** | **Phase-aware nutrition for current phase** |
| **`cycle_recommend_training`** | **Phase-aware training for current phase** |
| **`cycle_full_report`** | **Single-call combined report** |
| `cycle_irregular_check` | PCOS / irregular-cycle screening from history |
| `cycle_quickstart` | Minimal getting-started walkthrough |
| `cycle_profile_get` | Read the shared Delx Wellness profile (read-only) |
| `cycle_profile_update` | Persist opt-in profile prefs (requires explicit user intent) |
| `cycle_onboarding` | 11-question onboarding flow for the shared profile |
| `cycle_demo` | Sample request/response for quick exploration |

## The 4-phase model

| Phase | When | Energy | Nutrition emphasis | Training |
|---|---|---|---|---|
| **menstrual** | days 1 → period end (~5) | Lower | Iron + magnesium + omega-3 | Restorative (yoga, walking, mobility) |
| **follicular** | post-period → ovulation - 2 | Rising / peak | Complex carbs + lean protein + fermented foods | **Build** (strength, sprints, new skills) |
| **ovulatory** | ovulation ± 1 day | Peak | Antioxidants + zinc | **Peak** (PRs, plyometrics) |
| **luteal** | ovulation + 2 → next period | Falling | B vitamins + magnesium + complex carbs | Endurance + technique |

## Why stateless?

Menstrual cycle data is **medical-record sensitive**. The strongest privacy guarantee is to never store it. Other apps (Flo, Clue) live by hoarding cycle data on their servers; this MCP refuses to participate. The agent passes data in, the coach returns guidance, the data evaporates.

## Cross-connector wedge

```
Apple Health Cycle → period dates       ┐
Garmin women's health → cycle context   ├─→ wellness-cycle-coach → phase + guidance
Fitbit female health → period dates     ┘                                  │
                                                                            │
                                                                            ↓
                                                            wellness-nourish coach
                                                            (phase-aware meal planning)
                                                                            │
                                                            whoop-mcp / garminmcp / ouramcp
                                                            (recovery-aware late-luteal load adjustments)
```

## Privacy

- ✅ **Stateless for cycle data** — period dates are never persisted; they stay in process memory for the duration of the call and evaporate.
- ✅ **Opt-in local preferences** — the `cycle_profile_*` tools can persist non-secret wellness preferences (name, goals, devices, training/nutrition context) to `~/.delx-wellness/profile.json`, but only when the user explicitly asks (`cycle_profile_update` requires `explicit_user_intent: true`). Secrets (tokens, API keys, biomarkers) are rejected at write time.
- ✅ **Offline-capable** — pure-function computation. No outbound calls.
- ✅ **Tool-arg-only cycle data** — the agent passes period history in via the MCP request and it stays in process memory.

Run `wellness-cycle-coach doctor` to inspect.

## What this is NOT

- Not medical advice or diagnosis.
- Not a fertility tracker or contraception aid (consult a clinician).
- Not a replacement for talking to a healthcare provider about painful, abnormal, or absent periods.
- PCOS / irregular cycles supported via `cycle_irregular: true` (v0.3.3), but this is NOT a substitute for clinical care — see clinician for fertility, contraception, or symptom-management decisions.
- Not specialized for perimenopause or post-pill (yet — see CONTRIBUTING.md).

## Roadmap

- **v0.2** — adapters for apple-health-mcp / garminmcp / fitbitmcp so agents can pull period history with one MCP call.
- **v0.3** — symptom logging surface + symptom-aware guidance adjustments (cramps → magnesium emphasis, mood drop → B-vitamin emphasis).
- **v0.4** — non-English locale support starting with pt-BR.

## 📧 Contact & Support

- 📨 **support@delx.ai** — general questions, integration help, partnerships
- 🐛 **Bug reports / feature requests** — [GitHub Issues](https://github.com/davidmosiah/wellness-cycle-coach/issues)
- 🐦 **Updates** — [@delx369](https://x.com/delx369) on X
- 🌐 **Site** — [wellness.delx.ai](https://wellness.delx.ai)


## License

MIT — see [LICENSE](LICENSE).

<sub>wellness-cycle-coach is independent research-software. Not affiliated with Clue, Flo, Stardust, or any other cycle-tracking app. Not medical advice.</sub>
