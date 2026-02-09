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
   - Pass 23: remove Chat's mount-time responsive-design service import; use local resize-driven breakpoint updates with preserved document breakpoint classes.
   - Pass 24: defer prompt-variable service import on send unless input text matches variable syntax (`{{...}}`) to reduce first-send overhead for plain prompts.
   - Pass 25: defer onboarding-service initialization to browser idle time on first-run paths, avoiding mount-time import pressure during initial chat startup.
   - Pass 26: in `useChat`, defer credential-service/key hydration to idle and skip it entirely when no OpenRouter credential marker exists, while still reacting immediately to `credentials-updated` events.
   - Pass 27: in `useChat`, skip team-workspace service import during model refresh unless an active workspace is detected via lightweight local storage markers; apply model-policy filtering only when needed.
   - Pass 28: remove `teamWorkspacesService` import from the `useChat` model-refresh path entirely by applying workspace model-policy filtering directly from lightweight persisted workspace data.
   - Pass 29: remove Chat's mount-time `githubService` import for credential-state hydration; use lightweight GitHub credential markers/legacy keys for `githubConfigured` snapshots and reserve `githubService` import for actual GitHub actions.
   - Pass 30: in `history`, defer `encryptionService` module loading (and worker/secure-storage chain) until encrypt/decrypt session paths are used, keeping non-encrypted chat startup lighter.
   - Pass 31: in `history`, defer search-index module loading and batch session index upsert/delete operations to idle-time flushes, preventing synchronous indexing work on hot save/delete paths.
   - Pass 32: in `useChat` autosave, load existing session data once per save cycle instead of per-message `getSession` calls, reducing repeated storage parse overhead during active conversations.
   - Pass 33: in `useChat` autosave, skip session fallback reads entirely when in-memory loaded-message coverage already matches history length, avoiding unnecessary storage fetch/parse work on normal chats.
   - Pass 34: in `useChat` autosave, replace full `getAllSessions()` re-hydration with an in-memory metadata patch/reorder for the active session, avoiding repeated full history parsing on each save tick.
   - Pass 35: in `useChat` autosave, bypass per-message reconstruction and persist `history` directly when all messages are already loaded, keeping the heavier merge path only for lazy-placeholder sessions.
   - Pass 36: in `useChat`, replace rename/pin post-action `getAllSessions()` reloads with local `savedSessions` patch updates to remove avoidable storage parse work during history management actions.
   - Pass 37: in `useChat`, replace new/delete session post-action `getAllSessions()` reloads with local `savedSessions` patch updates, reducing unnecessary full history reads on session lifecycle actions.
   - Pass 38: in `useChat`, split one-time session bootstrap from model polling so OpenRouter credential refreshes no longer rerun `getAllSessions()` + `loadSession`, preventing redundant history rehydration and session churn on key updates.
   - Pass 39: in `history`, add a storage-value-keyed in-memory session-metadata cache so hot paths (`saveSession`, `deleteSession`, `renameSession`, `togglePinSession`) stop repeatedly reparsing the full metadata JSON on every operation.
   - Pass 40: in `history`, update `renameSession`/`togglePinSession` to patch split-storage session files directly (without `getSession` hydration), avoiding expensive chunk-content rehydration for metadata-only actions.
   - Pass 41: in `useChat`, build webhook `conversation_complete` payloads from in-memory history snapshots when all messages are already loaded, and only fall back to `HistoryService.getSession()` for lazy-placeholder sessions.
   - Pass 42: in `useChat`, cache full loaded session messages in refs and reuse them for autosave/webhook fallback reconstruction, avoiding repeated `HistoryService.getSession()` reads on lazy-placeholder sessions.
   - Pass 43: in `history`, dedupe chunk-content writes via an in-memory chunk cache so unchanged large message chunks are not re-written to `localStorage` every autosave pass.
   - Pass 44: in `history`, cache parsed split-session blobs by raw value so repeated `getSession()` calls can skip redundant `JSON.parse` work when session storage hasn’t changed.
   - Pass 45: in `history`, track chunk keys per session in-memory and prune stale chunk keys during saves, while merging with storage scans on delete to clean orphan chunk data from previous runtimes.
   - Pass 46: in `history`, track chunk content type (`plain` vs `json`) per key so chunk loads avoid repeated `JSON.parse` exceptions for plain text and preserve string fidelity for newly written JSON-looking text chunks.
   - Pass 47: in `history`, cache message size/chunking decisions by message reference (`WeakMap`) so autosave avoids repeated blob-size computations for unchanged messages.
   - Pass 48: in `history`, cache chunked-message indexes per split-session blob and hydrate only those indexes in `getSession()`, avoiding full-message chunk checks on every read.
   - Pass 49: in `history`, move storage migrations off synchronous module load and schedule them on idle (with immediate timeout fallback) to reduce startup blocking work.
   - Pass 50: in `history`, serve chunked message payload reads from the in-memory chunk cache before `localStorage`, reducing repeated storage reads during hot `getSession()` hydration loops.
   - Pass 51: in `history`, persist split/chunk migration completion markers so post-upgrade launches skip full migration scans once data has already been normalized.
   - Pass 52: in `history`, remove redundant save/patch scans by collecting chunked indexes during `saveSession` and reusing cache-backed session parses for metadata-only patch writes.
   - Pass 53: in `history`, switch metadata update paths to copy-on-write array/object updates (instead of pre-cloning whole metadata lists) and skip no-op split-session rewrites when patched content is unchanged.
   - Pass 54: batch deferred search-index operations into a single index load/save cycle per flush (instead of per-operation load/save), reducing storage parse/stringify churn during autosave-heavy periods.
   - Pass 55: in `searchIndex`, add a raw-keyed in-memory index cache so repeated search/index operations reuse parsed index objects when storage is unchanged, eliminating repeated `JSON.parse` work on hot query/update paths.
   - Pass 56: in `searchIndex` batch apply, detect no-op upsert/delete operations (unchanged term set or missing session delete) and skip unnecessary index mutations plus storage writes.
   - Pass 57: in `searchIndex`, replace large concatenated full-text tokenization with segment-based term extraction (title + message strings) to reduce temporary string allocation/GC pressure during indexing.
   - Pass 58: in `searchIndex`, add a bounded in-memory tokenize cache (LRU-style eviction) so repeated text tokenization across search/index flows avoids redundant regex/split/filter work.
   - Pass 59: in `searchIndex`, optimize AND-search intersection by deduping query terms, ordering by smallest posting list first, and short-circuiting when any term has zero candidates.
   - Pass 60: in `searchIndex`, cache per-term posting `Set`s (keyed by posting-array identity and invalidated on index reload/save) so repeated multi-term searches avoid rebuilding identical membership sets each query.
   - Pass 61: in `searchIndex`, replace iterative result-set pruning with a single scan over the smallest posting list plus cached membership checks for remaining terms, cutting mutation overhead during multi-term intersection.
   - Pass 62: in `searchIndex`, change term removal to in-place splice only when the session ID exists (instead of always rebuilding arrays with `filter`), reducing allocation churn during upsert/delete index maintenance.
   - Pass 63: in `searchIndex`, replace per-query posting-list sort with a linear smallest-list selection plus early missing-term exit, reducing temporary object allocation and sort cost on hot multi-term searches.
   - Pass 64: in `searchIndex`, streamline smallest-list intersection setup by tracking only the smallest term index and building remaining membership sets directly from `queryTerms`, removing intermediate `remainingTerms` object allocation.
   - Pass 65: in `searchIndex`, switch session-removal term scanning from callback-based iteration to indexed loops in `_removeSessionFromIndex`, trimming closure overhead on frequent upsert/delete maintenance paths.

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
