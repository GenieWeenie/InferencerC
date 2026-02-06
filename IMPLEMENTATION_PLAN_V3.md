# 🚀 InferencerC 3.0: The "Excellence" Roadmap

This plan focuses on refining the user experience, adding polish, and implementing features that elevate InferencerC from "great" to "exceptional". These improvements target stability, performance, user delight, and competitive feature parity.

---

## Phase 1: Critical Fixes & Polish

*Things that should work flawlessly before adding more features.*

### 🐛 Reliability & Error Handling

- [x] **Graceful API Failures**: Better error messages and retry logic for API timeouts
- [x] **Connection Health Indicator**: Visual indicator showing LM Studio / OpenRouter connection status
- [x] **Auto-Reconnect**: Automatically reconnect to local models when LM Studio restarts
- [x] **Rate Limit Handling**: Detect and display rate limit errors from OpenRouter

### ⚡ Performance Optimization

- [x] **Lazy Loading**: Defer loading of heavy components (Settings, Models pages)
- [x] **Message Virtualization Tuning**: Optimize Virtuoso settings for smoother scrolling with many messages
- [x] **Image Attachment Compression**: Compress large images before base64 encoding to reduce payload size
- [x] **Debounced Saves**: Rate-limit localStorage writes during rapid typing

### 🎨 Visual Polish

- [x] **Loading Skeletons**: Add skeleton loaders instead of spinners for better perceived performance
- [x] **Empty States**: Design beautiful empty states for:
  - No chat history
  - No search results
  - No connected MCP servers
- [x] **Micro-Animations**: Add subtle hover effects and state transitions
- [x] **Focus Rings**: Improve keyboard navigation accessibility with visible focus states

---

## Phase 2: UX Enhancements

*Small tweaks that make a big difference.*

### 📝 Chat Improvements

- [x] **Message Actions Menu**: Right-click or hover menu on messages with:
  - Copy message
  - Edit message
  - Regenerate response
  - Delete from here
  - Branch conversation
- [x] **Markdown Table Support**: Better rendering of large tables (horizontal scroll)
- [x] **Code Block Actions**: Add "Insert into File" option (when MCP connected)
- [x] **Quick Reply Templates**: Suggestions for follow-up questions after responses
- [x] **Message Bookmarks**: Star important messages for quick reference

### ⌨️ Keyboard Shortcuts

- [x] **Shortcut Modal**: `Ctrl+Shift+?` to show all keyboard shortcuts
- [x] **Essential Shortcuts**:
  - `Ctrl+N` — New chat
  - `Ctrl+F` — Search within chat
  - `Ctrl+L` — Clear chat
  - `Ctrl+Shift+C` — Copy last response
  - `Ctrl+/` — Toggle sidebar
  - `Escape` — Close modals/cancel generation
- [ ] **Vim Mode** (optional): `j/k` navigation, `:commands`

### 🔍 Search & Filter

- [x] **Global Search**: Search across all conversations for specific text
- [x] **Filter by Model**: View only chats using a specific model
- [x] **Filter by Date Range**: Custom date pickers for history filtering
- [x] **Search Within Chat**: Find text within the current conversation

---

## Phase 3: Power User Features

*Features for advanced users and developers.*

### 🛠️ Developer Tools

- [x] **Request/Response Log**: View raw API requests and responses
- [x] **Token Counter**: Real-time token count as you type
- [x] **Context Window Indicator**: Visual bar showing how full the context is
- [x] **JSON Mode Toggle**: Force JSON output format
- [x] **Streaming Toggle**: Option to disable streaming for some use cases

### 🧪 Model Comparison

- [x] **Parallel Comparison**: Send same prompt to 2 models simultaneously (Battle Mode)
- [x] **Comparison Grid View**: Side-by-side diff of responses
- [x] **Response Rating**: Thumbs up/down to track model quality
- [x] **Export Comparison**: Save comparison results as markdown

### 📊 Analytics Dashboard

- [x] **Usage Charts**: Visualize token usage over time
- [x] **Model Usage Breakdown**: Bar chart of which models you use most
- [x] **Cost Projections**: Estimate monthly costs based on usage trends
- [x] **Session Statistics**: Average length, tokens per session

---

## Phase 4: Advanced Integrations

*Extending capabilities beyond chat.*

