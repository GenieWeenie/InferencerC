# 🎯 Command Palette

The Command Palette is a VSCode-style universal command interface that allows quick access to all features in InferencerC.

## Features

### ⚡ Quick Access
- **Instant Search**: Fuzzy search through all available commands
- **Keyboard Navigation**: Navigate with arrow keys, select with Enter
- **Smart Scoring**: Commands ranked by relevance to your search

### 🎨 UI/UX
- **Categorized Commands**: Commands grouped by category (Navigation, Actions, Editing, etc.)
- **Visual Feedback**: Selected command highlighted with arrow indicator
- **Keyboard Shortcuts Display**: Shows shortcuts next to commands
- **Command Count**: Live count of filtered commands

### 🔍 Search Features
- **Fuzzy Matching**: Matches partial queries across label, description, keywords, and category
- **Multi-term Search**: Supports multiple search terms
- **Intelligent Scoring**: Prioritizes exact matches and prefix matches

## Usage

### Opening the Command Palette

**Keyboard Shortcuts:**
- `Ctrl+P` (Windows/Linux)
- `Cmd+P` (macOS)
- `Ctrl+Shift+P` (Alternative)

### Navigating

- `↑` / `↓` - Navigate through commands
- `Enter` - Execute selected command
- `Esc` - Close palette
- `Type` - Filter commands

## Available Commands

### Navigation
- **Go to Chat** - Switch to the chat interface
- **Go to Models** - Browse and download AI models
- **Go to Settings** - Configure application settings (`Ctrl+,`)

### Actions
- **New Chat** - Start a new conversation (`Ctrl+N`)
- **Stop Generation** - Stop the current AI response (`Escape`)
- **Enable/Disable Battle Mode** - Compare two models side-by-side
- **Enable/Disable Thinking Mode** - Show AI reasoning process
- **Enable/Disable Streaming** - Toggle real-time response streaming

### Expert Modes
- **Coding Expert Mode** - Optimize for code generation
- **Creative Expert Mode** - Optimize for creative writing
- **Math Expert Mode** - Optimize for mathematical reasoning
- **Reasoning Expert Mode** - Optimize for deep reasoning
- **Reset Expert Mode** - Return to default settings

### View
- **Toggle History Sidebar** - Show/hide conversation history (`Ctrl+/`)
- **Toggle Sidebar** - Show/hide the sidebar (`Ctrl+.`)
- **Toggle Inspector** - Show/hide the inspector panel
- **Toggle Analytics** - Show/hide usage analytics
- **Toggle Request Log** - Show/hide API request/response log

### Editing
- **Clear Chat** - Clear current conversation (`Ctrl+L`)

### Export
- **Export Chat** - Export current conversation (`Ctrl+S`)

### Settings
- **Switch to [Theme]** - Change application theme
  - OLED Dark
  - Deep Purple
  - Forest Green
  - Solarized Dark
  - Light

### Help
- **Keyboard Shortcuts** - View all keyboard shortcuts (`Ctrl+?`)

## Architecture

### Components

**CommandPalette.tsx**
- Main UI component
- Handles search, navigation, and command execution
- Implements keyboard navigation
- Groups commands by category

**commandRegistry.ts**
- Registry system for managing commands
- Fuzzy search implementation
- Command scoring algorithm
- Observable pattern for updates

**useCommandPalette.ts**
- React hook for palette state
- Global keyboard listener
- Open/close/toggle functions

**useCommandRegistry.tsx**
- React hook for registering commands
- Connects app actions to command palette
- Dynamic command enabling/disabling

### Command Structure

```typescript
interface Command {
    id: string;                    // Unique identifier
    label: string;                 // Display name
    description?: string;          // Help text
    category: CommandCategory;     // Grouping category
    icon?: LucideIcon;            // Visual icon
    keywords?: string[];          // Search keywords
    shortcut?: string[];          // Keyboard shortcut
    action: () => void;           // Execution function
    enabled?: () => boolean;      // Dynamic state
}
```

### Search Algorithm

The search algorithm uses a scoring system:

1. **Exact match**: +1000 points
2. **Label starts with query**: +500 points
3. **Label contains query**: +250 points
4. **All terms match**: Required to show result
5. **Individual term matches**:
   - In label: +100 points
   - In description: +50 points
   - In keywords: +75 points
   - In category: +25 points
6. **Length bonus**: Shorter labels ranked higher (up to +50 points)

## Extending the Command Palette

### Adding New Commands

In your component or App.tsx:

```typescript
import { commandRegistry } from './lib/commandRegistry';
import { Icon } from 'lucide-react';

// Register a command
commandRegistry.register({
    id: 'my.command',
    label: 'My Custom Command',
    description: 'Does something awesome',
    category: 'Actions',
    icon: Icon,
    keywords: ['custom', 'awesome'],
    shortcut: ['Ctrl', 'Shift', 'A'],
    action: () => {
        // Your action here
        console.log('Command executed!');
    },
    enabled: () => true // Optional: dynamic enabling
});
```

### Adding Multiple Commands

```typescript
const commands = [
    {
        id: 'cmd1',
        label: 'Command 1',
        category: 'Actions',
        action: () => {}
    },
    {
        id: 'cmd2',
        label: 'Command 2',
        category: 'Navigation',
        action: () => {}
    }
];

commandRegistry.registerMany(commands);
```

### Unregistering Commands

```typescript
// Unregister single command
commandRegistry.unregister('my.command');

// Clear all commands
commandRegistry.clear();
```

### Subscribing to Changes

```typescript
const unsubscribe = commandRegistry.subscribe(() => {
    console.log('Commands updated!');
    const allCommands = commandRegistry.getAll();
});

// Later: cleanup
unsubscribe();
```

## Best Practices

1. **Use descriptive labels**: Make commands easy to find
2. **Add keywords**: Include synonyms and alternative terms
3. **Provide descriptions**: Help users understand what commands do
4. **Group logically**: Use appropriate categories
5. **Include shortcuts**: Show users the faster way
6. **Enable conditionally**: Disable commands when not applicable

## Future Enhancements

- [ ] Command history (recently used commands)
- [ ] Command favorites/pinning
- [ ] Custom command creation from UI
- [ ] Command aliases
- [ ] Multi-step commands (wizards)
- [ ] Command suggestions based on context
- [ ] Command palette themes
- [ ] Export/import command configurations

## Technical Details

**Dependencies:**
- `framer-motion` - Animations
- `lucide-react` - Icons
- React 19.2.3
- TypeScript 5.9

**Files:**
- `src/renderer/components/CommandPalette.tsx` - UI Component
- `src/renderer/lib/commandRegistry.ts` - Registry & Search
- `src/renderer/hooks/useCommandPalette.ts` - State Hook
- `src/renderer/hooks/useCommandRegistry.tsx` - Registration Hook

**Performance:**
- Debounced search for smooth typing
- Virtual scrolling for large command lists (future)
- Memoized search results
- Lazy command registration

---

Built with ❤️ for InferencerC 4.0
