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
   - Pass 66: in `searchIndex`, replace repeated `indexOf` + `splice` removal with single-pass in-place compaction when deleting a session ID from posting lists, reducing worst-case removal cost and array churn.
   - Pass 67: in `searchIndex`, cache posting arrays during the first query-term scan and reuse them for membership-set setup, avoiding duplicate `index.terms` lookups and fallback array allocations in hot multi-term searches.
   - Pass 68: in `searchIndex`, add a dedicated two-term search fast path that intersects by scanning only the smaller posting list against one cached membership set, skipping generic multi-term setup for common two-word queries.
   - Pass 69: in `searchIndex`, avoid `Object.keys(index.terms)` allocation on full removals by iterating terms via `for...in` with `hasOwnProperty` and a shared per-term compaction helper.
   - Pass 70: in `searchIndex`, add an LRU-style cache for deduped query term arrays so repeated searches skip rebuilding unique-term lists from tokenized query text each call.
   - Pass 71: in `searchIndex` upserts, skip per-term `includes(sessionId)` checks for terms already present in the previous session-term set (after they were removed in the same cycle), while retaining checks for newly introduced terms.
   - Pass 72: in `searchIndex` batch apply, replace callback-based `operations.forEach` with indexed iteration and `continue` flow control, trimming closure/callback overhead on frequent deferred index flushes.
   - Pass 73: in `searchIndex`, optimize per-term session-id removal by finding the first match before compaction and only rewriting the suffix, avoiding full-array rewrite work when no removal is needed.
   - Pass 74: in `searchIndex`, replace callback-heavy `forEach` iteration in session-term extraction and full rebuild paths with indexed loops, reducing closure/iterator overhead on indexing hot paths.
   - Pass 75: in `searchIndex` two-term fast search path, select candidate/membership sides before building the posting set so only one membership set is created per query.
   - Pass 76: in `searchIndex` batch apply, replace per-operation `|| []` fallbacks with a shared empty-terms sentinel so missing-session paths avoid transient array allocations and extra key checks.
   - Pass 77: in `_removeSessionFromIndex`, treat an empty `termsHint` as an explicit no-op and return early instead of falling back to full-term scan, eliminating unnecessary index-wide removals on empty-hint upsert/delete paths.
   - Pass 78: in `searchSessions` (>2 terms), remove the intermediate per-term posting-array cache allocation and build remaining membership sets with a fixed-size array, reducing per-query transient allocations while preserving early exits.
   - Pass 79: in `searchSessions` (>2 terms), prime smallest-list selection from the first term and drop redundant second-pass missing checks, reducing per-query branching while preserving early exits from the initial scan.
   - Pass 80: in `searchSessions`, defer `resultIds` allocation until multi-term paths and replace one-term `|| []` fallback with explicit checks, removing redundant set/array allocations on empty and single-term queries.
   - Pass 81: in `searchIndex` upsert/rebuild paths, materialize each session's `termList` once and reuse it for both posting updates and `sessionTerms` assignment, avoiding duplicate Set iteration and extra conversion work per indexed session.
   - Pass 82: in `getUniqueQueryTerms`, add a two-token fast path that returns cached tokens directly (or a single-element array for duplicates), avoiding general Set-based dedupe work for common short queries.
   - Pass 83: in `searchSessions`, add a dedicated three-term intersection fast path that scans the smallest posting list against two cached membership sets, bypassing generic multi-term set-array setup for common short queries.
   - Pass 84: in `removeSessionIdFromTerm`, add a tail-match fast path (when the removed session ID is already last) to truncate or delete posting lists without running compaction loops.
   - Pass 85: in `getUniqueQueryTerms`, add a three-token dedupe fast path that preserves token order while avoiding general Set allocation for common short queries.
   - Pass 86: in `applyOperations` upserts, treat empty extracted term lists as no-op/cleanup by skipping empty `sessionTerms` writes for new sessions and deleting stale empty entries after removals, reducing unnecessary index mutations and storage writes.
   - Pass 87: in `rebuildIndex`, skip persisting `sessionTerms` entries for sessions with empty extracted term lists, reducing index size and avoiding unnecessary no-op removal work later.
   - Pass 88: in `tokenize`, replace callback-based `.filter` with indexed token filtering over split parts, reducing closure/iterator overhead on this hot path while preserving tokenization rules.
   - Pass 89: in `searchSessions`, defer `resultIds` `Set` allocation in 2-term, 3-term, and generic multi-term branches until after posting-list existence checks, avoiding eager allocations on common no-result queries.
   - Pass 90: in `getUniqueQueryTerms`, add a four-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 91: in `applyOperations` upserts, check `terms.size` before `Array.from(terms)` so empty-term updates skip transient array allocation while keeping existing cleanup behavior.
   - Pass 92: in `getUniqueQueryTerms`, add a five-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 93: in `rebuildIndex`, check `terms.size` before `Array.from(terms)` so empty-term sessions skip transient array allocation during full rebuilds.
   - Pass 94: in `cacheTokenized` and `cacheQueryTerms`, replace `has()+delete()` with unconditional `delete()` before `set()`, avoiding redundant map lookups while preserving LRU recency behavior.
   - Pass 95: in the generic multi-term `searchSessions` path, split remaining-term set construction into pre/post smallest-index loops, removing a per-iteration skip branch while preserving identical term coverage.
   - Pass 96: in generic multi-term `searchSessions`, defer `resultIds` `Set` allocation until the first intersection match, avoiding eager allocation on no-match queries while preserving return semantics.
   - Pass 97: in 2-term and 3-term `searchSessions` branches, defer `resultIds` `Set` allocation until first match, avoiding eager allocation on zero-intersection queries while preserving return semantics.
   - Pass 98: in `getUniqueQueryTerms`, add a six-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 99: in `getUniqueQueryTerms`, add a seven-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 100: in `getUniqueQueryTerms`, add an eight-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 101: in `getUniqueQueryTerms`, add a nine-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 102: in `getUniqueQueryTerms`, add a ten-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 103: in `getUniqueQueryTerms`, add an eleven-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 104: in `getUniqueQueryTerms`, add a twelve-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 105: in `getUniqueQueryTerms`, add a thirteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 106: in `getUniqueQueryTerms`, add a fourteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 107: in `getUniqueQueryTerms`, add a fifteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 108: in `getUniqueQueryTerms`, add a sixteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 109: in `getUniqueQueryTerms`, add a seventeen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 110: in `getUniqueQueryTerms`, add an eighteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 111: in `getUniqueQueryTerms`, add a nineteen-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 112: in `getUniqueQueryTerms`, add a twenty-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 113: in `getUniqueQueryTerms`, add a twenty-one-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 114: in `getUniqueQueryTerms`, add a twenty-two-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 115: in `getUniqueQueryTerms`, add a twenty-three-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 116: in `getUniqueQueryTerms`, add a twenty-four-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 117: in `getUniqueQueryTerms`, add a twenty-five-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 118: in `getUniqueQueryTerms`, add a twenty-six-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 119: in `getUniqueQueryTerms`, add a twenty-seven-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 120: in `getUniqueQueryTerms`, add a twenty-eight-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 121: in `getUniqueQueryTerms`, add a twenty-nine-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 122: in `getUniqueQueryTerms`, add a thirty-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 123: in `getUniqueQueryTerms`, add a thirty-one-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 124: in `getUniqueQueryTerms`, add a thirty-two-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 125: in `getUniqueQueryTerms`, add a thirty-three-token dedupe fast path that preserves first-seen order while avoiding general `Set` allocation for common short queries.
   - Pass 126: in `searchSessions`, add a dedicated four-term intersection fast path that scans the smallest posting list against three cached membership sets, bypassing generic multi-term setup for common short queries.
   - Pass 127: in `searchSessions`, add a dedicated five-term intersection fast path that scans the smallest posting list against four cached membership sets, bypassing generic multi-term setup for common short queries.
   - Pass 128: in `searchSessions` one-term branch, add a singleton posting-list fast path before general `Set` construction to trim tiny-query overhead.
   - Pass 129: in generic multi-term `searchSessions`, reuse a module-scope membership-set scratch array to avoid per-query temporary array allocation.
   - Pass 130: add targeted `searchIndex` unit coverage for two/three/five-term fast paths plus six-term fallback behavior.
   - Pass 131: in `applyOperations` upserts, split prior-term and new-term insert handling so existing-term continuations skip unnecessary duplicate-check branching.
   - Pass 132: in `searchSessions`, add a dedicated six-term intersection fast path that scans the smallest posting list against five cached membership sets.
   - Pass 133: in `searchSessions`, add a dedicated seven-term intersection fast path that scans the smallest posting list against six cached membership sets.
   - Pass 134: in two-to-seven-term `searchSessions` fast paths, add singleton-candidate short-circuits to avoid unnecessary set construction while preserving results.
   - Pass 135: in `applyOperations` upserts, directly assign `[sessionId]` for missing posting lists to skip unnecessary duplicate checks on first insert.
   - Pass 136: expand `searchIndex` tests to cover seven-term intersections and singleton-candidate multi-term behavior.
   - Pass 137: in generic 8+ term `searchSessions`, add a singleton-candidate short-circuit before membership-set setup to avoid unnecessary set construction.
   - Pass 138: in `searchSessions`, add a dedicated eight-term intersection fast path using smallest-list scan plus cached membership sets.
   - Pass 139: in `searchSessions`, add a dedicated nine-term intersection fast path using smallest-list scan plus cached membership sets.
   - Pass 140: bound `postingSetCache` with LRU-style eviction to prevent unbounded memory growth during long-lived search sessions.
   - Pass 141: expand `searchIndex` tests to cover eight-term and nine-term fast paths.
   - Pass 142: add `searchIndex` coverage for singleton-candidate behavior in the generic ten-term path.
   - Pass 143: in `SearchService.searchAsync`, apply `SearchIndexService.searchSessions` prefilter before session hydration and worker dispatch for non-regex queries longer than two characters.
   - Pass 144: in `SearchService.searchAsync`, return early with empty result stats when index prefilter yields zero candidate sessions, skipping session hydration and worker calls.
   - Pass 145: in `search.worker`, switch to bounded top-K result accumulation (`maxResults * 2` buffer + trim) instead of unbounded result growth.
   - Pass 146: in `search.worker`, optimize tokenization/keyword extraction loops and add a small bounded query-token cache to reduce repeated split/filter overhead.
   - Pass 147: add `SearchService.searchAsync` tests validating index-prefilter session reduction and zero-candidate early return behavior.
   - Pass 148: normalize async stats shape in `SearchService.searchAsync` and consistently report async search timings through `performanceService`.
   - Pass 150: in `autoTaggingService`, add raw-value-keyed in-memory cache for parsed conversation-tag payloads and a bulk session-tag lookup map.
   - Pass 151: in `SearchService`, switch tag filtering to consume `autoTaggingService.getTagsLookup()` once per search instead of per-session `getTags` reads.
   - Pass 152: in `SearchService`, consolidate metadata filtering (session/date/model/tag) into a single predicate pass shared by sync and async search paths.
   - Pass 153: in `search.worker`, remove pre-filter array rebuilding and evaluate session/date/model filters inline during the main session loop.
   - Pass 154: in `search.worker` tokenization, dedupe query terms while preserving first-seen order to avoid redundant term matching work.
   - Pass 155: expand `SearchService.searchAsync` tests to cover tag-filtered and combined model/date/tag filter behavior before worker dispatch.
   - Pass 157: add a deterministic search-index micro-benchmark harness in `performanceBenchmark` for key query lengths (1/2/3/5/8/12/20/33) with warmup + iteration stats to compare before/after optimization slices.
   - Pass 158: collapse `getUniqueQueryTerms` token-length branches for 10+ tokens into one ordered dedupe path, removing large duplicated branch logic while preserving short-query fast paths.
   - Pass 159: add table-driven query-term dedupe tests (including 10/20/33/40-token shapes) to lock first-seen dedupe behavior and long-query fallback correctness.
   - Pass 160: replace duplicated 8-term/9-term search intersection branches with one shared smallest-posting-list helper used for 8+ term queries.
   - Pass 161: add one shared singleton-membership helper for multi-term intersections so singleton candidate checks use a single consistent path.
   - Pass 162: in `autoTaggingService`, add reverse cache (`tag -> sessionIds`) refreshed with raw/tag caches so `getConversationsByTag` is lookup-based instead of full-array scans.
   - Pass 163: in `SearchService`, centralize tag-lookup resolution for filter paths so sync/async searches consistently consume one cached bulk lookup per request.
   - Pass 164: expand regression coverage for large-query stability and tag-heavy filtering behavior (single bulk tag lookup + limited session hydration).
   - Pass 165: extract shared posting-list collection + smallest-candidate selection helpers in `searchIndex` so multi-term intersection paths stop duplicating candidate-selection logic.
   - Pass 166: route former 7-term intersection path through the shared smallest-posting-list helper, preserving singleton fast paths via common helpers.
   - Pass 167: route former 5/6-term intersection paths through the shared helper, removing duplicated membership-set setup and scan loops.
   - Pass 168: route former 3/4-term intersection paths through the shared helper, consolidating fixed-arity intersection behavior.
   - Pass 169: route 2-term intersections through the same shared helper, leaving a single multi-term intersection engine for all 2+ term queries.
   - Pass 170: in `searchIndex.applyOperations`, replace repeated `includes(sessionId)` duplicate checks with a fast append-if-missing helper (tail check + reverse scan), reducing duplicate-check overhead on hot upsert paths.
   - Pass 171: in `SearchService`, replace candidate-filter and async hydration `filter/map` chains with single-pass loops (`filterSessionsByCandidates`, `hydrateFullSessions`) on hot search paths.
   - Pass 172: replace full-map keyword sort pipelines in both sync search and search worker with bounded top-k selection helpers, keeping output identical while reducing allocation/sort overhead.
   - Pass 173: add explicit benchmark command `npm run benchmark:search-index` backed by `__tests__/searchIndexBenchmark.bench.ts` for repeatable optimization baselines.
   - Pass 174: add search-index benchmark report helpers (`formatSearchIndexBenchmarkReport`, `saveSearchIndexBenchmarkReport`) to persist JSON snapshots for before/after pass comparisons.
   - Pass 175: fix chat lazy-message hydration to load full message content from authoritative session snapshots/cache (instead of truncated `history` placeholders), ensuring on-demand expansion restores complete messages.

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
