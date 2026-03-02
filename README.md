# InferencerC

**Desktop AI chat app** — use local models (LM Studio, Ollama) or OpenRouter, with MCP tools, code preview, conversation branching, and a ton of power-user features. One place to chat, compare models, and plug in your stack.

<div align="center">

![Version](https://img.shields.io/badge/version-4.0.19-blue.svg)
![Electron](https://img.shields.io/badge/Electron-40.0-47848F?logo=electron)
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

The app opens; add an API key (OpenRouter) or start LM Studio/Ollama for local models. Done.

**Build for production:** `npm run build` then `npm run build:mac` or `npm run build:win`. See [RELEASING.md](RELEASING.md) for signed builds.

---

## What you get

- **Chat & models** — One UI for OpenRouter, LM Studio, Ollama, custom endpoints. Battle mode (compare two models), expert personas, thinking mode, prompt library.
- **Files & context** — Drag in files and images, attach project folders, web fetch, GitHub/Notion. Vision-capable models supported.
- **MCP** — Connect Model Context Protocol servers (filesystem, Git, SQLite, etc.), tool browser, quick-add presets.
- **Code & artifacts** — Live preview for HTML/CSS/JS, run Python/JS blocks, token inspector, save artifacts. Export to PDF, DOCX, Markdown, JSON.
- **Conversations** — Branch/merge chats (git-style), semantic search, summaries, templates, analytics, A/B testing, workflows, API playground. 5 themes (including OLED dark), command palette (`Ctrl+P`), 30+ shortcuts.

**38+ features** in total — explore the app or the repo for the full list. In-app **Docs** (Chat header) has the developer guide and API reference.

---

## Configuration

| Use case | Step |
|----------|------|
| **Local models** | Install [LM Studio](https://lmstudio.ai/) or [Ollama](https://ollama.ai/), start the server; models show up in the app. |
| **OpenRouter** | Settings → API Keys → add key; models appear in the dropdown. |
| **MCP servers** | Settings → MCP → Quick Add or add custom commands. |

---

## Project layout

```
src/
├── main/          # Electron main process (window, IPC)
├── renderer/      # React UI: pages (Chat, Models, Settings), components, hooks, services, workers, lib
└── shared/        # Shared types
```

Full structure is in the repository. Docs: `docs/reference/API_REFERENCE.md`, `docs/guides/INTEGRATION_GUIDES.md`, `docs/guides/PLUGIN_DEVELOPMENT_TUTORIAL.md`, `RELEASING.md`. Sample plugin: `examples/plugins/sample-hello-plugin`.

---

## Tech stack

Electron 40 · React 19 · TypeScript 5.9 · Vite 7 · Tailwind CSS · Framer Motion · React Markdown · KaTeX · Sonner · Lucide React

---

## Roadmap

Short-term: stability and performance. Mid-term: workflow and collaboration. See **[docs/ROADMAP.md](docs/ROADMAP.md)** for Next / Later / Done. Per-release details: [GitHub Releases](https://github.com/GenieWeenie/InferencerC/releases).

---

## Contributing

Branch from `master`, open a PR, wait for **CI / validate** to pass. See [CONTRIBUTING.md](CONTRIBUTING.md) for the full flow.

---

## About the author

InferencerC is built by **GenieWeenie**. I like building desktop developer tools and AI UX—especially Electron apps that make local + remote models feel fast, practical, and fun.

If something feels confusing, broken, or missing, open an issue with what you expected to happen (and what actually happened).

---

## License

ISC
