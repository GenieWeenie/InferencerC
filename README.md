# InferencerC

**Desktop AI chat app** — use local models (LM Studio, Ollama) or cloud providers (OpenRouter), with MCP tool integration, live code preview, conversation branching, and 38+ power-user features. One app to chat, compare models, and plug in your stack.

<div align="center">

![Version](https://img.shields.io/badge/version-4.0.19-blue.svg)
![CI](https://img.shields.io/github/actions/workflow/status/GenieWeenie/InferencerC/ci.yml?branch=master&label=CI)
![Tests](https://img.shields.io/badge/tests-564_passing-brightgreen)
![Coverage](https://img.shields.io/badge/coverage-50%25-yellow)
![Electron](https://img.shields.io/badge/Electron-40.6-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-ISC-green.svg)

</div>

---

## Quick Start

**Prerequisites:** Node.js 18+, npm or yarn.

```bash
git clone https://github.com/GenieWeenie/InferencerC.git
cd InferencerC
npm install
npm run dev
```

The app opens. Add an API key (OpenRouter) or start LM Studio / Ollama for local models — you're ready to go.

**Build for production:** `npm run build` then `npm run build:mac` or `npm run build:win`. See [RELEASING.md](RELEASING.md) for signed builds.

---

## Features

### Chat & Models
Multi-provider support — OpenRouter, LM Studio, Ollama, custom endpoints. Battle mode to compare two models side-by-side, expert personas, thinking mode, and a prompt library.

### Files & Context
Drag in files and images, attach project folders, fetch web pages, pull from GitHub or Notion. Vision-capable models supported.

### MCP Integration
Connect Model Context Protocol servers (filesystem, Git, SQLite, etc.) with a tool browser and quick-add presets.

### Code & Artifacts
Live preview for HTML/CSS/JS, run Python and JS blocks inline, token inspector, save artifacts. Export conversations to PDF, DOCX, Markdown, or JSON.

### Conversations
Branch and merge chats (git-style), semantic search, summaries, templates, analytics, A/B testing, automated workflows, and an API playground. 5 themes including OLED dark, a command palette (`Ctrl+P`), and 30+ keyboard shortcuts.

---

## Configuration

| Use case | Step |
|----------|------|
| **Local models** | Install [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.ai/), start the server — models appear automatically. |
| **OpenRouter** | Settings → API Keys → add your key. Models appear in the dropdown. |
| **MCP servers** | Settings → MCP → Quick Add or add custom server commands. |

---

## Project layout

```
src/
├── main/          # Electron main process (window, IPC)
├── renderer/      # React UI: pages, components, hooks, services, workers, lib
├── server/        # Optional backend (adapters, services for local inference)
└── shared/        # Shared types
```

**Docs:** [`docs/reference/API_REFERENCE.md`](docs/reference/API_REFERENCE.md) · [`docs/guides/INTEGRATION_GUIDES.md`](docs/guides/INTEGRATION_GUIDES.md) · [`docs/guides/PLUGIN_DEVELOPMENT_TUTORIAL.md`](docs/guides/PLUGIN_DEVELOPMENT_TUTORIAL.md) · [`RELEASING.md`](RELEASING.md)

---

## Quality

| Metric | Value |
|--------|-------|
| Test suites | 96 passing |
| Tests | 564 passing |
| Coverage | ~50% statements, branches, functions, lines |
| CI | GitHub Actions — tests, lint, typecheck, coverage gate on every PR |
| Lint | ESLint + TypeScript-ESLint, zero warnings |
| Type safety | Strict TypeScript across renderer + node configs |

---

## Tech stack

Electron 40 · React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS · Framer Motion · React Markdown · KaTeX · Sonner · Lucide React

---

## Roadmap

See **[docs/ROADMAP.md](docs/ROADMAP.md)** for the living Next / Later / Done list. Tracked in [Linear](https://linear.app/genies-lamp/project/inferencerc-2e98f74226cc). Per-release details on [GitHub Releases](https://github.com/GenieWeenie/InferencerC/releases).

---

## Contributing

Branch from `master`, open a PR, wait for **CI / validate** to pass. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

---

## About

InferencerC is built by **GenieWeenie** — desktop developer tools and AI UX, especially Electron apps that make local + remote models feel fast and practical.

Found a bug or have a feature idea? [Open an issue](https://github.com/GenieWeenie/InferencerC/issues).

---

## License

ISC
