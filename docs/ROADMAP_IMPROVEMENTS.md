# InferencerC — Improvement Roadmap

**Date:** March 2, 2026  
**Context:** ~3 weeks after project creation; review of GitHub (local view), project layout, tests, CI, and docs to suggest concrete improvements.

---

## 1. What’s Been Done (Last ~3 Weeks)

Summary of recent work from commit history (date range roughly **Feb 10–18, 2026**):

- **Reliability & storage:** Large hardening pass (passes 397–540): storage parse/hydration guards, mutation sanitization, persistence hooks, session/MCP/privacy/notion guards. Regression tests added for storage parsing.
- **Billing & settings:** Authoritative OpenRouter billing v2: billing view, reconciliation, freshness controls, CSV export, cached/paginated trend history. Roadmap items #2 and #3 completed.
- **Chat UX:** Long-message minimize and bulk collapse; stabilized model selection, analytics attribution, and code UX; live OpenRouter usage (synthetic alternatives removed).
- **Quality gates:** Tag/package version match enforced before builds; release gate (tests + build + UI smoke); ESLint aligned with TypeScript-ESLint peer deps.
- **Docs & repo:** README shortened for first-time visitors; “About the author”; branch-protection note (public repo / Pro); roadmap ledger synced; archived docs; broader `.gitignore`; Electron/electron-rebuild bump to 4.0.19.
- **Typing & perf (earlier in window):** Passes 305–396: chat hook extraction, overlay/settings splits, removal of `any` casts, hardened server/shared typings, storage parsing and regression tests.

**Classification:** Mix of **tech debt / reliability** (storage guards, typing, CI) and **net-new** (billing v2, collapse controls, release automation). Few explicit bugfix commits; many “fix” scopes are stabilization (e.g. chat, inspector/usage).

---

## 2. Current State Snapshot

| Area | Status |
|------|--------|
| **Tests** | 88 suites, 467 tests, all passing. Jest + React Testing Library. |
| **Coverage** | ~37% statements, ~29% branches, ~44% functions. Server/main and several adapters at 0% (e.g. `server/index.ts`, `lmstudio.ts`, `web.ts`, `logger.ts`, `model-download.ts`, `downloader.ts`). |
| **Lint** | ESLint passes on `src/**` and `__tests__/**`. |
| **TypeScript** | `typecheck` (renderer + node) passes. |
| **CI** | Runs: `npm ci` → tests (`--runInBand`) → lint → typecheck → build → UI smoke QA (Playwright). Artifacts uploaded. |
| **Docs** | README concise; CONTRIBUTING clear; PASS_LEDGER and V3_1_BUILD_PLAN are active progress sources; `docs/project-history/` is archive. |
| **Branches** | `master` + several `auto-claude/*` branches; sampled branches have no commits ahead of `master` (merged or abandoned). |

**Minor:** `npm run lint` / `npm run typecheck` show: `Unknown env config "devdir"` (npm config warning, not project code).

---

## 3. Recommended Improvements

### 3.1 Tests & Coverage

- **Raise coverage where it’s zero or very low**  
  - Add unit or integration tests for: `server/index.ts` (critical paths only), `server/adapters/lmstudio.ts`, `server/adapters/web.ts`, and shared server utilities (`logger`, `downloader`, `model-download` if used in testable ways).  
  - Even partial coverage (e.g. 30–50% on main process) will catch regressions and document intended behavior.

- **Keep regression tests for storage/parsing**  
  - The storage parse/hydration and mutation-sanitization work is well supported by tests; continue the same pattern for any new persistence or IPC surfaces.

- **Optional: coverage gates in CI**  
  - Add a step that fails if statement (or branch) coverage drops below a threshold (e.g. 40% statements), or only for certain directories (e.g. `src/`). Start with a low bar and raise it over time.

### 3.2 CI & Release

- **Keep the current pipeline**  
  - Test → lint → typecheck → build → UI smoke is strong. No change required unless you add more platforms (e.g. Linux) or signing variants.

- **Branch hygiene**  
  - Delete or archive merged/abandoned `auto-claude/*` branches so the default branch list stays clear. Prefer short-lived feature branches and delete after merge (as in CONTRIBUTING).

- **GitHub (in browser)**  
  - Since API access wasn’t available during this review: check **Issues** and **Pull requests** for open items, and **Actions** for recent CI runs. Enable branch protection on `master` (require PR + status checks, e.g. “CI / validate”) when the repo is public or you have Pro.

### 3.3 Codebase & Maintainability

- **npm “devdir” warning**  
  - If you don’t rely on `devdir`, remove it from `.npmrc` or environment; otherwise set it explicitly to avoid the warning in future npm majors.

- **Single, living roadmap in the repo**  
  - README already points to “Roadmap” and “Per-release details: GitHub Releases.” Consider keeping one **short** roadmap file (e.g. `docs/ROADMAP.md`) with 5–10 bullets: “Next: …”, “Later: …”, “Done: …”, and link it from README. Use PASS_LEDGER and V3_1_BUILD_PLAN for detailed pass/implementation history so the main roadmap stays readable.

- **AGENTS.md (optional)**  
  - No AGENTS.md found. If you use Cursor/Codex or other agent workflows, a short AGENTS.md (project layout, how to run tests/build, where to add tests, branch rules) can keep AI-assisted changes aligned with CONTRIBUTING and this roadmap.

### 3.4 Product / Features (from V3_1_BUILD_PLAN)

- **M3–M4 and Slice D**  
  - M3 (reliability) is largely in place (smoke QA, guards, recovery). M4 (workflow depth) and remaining Slice D items are the natural next focus.

- **KPIs**  
  - If you track “first success time,” “crash-free sessions,” “weekly retained users,” etc., consider a lightweight way to log or sample them (e.g. anonymous metrics or local-only stats) so you can measure progress.

---

## 4. Quick Wins (Next 1–2 Weeks)

1. **Coverage:** Add one small test file for a 0%-coverage server module (e.g. `server/adapters/lmstudio.ts` or a shared util) and run `npm run test:coverage` to confirm the number moves.
2. **Branches:** Delete or document the `auto-claude/*` branches that are no longer needed.
3. **Docs:** Add a 5–10 bullet `docs/ROADMAP.md` and link it from README (or fold “Roadmap” in README into that file and link “Short-term / Mid-term” there).
4. **npm:** Resolve or document the `devdir` npm config to clear the warning.

---

## 5. Summary

The project is in good shape: **tests and CI are strong**, **typing and storage hardening are well advanced**, and **billing v2 and release automation are in place**. The highest-leverage improvements are **raising test coverage on the server/main layer**, **tidying branches and GitHub settings**, and **keeping one short, visible roadmap** so “what’s next” is obvious without digging into the full build plan.

---

*Generated from local repo inspection (git log, npm scripts, CI config, test run, coverage, and docs). For up-to-date issues and PRs, check the repo on GitHub.*
