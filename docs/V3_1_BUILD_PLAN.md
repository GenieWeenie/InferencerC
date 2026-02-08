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
