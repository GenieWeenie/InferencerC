# 🚀 InferencerC 2.0: The "Million Dollar MVP" Roadmap

This plan focuses on elevating InferencerC from a "functional tool" to a "commercial-grade product". The goal is to maximize user retention through refined UX and introduce "killer features" that justify a premium status.

## Phase 1: The "Premium" Polish (UX & flow)

*Fixing the "little things" that make an app feel expensive.*

- [x] **Native Window Controls**: Replace the standard Windows title bar with a custom, dark-themed draggable header that blends perfectly with the sidebar.
- [x] **Advanced Session Management**:
  - [x] **Persistent Sidebar**: Group chats by "Today", "Yesterday", "Last 7 Days".
  - [x] **Chat Operations**: Rename, Delete, and "Pin" important chats.
  - [x] **Search History**: Instant fuzzy search across all previous conversations.
- [x] **Settings Dashboard**:
  - [x] A dedicated modal/page to manage Models (add/remove endpoints URL vs Local).
  - [x] System Prompt Presets editor (move out of simple JSON file).
  - [x] Token Usage & Cost tracking (for OpenRouter models).

## Phase 2: "Visual Intelligence" (Vision & Artifacts)

*Transforming from a text-chat to a creative workspace.*

- [x] **Artifacts / Live Preview**:
  - [x] When the LLM generates HTML/CSS/React, render it in a "Preview" tab side-by-side.
  - [x] Interactive sandbox for instant UI iteration (like Claude).
- [x] **Multimodal / Vision Support**:
  - [x] Drag & Drop **Images** into chat.
  - [x] Display image thumbnails.
  - [x] Send base64 image data to compatible models (Llava, GPT-4o, Claude 3.5).

## Phase 3: "Limitless" Connectivity (MCP & Voice)

*Extending the brain of the AI.*

- [~] **Voice Interaction** (Skipped for now):
  - [ ] "Always-on" listening mode (Wakeword detection?).
  - [ ] High-quality TTS (ElevenLabs or OpenAI compatible).
- [x] **MCP (Model Context Protocol) Client**:
  - [x] Allow InferencerC to connect to local MCP servers (filesystem, git, databases).
  - [x] Give the model "Tools" to actually *do* things on your computer securely.

## Phase 4: Local Model Mastery

*Making local AI easiest to use.*

- [x] **One-Click Model Downloader**:
  - [x] Integrate with HuggingFace/Ollama registry to search and download GGUF files directly inside the app.
  - [x] Auto-configure `llama.cpp` for the user's GPU (VRAM detection/estimation).
