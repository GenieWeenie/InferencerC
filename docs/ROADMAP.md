# InferencerC Roadmap

Short, living view of what's next and what's done. Detailed history: [PASS_LEDGER_215_540.md](PASS_LEDGER_215_540.md), [V3_1_BUILD_PLAN.md](V3_1_BUILD_PLAN.md). Per-release details: [GitHub Releases](https://github.com/GenieWeenie/InferencerC/releases).

**Tracked in Linear:** [InferencerC project](https://linear.app/genies-lamp/project/inferencerc-2e98f74226cc).

---

## Next

### Coverage & testing
- **Renderer service tests:** 15 renderer services still at 0% coverage — highest-value targets: `exportService.ts`, `encryption.ts`, `backendHealth.ts`, `conversationAnalytics.ts`, `conversationTree.ts`, `github.ts`, `commandRegistry.ts`.
- **Server integration tests:** `server/index.ts` (500 lines, 0%) — test Express routes via supertest or extract utility functions.
- **Hook tests:** 14 chat hooks at 0% — extract testable logic from `useChat.ts`, `useChatSendOrchestrator.ts`, `useChatStreaming.ts`, `useConversationTree.ts`.
- **Raise coverage thresholds:** Currently 40/30/40/40 — target 50/40/50/50 once the above are addressed.

### Dependencies
- **Evaluate major upgrades:** jest 29→30, eslint 9→10, tailwindcss 3→4, lucide-react 0.562→0.576. Each is a separate migration.

### Infrastructure
- **GitHub branch protection:** Enable on `master` when repo goes public (require PR + CI status check).

---

## Later

- **E2E / Playwright smoke tests:** Expand `qa:smoke:ui` to cover critical user flows (new chat, model switch, MCP connect, export).
- **Performance benchmarks:** Formalize `benchmark:search-index` and add startup-time tracking.
- **Plugin ecosystem:** Validate third-party plugin loading, add more sample plugins.

---

## Done

- Update patch/minor dependencies, 0 npm audit vulnerabilities (GEN-162).
- Expand coverage to renderer services/lib; raise thresholds to 40/30/40/40 (GEN-161).
- Add tests for ModelDownloadService and ModelManager (GEN-160).
- Add tests for workspaceMemory, kpiLogger, workflow execution history (GEN-157, GEN-158, GEN-159).
- Update ROADMAP to reflect current state (GEN-156).
- Branch cleanup: deleted stale auto-claude/* and merged remote branches (GEN-155).
- Fix jspdf high-severity npm audit vulnerability (GEN-154).
- M4 / Slice D: approved-actions mode, workflow run history + rerun UX, workspace memory boundaries and context controls (GEN-147, GEN-151, GEN-152, GEN-153).
- Optional KPI logging: local-only tracking of first success, crash-free sessions, weekly activity (GEN-148).
- Server/main test coverage raised: logger, LMStudio adapter, web service (GEN-144).
- CI coverage gate: Jest coverageThreshold enforced in CI (GEN-145).
- Branch hygiene documented in CONTRIBUTING.md (GEN-146).
- Docs & repo: ROADMAP, AGENTS.md, CONTRIBUTING updates (GEN-149, GEN-150).
- Storage & persistence hardening (passes 397–540); regression tests for parsing/hydration.
- OpenRouter billing v2: authoritative view, reconciliation, CSV export, cached trend history.
- Chat: long-message minimize, bulk collapse; stabilized model selection and analytics.
- Quality gates: tag/version match, release gate (tests + build + UI smoke), ESLint/TypeScript-ESLint.
- Typing & perf: chat hook extraction, removal of any casts, server/shared hardening (passes 305–396).
- Docs: shortened README, CONTRIBUTING, roadmap ledger, improvement roadmap.
