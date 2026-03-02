# InferencerC Roadmap

Short, living view of what’s next and what’s done. Detailed history: [PASS_LEDGER_215_540.md](PASS_LEDGER_215_540.md), [V3_1_BUILD_PLAN.md](V3_1_BUILD_PLAN.md). Per-release details: [GitHub Releases](https://github.com/GenieWeenie/InferencerC/releases).

**Tracked in Linear:** [InferencerC project](https://linear.app/genies-lamp/project/inferencerc-2e98f74226cc) (issues GEN-144–GEN-150).

---

## Next

- Raise server/main test coverage (adapters, logger, critical paths).
- CI coverage gate: fail or warn if coverage drops below threshold.
- Branch hygiene: delete or archive merged/abandoned `auto-claude/*` branches.
- M4 / Slice D: workflow depth, approved-actions mode, workflow run history, workspace memory.

---

## Later

- Optional: lightweight KPI logging (first success time, crash-free sessions) for product decisions.
- GitHub: enable branch protection on `master` when repo is public (require PR + “CI / validate”).

---

## Done

- Storage & persistence hardening (passes 397–540); regression tests for parsing/hydration.
- OpenRouter billing v2: authoritative view, reconciliation, CSV export, cached trend history.
- Chat: long-message minimize, bulk collapse; stabilized model selection and analytics.
- Quality gates: tag/version match, release gate (tests + build + UI smoke), ESLint/TypeScript-ESLint.
- Typing & perf: chat hook extraction, removal of `any` casts, server/shared hardening (passes 305–396).
- Docs: shortened README, CONTRIBUTING, roadmap ledger, improvement roadmap.