### 📂 File System Integration

- [x] **Project Context Mode**: Select a folder to include as context
- [x] **File Watcher**: Auto-update context when files change
- [x] **Code Execution**: Run Python/JS code blocks directly (sandboxed)
- [x] **Save Artifacts**: Save generated code directly to files

### 🔗 External Integrations

- [x] **GitHub Integration**:
  - Fetch file contents from repos
  - Create gists from code blocks
- [x] **Notion Integration**: Save conversations to Notion pages
- [x] **Obsidian Export**: Export chats as Obsidian-compatible markdown
- [x] **Webhook Support**: Trigger webhooks after conversations

### 🎤 Voice Features (Deferred from V2)

- [ ] **Speech-to-Text**: Voice input using Whisper API
- [ ] **Text-to-Speech**: Read responses aloud with ElevenLabs/OpenAI TTS
- [ ] **Voice Commands**: "New chat", "Read that again", "Stop"

---

## Phase 5: Customization & Theming

*Making it truly yours.*

### 🎨 Themes

- [x] **Theme System**: Proper CSS variable-based theming
- [x] **Built-in Themes**:
  - OLED Dark (current)
  - Deep Purple
  - Forest Green
  - Solarized Dark
  - Light Mode
- [ ] **Custom Theme Editor**: Pick accent colors, background colors
- [ ] **Theme Import/Export**: Share themes as JSON

### 🔧 Preferences

- [x] **Font Settings**: Choose code/chat fonts, sizes
- [x] **Layout Options**: Compact mode, wide mode
- [x] **Default Model**: Set preferred default model
- [x] **Auto-Scroll Preferences**: When to auto-scroll, when to pause
- [x] **Notification Settings**: Desktop notifications for long responses

### 🔌 Plugin System (Future)

- [ ] **Plugin Architecture**: Load custom modules
- [ ] **Community Plugins**: Share and install extensions
- [ ] **Custom Tools**: Define custom tools for MCP

---

## Phase 6: Infrastructure & Deployment

*Production readiness.*

### 📦 Build & Distribution

- [x] **Auto-Updater**: Check for and install updates automatically
- [x] **Installer Wizard**: Polished Windows installer with options
- [x] **Portable Mode**: Run from USB without installation
- [ ] **macOS Build**: Support for Apple Silicon and Intel Macs
- [ ] **Linux Build**: AppImage or deb/rpm packages

### 🔒 Security & Privacy

- [x] **Encrypted Storage**: Encrypt API keys and sensitive data
- [x] **Privacy Mode**: Disable all analytics/telemetry
- [x] **Conversation Encryption**: Optional password-protected chats
- [x] **Secure Wipe**: Permanently delete conversation data

### 📈 Telemetry (Optional)

- [ ] **Anonymous Usage Stats**: Opt-in crash reporting
- [ ] **Feature Usage Tracking**: Understand which features are popular
- [ ] **Performance Metrics**: Track app startup time, memory usage

---

## Quick Wins (Can Do Anytime)

*Low-effort, high-impact improvements.*

| Feature | Effort | Impact | Status |
|---------|--------|--------|--------|
| Add "Copy as Markdown" button | ⚡ Low | High | ✅ Done |
| Show model in session list | ⚡ Low | Medium | ✅ Done |
| Add chat timestamp display | ⚡ Low | Medium | ✅ Already exists |
| Double-click to edit system prompt | ⚡ Low | High | ✅ Done |
| Add response time display | ⚡ Low | Medium | ✅ Done |
| "Clear Chat" button | ⚡ Low | High | ✅ Done |
| Confirm before closing unsaved | ⚡ Low | High | ✅ Done |
| Remember window position/size | ⚡ Low | Medium | ✅ Done |
| Add "Export Chat" button | ⚡ Low | High | ✅ Done |
| Show typing indicator | ⚡ Low | High | ✅ Already exists |

---

## Priority Order

1. **Phase 1** — Fix critical issues first
2. **Quick Wins** — Easy wins for immediate improvement
3. **Phase 2** — UX enhancements users will love
4. **Phase 3** — Power features for enthusiasts
5. **Phase 4-6** — Advanced features as time permits

---

## Notes

- All phases are designed to be modular — pick what matters most
- Consider user feedback to reprioritize items
- Performance and reliability always come before new features
