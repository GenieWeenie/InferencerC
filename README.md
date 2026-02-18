# InferencerC - Advanced AI Chat Interface

<div align="center">

![Version](https://img.shields.io/badge/version-4.0.18-blue.svg)
![Electron](https://img.shields.io/badge/Electron-40.0-47848F?logo=electron)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript)
![License](https://img.shields.io/badge/license-ISC-green.svg)

A premium, commercial-grade AI chat application built with Electron, React, and Vite. Combining the sophistication of top-tier inference platforms with powerful local model support, advanced AI features, intelligent automation, and developer tools. Features a stunning "OLED" dark theme and comprehensive customization options.

**Current Version: v4.0.18** — 38+ major features implemented, including Intelligence & Automation, Developer Tools, and Advanced Analytics.

### 🎯 Quick Stats

- **Total Features**: 38+ major features
- **Lines of Code**: 9,200+ added
- **Services**: 30+ specialized services
- **Components**: 50+ React components
- **Keyboard Shortcuts**: 30+ commands
- **Integrations**: 10+ external services

</div>

---

## ✨ Features Overview

### 🎨 Premium UI/UX

- **Multiple Themes** — 5 built-in themes with CSS variable-based theming:
  - OLED Dark (pure black for OLED displays)
  - Deep Purple (rich purple tones)
  - Forest Green (natural green palette)
  - Solarized Dark (classic Solarized scheme)
  - Light Mode (clean light theme)
- **Custom Window Controls** — Native-like title bar that blends seamlessly with the dark theme
- **Ultra-Slim Sidebar** — Ergonomic vertical navigation (Chat, Models, Settings)
- **Collapsible Sidebar** — Toggle to show/hide the right sidebar (Inspector, Controls, Prompts)
- **Smooth Animations** — Fluid transitions powered by Framer Motion
- **Responsive Design** — Optimized for various screen sizes
- **Customizable Preferences** — Font settings, layout modes, default model, and more
- **Command Palette** (v4.0) — VSCode-style command palette with 30+ commands for quick access to all features (`Ctrl+P`)

### 💬 Advanced Chat Experience

#### Core Features

- **Response Steering** — Pre-seed assistant responses to guide output direction
- **Thinking Mode** — Force Chain-of-Thought reasoning with collapsible `<thinking>` blocks
- **Expert Personas** — One-click switching between Coding, Creative, Math, and Reasoning modes
- **Battle Mode** — Compare two models side-by-side with parallel streaming
- **Comparison Grid View** — Side-by-side diff view with highlighting for Battle Mode responses
- **Export Comparisons** — Save model comparisons as markdown files
- **Prompt Library** — Quick slash-command access (`/code`, `/explain`, etc.)

#### File & Image Support

- **Drag & Drop Files** — Drop text files directly into chat (`.md`, `.py`, `.tsx`, `.json`, etc.)
- **Vision/Multimodal** — Drag & drop images (PNG, JPEG, GIF, WebP) for vision-capable models
- **Image Thumbnails** — Visual preview of attached images in the chat

#### Web Integration

- **Web Fetch Tool** — Scrape and inject URL content directly into conversations
- **GitHub Integration** — Fetch file contents from repositories and create gists from code blocks
- **Notion Integration** — Save conversations directly to Notion pages
- **Obsidian Export** — Export chats as Obsidian-compatible markdown with frontmatter
- **Webhook Support** — Trigger webhooks after conversations complete

#### Project Context Mode

- **Folder Selection** — Select a project folder to include as context
- **File Watcher** — Automatically watch for file changes and update context
- **Smart Context Inclusion** — Automatically includes relevant project files in chat context
- **Context Toggle** — Show/hide project context in messages
- **File Filtering** — Supports common code file extensions (`.ts`, `.tsx`, `.js`, `.jsx`, `.py`, `.md`, etc.)

### 🔍 Token Inspector & Analysis

- **Visual Logprobs** — Interactive per-token probability visualization
- **Entropy Heatmap** — Color-coded text showing model confidence/uncertainty
- **Simulation Mode** — Auto-generate mock logprobs for APIs that don't support them
- **Top Alternatives** — Explore alternative token choices and probabilities
- **Click-to-Inspect** — Click any token to see detailed probability analysis

### 🎯 Live Artifacts / Code Preview

- **HTML/CSS/JS Preview** — Live sandboxed preview of code blocks
- **Interactive Sandbox** — Full-featured preview pane with:
  - Refresh preview
  - Copy code
  - Open in new tab
  - Fullscreen mode
- **Console Output** — JavaScript console.log redirected to visible output
- **One-Click Run** — Green "PREVIEW" button on compatible code blocks
- **Code Execution** — Run Python and JavaScript code blocks directly (sandboxed)
  - Python: Subprocess execution with timeout
  - JavaScript: VM context execution
  - Execution results displayed inline
- **Save Artifacts** — Save generated code directly to files with correct extensions
- **Code Language Selector** — Dropdown to change syntax highlighting for code blocks

### 🔌 MCP (Model Context Protocol) Integration

- **Connect to MCP Servers** — Filesystem, Git, SQLite, and more
- **Quick Add Presets** — One-click setup for popular MCP servers
- **Custom Servers** — Configure custom MCP server commands and arguments
- **Tool Browser** — View available tools from each connected server
- **Status Indicator** — Real-time connection status in chat interface

### 🔗 Prompt Chaining & Versioning (v4.0)

- **Prompt Chain Builder** — Visual interface for creating multi-step prompt workflows
  - Chain multiple prompts with outputs as inputs
  - 4 step types: Prompt, Transform, Condition, Aggregate
  - Variable passing between steps (`{{stepName.output}}`)
  - 3 built-in chain templates (Analyze-Then-Act, Iterative Refinement, Research-Synthesize)
- **Prompt Versioning** — Track and compare different prompt versions
  - Performance metrics (response time, tokens, success rate)
  - User ratings per version
  - LCS-based diff comparison
  - Import/export versioned prompts
- **Key Point Extraction** — Automatically extract insights from conversations
  - TF-IDF based topic extraction
  - Action item detection
  - Decision tracking
  - 9 key point types (insight, decision, action, question, warning, etc.)
  - Export to Markdown

### 🌳 Conversation Branching & Merging (v4.0)

- **Git-like Branching** — Create multiple conversation branches from any point
- **Branch Navigation** — Switch between branches, view tree structure
- **Advanced Merging** — 4 merge strategies:
  - Append: Add source messages after target
  - Interleave: Alternate messages by role
  - Cherry-pick: Select specific messages to merge
  - Squash: Combine into a summary
- **Conflict Detection** — Identify divergent responses to similar questions

### ⚡ Background Processing (v4.0)

- **Web Workers** — Heavy operations run off the main thread
  - Encryption/decryption worker
  - Full-text search worker with fuzzy matching
  - Export generation worker (HTML, Markdown, JSON)
- **Worker Manager** — Promise-based API for async worker operations
- **Graceful Fallback** — Automatic fallback to main thread if workers unavailable

### 📦 Model Downloader

- **HuggingFace Search** — Search and browse GGUF models directly
- **Recommended Models** — Curated list of popular models:
  - Mistral 7B, Llama 2, CodeLlama
  - Nous Hermes, OpenHermes, Zephyr
  - WizardCoder, Phind CodeLlama
- **Quantization Info** — Detailed quality ratings (Q2_K through F16)
- **VRAM Estimation** — Automatic GPU memory requirement calculations
- **Download Manager** — Progress tracking with speed and ETA

### 📁 Session Management

- **Persistent History** — All conversations saved locally
- **Smart Grouping** — Sessions organized by Today, Yesterday, Last 7 Days, Older
- **Advanced Filtering**:
  - Filter by model
  - Filter by date range with custom date pickers
  - Quick date presets (Today, Last 7 Days, Last 30 Days)
  - Fuzzy search across all history
- **Essential Features**:
  - Rename sessions
  - Pin important chats
  - Delete sessions
- **Auto-Save** — Conversations automatically saved as you chat
- **Smart Search** (v4.0) — Semantic search across all conversations that understands meaning, not just keywords (`Ctrl+Shift+F`)
- **Auto-Summarization** (v4.0)** — AI-powered conversation summaries with key points and topic extraction
- **Conversation Templates** (v4.0) — 6 built-in templates (Code Review, Bug Report, Documentation, etc.) + create/import/export custom templates
- **Export Formats** (v4.0) — Export conversations to PDF, DOCX, HTML, Markdown, or JSON with a unified export dialog (`Ctrl+Shift+E`)
- **Conversation Analytics** (v4.0.12) — Comprehensive analytics dashboard with patterns, model performance, and trends
- **A/B Testing** (v4.0.13) — Test different prompts and compare results side-by-side
- **Prompt Optimization** (v4.0.14) — AI-powered prompt analysis and optimization suggestions
- **Smart Suggestions** (v4.0.16) — AI suggests follow-up questions based on context
- **Auto-Categorization** (v4.0.16) — Automatic conversation categorization by topic
- **Conversation Recommendations** (v4.0.16) — Suggest relevant past conversations (`Ctrl+Shift+R`)
- **Auto-Tagging** (v4.0.16) — Automatically tag conversations based on content
- **Workflows** (v4.0.16) — Create automated workflows for conversation handling
- **Sentiment Analysis** (v4.0.17) — Track sentiment across conversations with emotion detection
- **Topic Modeling** (v4.0.17) — Advanced topic extraction and clustering
- **Scheduled Conversations** (v4.0.17) — Schedule conversations to run at specific times
- **Auto-Responses** (v4.0.17) — Set up automatic responses for common queries
- **Trigger Actions** (v4.0.17) — Trigger actions based on conversation outcomes
- **Macro Recording** (v4.0.17) — Record and replay complex interaction sequences
- **API Playground** (v4.0.18) — Interactive API testing interface
- **Request Builder** (v4.0.18) — Visual interface for building API requests
- **Response Inspector** (v4.0.18) — Deep inspection of API responses
- **Mock Server** (v4.0.18) — Built-in mock server for testing
- **API Documentation Generator** (v4.0.18) — Auto-generate API docs from conversations
- **Code Generation** (v4.0.18) — Generate code from natural language descriptions
- **Test Case Generation** (v4.0.18) — Generate test cases from code descriptions

### ⚙️ Settings Dashboard

- **API Keys** — Manage OpenRouter, GitHub, and Notion API credentials
- **Model Endpoints** — Configure LM Studio, Ollama, and custom endpoints
- **System Presets** — Create and manage system prompt templates
- **MCP Servers** — Configure Model Context Protocol connections
- **Model Downloader** — Download GGUF models from HuggingFace
- **Usage Tracking** — Monitor token usage and estimated costs
- **Webhooks** — Configure webhooks to receive notifications after conversations
- **Appearance Settings**:
  - Theme selection (5 built-in themes)
  - Font settings (chat and code fonts with size controls)
  - Layout modes (normal, compact, wide)
  - Default model selection
  - Auto-scroll preferences
  - Notification settings
- **Privacy & Security**:
  - Privacy Mode — Disable all analytics and telemetry
  - Data Encryption — Encrypt sensitive data at rest
  - Conversation Encryption — Password-protect individual chats
  - Secure Wipe — Permanently delete all data
  - Auto-Updater — Automatic update checking and installation
- **Integrations**:
  - Slack — Send conversations to Slack channels
  - Discord — Share conversations in Discord
  - Email — Email conversations directly
  - Calendar — Schedule conversation reminders
  - REST API — Programmatic access configuration

---

## 📚 Developer Documentation

Feature 15 documentation is available in two places:

- In-app: click `Docs` in the Chat header to open the Developer Documentation Hub (includes an API playground launcher)
- Markdown guides:
  - `docs/reference/API_REFERENCE.md`
  - `docs/guides/INTEGRATION_GUIDES.md`
  - `docs/guides/PLUGIN_DEVELOPMENT_TUTORIAL.md`
  - `docs/guides/TROUBLESHOOTING.md`

Sample plugin package:

- `examples/plugins/sample-hello-plugin`

Release checklist and signed macOS setup:

- `RELEASING.md`

---

## 🛠️ Installation

### Prerequisites

- Node.js 18+
- npm or yarn
- (Optional) LM Studio for local models

### Quick Start

```bash
# Clone the repository
git clone https://github.com/GenieWeenie/InferencerC.git
cd InferencerC

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Build for Production

```bash
# Build the application
npm run build

# Local mac build (unsigned, stable for local packaging)
npm run build:mac

# Signed mac release build (for CI/release runners with signing secrets)
npm run release:mac:signed
```

---

## ⚙️ Configuration

### Local Models (LM Studio)

1. Download and install [LM Studio](https://lmstudio.ai/)
2. Start the local server (default port: 1234)
3. InferencerC will automatically detect available models

### OpenRouter (Remote Models)

1. Go to **Settings → API Keys**
2. Enter your OpenRouter API Key
3. Models will appear in the model dropdown

### MCP Servers

1. Go to **Settings → MCP**
2. Use Quick Add presets or configure custom servers
3. Click the power button to connect

---

## 📂 Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts          # App entry, window management, IPC
│   └── server.ts         # Express backend for proxying API requests
├── renderer/             # React frontend
│   ├── pages/            # Main views
│   │   ├── Chat.tsx      # Primary chat interface
│   │   ├── Models.tsx    # Model management
│   │   └── Settings.tsx  # Settings dashboard
│   ├── components/       # Reusable UI components
│   │   ├── ArtifactPreview.tsx       # Live code preview
│   │   ├── CommandPalette.tsx        # VSCode-style command palette
│   │   ├── ConversationTreeView.tsx  # Branch visualization
│   │   ├── ExportDialog.tsx          # Multi-format export
│   │   ├── GlobalSearchDialog.tsx    # Semantic search UI
│   │   ├── PromptChainBuilder.tsx    # Visual chain builder
│   │   ├── ConversationAnalyticsDashboard.tsx # Analytics dashboard
│   │   ├── ABTestingPanel.tsx        # A/B testing interface
│   │   ├── PromptOptimizationPanel.tsx # Prompt optimization
│   │   ├── SmartSuggestionsPanel.tsx # Smart suggestions
│   │   ├── ConversationRecommendationsPanel.tsx # Recommendations
│   │   ├── WorkflowsManager.tsx      # Workflow management
│   │   ├── APIPlayground.tsx         # API testing interface
│   │   ├── RequestBuilder.tsx        # Request builder
│   │   ├── ResponseInspector.tsx     # Response inspector
│   │   ├── CalendarScheduleDialog.tsx # Calendar scheduling
│   │   ├── MCPSettings.tsx           # MCP configuration
│   │   ├── ModelDownloader.tsx       # HuggingFace downloader
│   │   ├── MessageContent.tsx        # Markdown rendering
│   │   ├── PromptManager.tsx         # Prompt library
│   │   ├── SidebarHistory.tsx        # Session history
│   │   ├── ComparisonGrid.tsx       # Battle Mode comparison
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useChat.ts              # Chat state & logic
│   │   ├── useCommandRegistry.tsx  # Command registration
│   │   ├── useConversationTree.ts  # Tree management
│   │   ├── useMCP.ts               # MCP integration
│   │   └── usePrompts.ts           # Prompt management
│   ├── workers/          # Web Workers (background processing)
│   │   ├── encryption.worker.ts  # AES-GCM crypto operations
│   │   ├── search.worker.ts      # Full-text search
│   │   ├── export.worker.ts      # Document generation
│   │   └── index.ts              # Worker exports
│   ├── lib/              # Utilities & helpers
│   │   ├── conversationTree.ts   # Tree data structure + merging
│   │   ├── exportService.ts      # Multi-format export
│   │   ├── commandRegistry.ts    # Command management
│   │   └── keyboardShortcuts.ts  # Shortcut definitions
│   └── services/         # Business logic
│       ├── history.ts            # Session persistence
│       ├── workerManager.ts      # Web Worker coordinator
│       ├── promptChaining.ts     # Chain execution engine
│       ├── promptVersioning.ts   # Version tracking
│       ├── keyPointExtraction.ts # Key point analysis
│       ├── summarization.ts      # AI summarization
│       ├── search.ts             # Search service
│       ├── templates.ts          # Template management
│       ├── encryption.ts         # Data encryption
│       ├── mcp.ts                # MCP client
│       ├── theme.ts              # Theme management
│       ├── analytics.ts          # Usage tracking
│       ├── conversationAnalytics.ts # Advanced analytics
│       ├── abTesting.ts          # A/B testing service
│       ├── promptOptimization.ts # Prompt optimization
│       ├── smartSuggestions.ts   # Follow-up suggestions
│       ├── autoCategorization.ts # Auto-categorization
│       ├── conversationRecommendations.ts # Recommendations
│       ├── autoTagging.ts        # Auto-tagging
│       ├── workflows.ts         # Workflow automation
│       ├── sentimentAnalysis.ts # Sentiment analysis
│       ├── topicModeling.ts      # Topic modeling
│       ├── scheduledConversations.ts # Scheduled chats
│       ├── autoResponses.ts      # Auto-responses
│       ├── triggerActions.ts     # Trigger actions
│       ├── macroRecording.ts     # Macro recording
│       ├── apiClient.ts          # API client
│       ├── codeGeneration.ts    # Code generation
│       ├── testCaseGeneration.ts # Test generation
│       ├── apiDocsGenerator.ts  # API docs generator
│       ├── mockServer.ts        # Mock server
│       ├── github.ts             # GitHub integration
│       ├── notion.ts             # Notion integration
│       ├── slack.ts              # Slack integration
│       ├── discord.ts            # Discord integration
│       ├── email.ts              # Email export
│       ├── calendar.ts           # Calendar integration
│       ├── apiAccess.ts          # API access config
│       └── privacy.ts            # Privacy controls
└── shared/               # Shared types
    └── types.ts          # TypeScript interfaces
```

---

## 🚀 Tech Stack

| Technology | Purpose |
|------------|---------|
| **Electron 40** | Desktop application framework |
| **React 19** | UI library |
| **TypeScript 5.9** | Type safety |
| **Vite 7** | Build tool & dev server |
| **Tailwind CSS 3** | Utility-first styling |
| **Framer Motion** | Animations |
| **React Markdown** | Message rendering |
| **React Syntax Highlighter** | Code highlighting |
| **KaTeX** | Math equation rendering |
| **Sonner** | Toast notifications |
| **Lucide React** | Icon library |

---

## 🗺️ Roadmap

Public roadmap details are intentionally kept brief in this repository.

- Short-term focus: stability, performance, and quality improvements
- Mid-term focus: workflow and collaboration polish
- Release-level details: see GitHub Releases

### Version History

Detailed version history has been moved out of the public README to keep this page concise.
Use Git tags and GitHub Releases for version-by-version details.

---

## 🤝 Contributing

Contributions are welcome.

Use the safe PR flow documented in `CONTRIBUTING.md`:

- Branch from `master`
- Open PR back to `master`
- Wait for `CI / validate` to pass before merge

---

## 📄 License

ISC License
