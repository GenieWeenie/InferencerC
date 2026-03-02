# Agent guidance (InferencerC)

For AI and scripted workflows (Cursor, Codex, etc.). Keep changes aligned with [CONTRIBUTING.md](CONTRIBUTING.md) and [docs/ROADMAP.md](docs/ROADMAP.md).

## Layout

- **`src/main/`** — Electron main process (window, IPC). Not covered by default Jest coverage.
- **`src/renderer/`** — React UI: pages (Chat, Models, Settings), components, hooks, services, workers, lib.
- **`src/server/`** — Optional backend server (adapters, services). Covered by Jest when running tests.
- **`src/shared/`** — Shared types.
- **`__tests__/`** — Root-level tests (server, shared, integration). Colocated **`__tests__/`** under `src/` for renderer/server units.

## Commands

| Task | Command |
|------|--------|
| Run tests | `npm test` or `npm test -- --runInBand` |
| Tests with coverage | `npm run test:coverage` |
| Lint | `npm run lint` |
| Typecheck | `npm run typecheck` |
| Build | `npm run build` |
| Dev (Electron) | `npm run dev` |
| UI smoke QA | `npm run qa:smoke:ui` |

## Where to add tests

- **Server / adapters / shared:** `__tests__/<name>.test.ts` or `src/server/**/__tests__/*.test.ts`. Use Node environment (default in `jest.config.json` for non-jsdom tests).
- **Renderer components/hooks:** `src/renderer/**/__tests__/*.test.ts(x)`. Use `@jest-environment jsdom` in the file when needed.
- Follow existing patterns: mocks for `fs`, `fetch`, and heavy dependencies; avoid hitting real APIs or Electron main in unit tests.

## Branch rules

- Branch from `master`. Prefer `feature/`, `fix/`, `chore/` prefixes.
- Before PR: `npm test -- --runInBand`, `npm run build`. Delete branch after merge when done.

## Docs

- **Roadmap (short):** [docs/ROADMAP.md](docs/ROADMAP.md)
- **Improvement backlog:** [docs/ROADMAP_IMPROVEMENTS.md](docs/ROADMAP_IMPROVEMENTS.md)
- **Build plan / passes:** [docs/V3_1_BUILD_PLAN.md](docs/V3_1_BUILD_PLAN.md), [docs/PASS_LEDGER_215_540.md](docs/PASS_LEDGER_215_540.md)
- **Contributing:** [CONTRIBUTING.md](CONTRIBUTING.md)
