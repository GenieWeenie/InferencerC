# InferencerC v3.1 Build Plan

## Goal
Make InferencerC a serious daily-driver competitor by focusing on:

1. Faster time-to-first-success
2. Better trust and transparency
3. Higher runtime reliability

## Product Positioning (v3.1)

- **Core lane:** Local-first AI workspace for power users and small teams
- **Differentiator:** Transparent execution and predictable behavior
- **Non-goal:** Expanding feature count without quality gates

## KPIs (Track Weekly)

1. **First success time:** median under 2 minutes
2. **Crash-free sessions:** above 99.5%
3. **Weekly retained users:** improve by 20% from v3.0 baseline
4. **Workflow reuse:** at least 3 repeated workflows per active user
5. **Support friction:** fewer setup-related failures and “white screen” regressions

## Milestones

### M1 - Onboarding and Readiness (Week 1-2)

1. Launch checklist in chat empty state
2. Better startup diagnostics for provider/model readiness
3. First-run prompts that map to common tasks

### M2 - Trust Surface (Week 2-3)

1. Persistent API activity log (request/response/error)
2. Copy/export from activity log for debugging
3. Per-message trace metadata (model, latency, token summary)

### M3 - Reliability Hardening (Week 3-4)

1. Smoke QA automation in CI for primary user paths
2. Guardrails for lazy-loaded pages and missing modules
3. Recovery and session-restore polish

### M4 - Workflow Depth (Week 4-6)

1. “Approved actions” mode for high-impact workflow operations
2. Better workflow run history and rerun UX
3. Workspace memory boundaries and context controls

## First Implementation Slices

1. **Slice A (this release):**
   - Launch checklist in chat
   - Persistent API activity log
2. **Slice B:**
   - Activity log export/copy bundle
   - Startup diagnostics badge with actionable fix links
3. **Slice C:**
   - QA smoke test script + release gate
4. **Slice D (v3.1.2):**
   - Lazy-load secondary UI panels to reduce startup bundle pressure
   - Keep lazy import retry/reload guard for page-level failures

## Current Progress

1. `Slice A` implemented.
2. `Slice B` implemented.
3. `Slice C` implemented.
4. `Slice D` in progress.
   - Pass 1: secondary app-shell modules lazy-loaded in `App.tsx`.
   - Pass 2: optional chat dialogs/panels lazy-loaded and mounted only when opened.
   - Pass 3: export pipeline loads PDF/DOCX libraries on demand (shrinks `ExportDialog` chunk).
   - Pass 4: jsPDF optional HTML plugin dependencies stubbed to avoid bundling heavy unused paths.
   - Pass 5: chat message rendering/actions moved to lazy chunks (loads on first real message).
   - Pass 6: split chat display helpers into `chatDisplayUtils` to keep non-renderer chat utility paths lighter.
   - Pass 7: remove ineffective dynamic imports in `useChat` for services already loaded elsewhere.
   - Pass 8: add explicit Vite vendor `manualChunks` to break oversized renderer bundles and improve cacheability.
   - Pass 9: defer full API activity-log hydration until log panel open; keep instant badge count via lightweight metadata.
   - Pass 10: replace integration-availability service imports with lightweight local config checks; load integration services only on action click.
   - Pass 11: extract chat empty-state + launch checklist into a lazy component mounted only for zero-history sessions.
   - Pass 12: extract diagnostics popover into a lazy component so diagnostics UI code loads only when the panel opens.
   - Pass 13: lazy-load the performance monitor overlay and mount it only when dev monitors are enabled.
   - Pass 14: remove uuid runtime usage from prompt storage hook and switch to native ID generation with lazy-safe localStorage hydration.
   - Pass 15: lazy-load gesture runtime service from `useGestures` so touch/trackpad gesture code is deferred until gesture hooks are enabled.
   - Pass 16: defer conversation-tree manager module load until branching is enabled; keep tree sync/view hooks functional once enabled.
   - Pass 17: defer analytics store import and usage-history hydration until the Analytics dashboard is opened.
   - Pass 18: defer activity-log service import until logs are opened or new entries arrive; keep badge count from lightweight persisted count.
   - Pass 19: defer context-management service import until context tooling is actually used (history present, controls opened, or project-context feature enabled).
   - Pass 20: remove unconditional project-context service preload at chat mount; restore feature state via lightweight persisted flag and load service only when project context is used.
   - Pass 21: defer cloud-sync service import/polling until cloud sync UI is opened or an authenticated cloud profile is detected from lightweight local config.
   - Pass 22: defer MCP client bootstrap in Chat until MCP servers are actually configured, using a lightweight local config snapshot instead of unconditional idle initialization.

## Release Checklist for v3.1.x

1. Feature branch + PR
2. CI green (`test`, `build`)
3. Manual chat flow QA:
   - open app
   - model/provider ready
   - send first prompt
   - navigate Models and Settings
4. Tag release and verify artifacts

## Risks and Mitigations

1. **Too many parallel features:** ship slices, not giant drops
2. **UI clutter:** remove or hide low-usage controls from default surface
3. **Regression risk in Chat page:** keep changes incremental and covered by smoke QA
