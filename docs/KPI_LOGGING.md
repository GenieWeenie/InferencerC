# KPI Logging (Local-Only)

Optional local-only KPI logging for product decisions: **first success time**, **crash-free sessions**, and **weekly retained users**. All data is stored in the renderer’s `localStorage` under `app_kpi_stats`; no network calls.

**Module:** `src/renderer/lib/kpiLogger.ts`

**Usage:** Import and call from the renderer when appropriate:

- **`recordFirstSuccess()`** — Call once when the user achieves a first “success” (e.g. first successful inference or first completed flow). Idempotent; use to measure time-to-first-success.
- **`recordSessionStart()`** — Call when a session starts (e.g. app or chat window open). Use with `recordSessionEnd(cleanExit)` to measure sessions.
- **`recordSessionEnd(cleanExit: boolean)`** — Call on exit (e.g. `beforeunload`). Pass `true` for a normal close, `false` after a crash; combine with recovery logic (e.g. `app_recovery_clean_exit`) to compute crash-free session rate.
- **`getKpiSnapshot()`** — Returns `{ firstSuccessAt, totalSessions, crashFreeSessions, weeksWithActivity }` for dashboards or export. Use `weeksWithActivity` (ISO week keys like `"2026-W09"`) to derive weekly retention.

**Product use:** Inspect `getKpiSnapshot()` in devtools, or add a small debug/settings export that writes the snapshot to a file or clipboard. No UI is required by default; the module is opt-in and can be wired where first success and session lifecycle are already handled.
