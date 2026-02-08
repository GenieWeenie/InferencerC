# 🚀 InferencerC - Future Implementation Plan: "10x Better & Smoother"

This document outlines the roadmap to elevate InferencerC from a functional prototype to a world-class, premium desktop AI application.

## Phase 1: Architecture & Performance (The "Smoother")

*Focus: Refactoring for stability, speed, and maintainability.*

- [x] **Extract Logic from View**: Move the heavy state management (`sendMessage`, `history` logic) from `Chat.tsx` into a custom hook `useChatEngine` or a React Context. `Chat.tsx` should only care about rendering.
- [x] **Virtualize Chat List**: Implement `react-window` or `virtuoso` for the message list. Rendering huge context windows (100k+ tokens) naturally lags the DOM; virtualization fixes this instantly.
- [x] **Optimistic UI Updates**: Show the user's message *immediately* upon pressing Enter, without waiting for the "sent" state.
- [x] **Streaming Optimization**: Ensure the streaming response renderer isn't triggering excessive React re-renders. Use a ref-based approach for the active message buffer.

## Phase 2: UX Excellence (The "Premium Feel")

*Focus: Replacing native browser interactions with custom, high-end UI components.*

- [x] **Custom Toast Notifications**: Replace all `alert()` calls with a slick, animated Toast system (e.g., using `sonner` or custom Framer Motion components).
- [x] **Markdown Polish**:
  - Add a "Copy" button to *all* code blocks (completed).
  - Specialized rendering for tables and math (LaTeX) to look native to the theme (completed).
- [x] **Keyboard Shortcuts**: Add global hotkeys:
  - `Cmd/Ctrl + K`: Quick Focus / New Chat (completed).
  - `Cmd/Ctrl + /`: Toggle Sideba (completed).
  - `Esc`: Stop Generation (completed).
- [x] **Input Enhancements**:
  - Auto-resize textarea with a smoother animation (completed).
  - Drag-and-drop support for text files ( completed).

## Phase 3: "Power User" Features (The "10x Better")

*Focus: Capabilities that set this apart from a basic chatbot.*

- [x] **Local RAG / Knowledge Base (Context Injection)**:
  - [x] Allow users to drag & drop Text/Code files as specialized "attachments".
  - [x] Display attached files as chips/list above the chat input.
  - [x] Transparently inject file content into the prompt context.
- [x] **Prompt Library**:
  - [x] A "Snippets" menu (`/` command) to quickly insert complex system prompts or expert personas.
- [ ] **Voice Interaction** (Ready for Phase 4 or later):
  - Add Microphone button for Speech-to-Text.
  - Add Text-to-Speech (TTS).
- [x] **Multi-Model Battle**: Allow sending the same prompt to TWO models (e.g., Local vs OpenRouter) side-by-side to compare results.

## Phase 4: Developer Quality of Life

- [x] **CI/CD setup**: simple GitHub Actions to build the Electron binaries.
- [x] **Unit Tests**: Expansion of Jest tests (added chatUtils tests, fixed mock-adapter tests).
