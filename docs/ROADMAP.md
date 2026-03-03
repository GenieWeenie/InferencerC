# InferencerC Roadmap

Short, living view of what's next and what's done. Detailed history: [PASS_LEDGER_215_540.md](PASS_LEDGER_215_540.md), [V3_1_BUILD_PLAN.md](V3_1_BUILD_PLAN.md). Per-release details: [GitHub Releases](https://github.com/GenieWeenie/InferencerC/releases).

**Tracked in Linear:** [InferencerC project](https://linear.app/genies-lamp/project/inferencerc-2e98f74226cc) (GEN-154–GEN-162).

---

## Next

- Add tests for new renderer modules: `workspaceMemory.ts`, `kpiLogger.ts`, workflow execution history/rerun/approved-actions (GEN-157, GEN-158, GEN-159).
- Add tests for server 0%-coverage files: `index.ts`, `downloader.ts`, `model-download.ts` (GEN-160).
- Include renderer services/lib in coverage collection so new tests count toward the gate (GEN-161).
- Update outdated dependencies: patch/minor batch, then evaluate major upgrades (jest 30, eslint 10, tailwindcss 4) (GEN-162).

---

## Later

- GitHub: enable branch protection on `master` when repo is public (require PR + "CI / validate").

---

## Done

- Fix jspdf high-severity npm audit vulnerability (GEN-154).
- Branch cleanup: deleted stale `auto-claude/*` local branches and merged remote branches (GEN-155).
- M4 / Slice D: approved-actions mode, workflow run history + rerun UX, workspace memory boundaries and context controls (GEN-147, GEN-151, GEN-152, GEN-153).
- Optional KPI logging: local-only tracking of first success, crash-free sessions, weekly activity (GEN-148).
- Server/main test coverage raised: logger, LMStudio adapter, web service (GEN-144).
- CI coverage gate: Jest `coverageThreshold` enforced in CI (GEN-145).
- Branch hygiene documented in CONTRIBUTING.md (GEN-146).
- Docs & repo: ROADMAP, AGENTS.md, CONTRIBUTING updates (GEN-149, GEN-150).
- Storage & persistence hardening (passes 397–540); regression tests for parsing/hydration.
- OpenRouter billing v2: authoritative view, reconciliation, CSV export, cached trend history.
- Chat: long-message minimize, bulk collapse; stabilized model selection and analytics.
- Quality gates: tag/version match, release gate (tests + build + UI smoke), ESLint/TypeScript-ESLint.
- Typing & perf: chat hook extraction, removal of `any` casts, server/shared hardening (passes 305–396).
- Docs: shortened README, CONTRIBUTING, roadmap ledger, improvement roadmap.
