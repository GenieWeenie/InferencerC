# 🌳 Conversation Branching

Conversation Branching allows you to explore multiple paths in a conversation without losing your progress. Think of it like Git for your chats!

## Overview

Instead of a linear conversation history, InferencerC now supports a **tree structure** where any message can have multiple alternative responses (branches). This enables:

- **Exploration**: Try different approaches without losing context
- **Experimentation**: Compare different AI responses
- **Version Control**: Keep track of conversation evolution
- **Recovery**: Go back and try alternative paths

## Features

### 🌿 Core Capabilities

1. **Branch Creation**: Create alternative responses from any point
2. **Branch Navigation**: Switch between different conversation paths
3. **Tree Visualization**: See your entire conversation structure
4. **Branch Management**: Delete, rename, and merge branches
5. **Persistent Storage**: Branches saved with your session

### 🎯 Use Cases

- **Prompt Engineering**: Test different prompts and compare results
- **Decision Making**: Explore different approaches before committing
- **Debugging**: Track down where a conversation went wrong
- **Learning**: See how different inputs affect AI responses
- **Creativity**: Explore multiple creative directions

## Usage

### Creating a Branch

**Method 1: Command Palette**
1. Press `Ctrl+P` (or `Cmd+P`)
2. Type "create branch"
3. Press Enter

**Method 2: Keyboard Shortcut**
- Press `Ctrl+B` to create a new branch from current message

**Method 3: Branch Navigator**
- Click the `+` button in the branch navigator (appears when branches exist)

### Navigating Branches

**View All Branches:**
- Press `Ctrl+T` (or `Cmd+T`) to open the Conversation Tree View
- Click on any node to navigate to it

**Switch Between Sibling Branches:**
- Press `Alt+Left` to go to previous branch
- Press `Alt+Right` to go to next branch
- Use the branch navigator dots to click directly on a branch

**Branch Navigator:**
The branch navigator appears automatically when you have multiple branches at a node. It shows:
- Current branch name/number
- Total number of branches
- Branch indicators (colored dots)
- Navigation controls (previous/next)
- Action buttons (create, delete, merge)

### Tree View

The Conversation Tree View provides a visual overview of your entire conversation structure.

**Features:**
- **Hierarchical Display**: See all messages and branches in a tree
- **Current Path Highlighting**: Active messages are highlighted
- **Expand/Collapse**: Control which branches are visible
- **Click to Navigate**: Jump to any point in the conversation
- **Branch Indicators**: See which messages have multiple children
- **Statistics**: View total nodes, branches, and depth

**Opening Tree View:**
- Press `Ctrl+T`
- Use Command Palette: "Toggle Conversation Tree"
- Dedicated button in chat interface

### Managing Branches

**Rename a Branch:**
- Currently branches are auto-named as "Branch 1", "Branch 2", etc.
- Custom naming coming soon

**Delete a Branch:**
1. Navigate to the branch you want to delete
2. Click the trash icon in the branch navigator
3. Confirm deletion
- Note: Cannot delete the last remaining branch

**Merge Branches:**
1. Navigate to source branch
2. Click the merge icon
3. Select target branch
4. Messages from source will be appended to target

## Architecture

### Tree Structure

```
Root (System Message)
├── User Message 1
│   ├── Assistant Response A
│   │   └── User Follow-up
│   │       ├── Assistant Response B1 [Current]
│   │       └── Assistant Response B2 [Branch 2]
│   └── Assistant Response Alt [Branch 3]
└── (additional paths)
```

### Data Model

**ConversationNode:**
```typescript
interface ConversationNode {
    id: string;
    message: ChatMessage;
    children: ConversationNode[];
    parentId: string | null;
    createdAt: number;
    metadata?: {
        branchName?: string;
        color?: string;
        notes?: string;
    };
}
```

**ConversationTree:**
- Stores all nodes in a Map for O(1) access
- Maintains current path (array of node IDs)
- Tracks active branch ID
- Supports import/export for persistence

### Components

**BranchNavigator.tsx**
- Inline branch navigation control
- Shows when message has siblings
- Provides quick access to branch actions

**ConversationTreeView.tsx**
- Full tree visualization sidebar
- Interactive navigation
- Expand/collapse nodes
- Statistics and overview

**useConversationTree Hook**
- Manages tree state
- Provides actions (add, delete, navigate)
- Handles persistence
- Exposes utilities

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Create new branch from current message |
| `Ctrl+T` | Toggle Conversation Tree view |
| `Alt+Left` | Switch to previous sibling branch |
| `Alt+Right` | Switch to next sibling branch |

## Command Palette Commands

All branching features are available through the Command Palette (`Ctrl+P`):

- **Toggle Conversation Tree** - Open/close tree view
- **Create Branch** - Create new branch from current message
- **Previous Branch** - Navigate to previous sibling
- **Next Branch** - Navigate to next sibling

## API Reference

### useConversationTree Hook

```typescript
const {
    // State
    messages,              // Current path as linear array
    currentPath,          // Array of node IDs in current path
    activeNode,           // Currently active node
    treeManager,          // Underlying tree manager

    // Actions
    addMessage,           // Add message to current path
    createBranch,         // Create new branch
    navigateToNode,       // Jump to specific node
    deleteBranch,         // Delete branch and descendants
    mergeBranch,          // Merge two branches
    replaceMessages,      // Replace entire tree
    clearTree,            // Clear all messages

    // Navigation
    getSiblings,          // Get sibling nodes
    switchToSibling,      // Switch to sibling by index
    getCurrentSiblingIndex, // Get current position
    isInCurrentPath,      // Check if node is in path

    // Utilities
    getStats,             // Get tree statistics
    exportTree,           // Export for persistence
    importTree,           // Import from saved data
} = useConversationTree(initialMessages);
```

### ConversationTreeManager

```typescript
// Create manager
const manager = new ConversationTreeManager(initialMessages);

// Add nodes
const nodeId = manager.addNode(message, parentId, metadata);

// Create branch
const branchId = manager.createBranch(fromNodeId, message, branchName);

// Navigate
manager.navigateToNode(nodeId);

// Get data
const messages = manager.getCurrentMessages();
const siblings = manager.getSiblings(nodeId);
const stats = manager.getTreeStats();

// Export/Import
const exported = manager.exportTree();
const imported = ConversationTreeManager.importTree(data);
```

## Persistence

Branches are automatically saved with your chat session in the following format:

```typescript
interface ChatSession {
    // ... existing fields
    conversationTree?: ExportedTree;  // Tree structure
    usesTreeStructure?: boolean;      // Flag for tree mode
}
```

**Backward Compatibility:**
- Sessions without `usesTreeStructure` are treated as linear
- Linear messages are automatically converted to tree on first branch
- Tree sessions can export to linear format for compatibility

## Best Practices

### When to Use Branching

**Good Use Cases:**
- Testing different prompt variations
- Exploring multiple solutions
- Recovering from bad responses
- Comparing model behaviors
- Creative exploration

**When NOT to Use:**
- Simple linear conversations
- When you don't need alternatives
- Quick Q&A sessions

### Tips

1. **Create Branches Early**: If you think you might want to explore alternatives, create a branch before committing to one path

2. **Name Your Branches**: Use meaningful names when they're added (coming soon) to track what each explores

3. **Delete Dead Ends**: Remove branches that didn't work out to keep your tree clean

4. **Use Tree View for Navigation**: When you have many branches, the tree view is faster than linear navigation

5. **Export Important Branches**: Export interesting conversation paths for later reference

## Performance Considerations

- **Memory**: Each branch stores complete message history
- **Recommended Limit**: ~100 total nodes for smooth performance
- **Optimization**: Tree uses Map for O(1) node access
- **Rendering**: Only current path messages are rendered in chat

## Future Enhancements

Planned features for conversation branching:

- [ ] **Branch Naming**: Custom names for branches
- [ ] **Branch Colors**: Visual color coding
- [ ] **Branch Notes**: Add notes to branches
- [ ] **Branch Comparison**: Side-by-side comparison view
- [ ] **Branch Search**: Search across all branches
- [ ] **Branch Tags**: Tag branches for organization
- [ ] **Branch Templates**: Save branch structures as templates
- [ ] **Undo/Redo**: Full undo/redo support
- [ ] **Branch Statistics**: Analytics per branch
- [ ] **Export Options**: Export individual branches

## Troubleshooting

### Branch Navigator Not Appearing
- Branches only appear when a message has sibling alternatives
- Create a branch first with `Ctrl+B`

### Lost in the Tree
- Press `Ctrl+T` to open tree view
- Current path is highlighted
- Click on any node to jump there

### Can't Delete Branch
- Cannot delete the only remaining branch
- Cannot delete the root node
- Make sure you're not on the branch you want to delete

### Performance Issues
- Limit total nodes to ~100
- Delete unused branches
- Clear old conversations

## Technical Details

**Files:**
- `src/renderer/lib/conversationTree.ts` - Tree data structure (450 lines)
- `src/renderer/components/BranchNavigator.tsx` - Navigation UI (150 lines)
- `src/renderer/components/ConversationTreeView.tsx` - Tree visualization (200 lines)
- `src/renderer/hooks/useConversationTree.ts` - React hook (180 lines)
- `src/renderer/services/history.ts` - Updated for persistence

**Dependencies:**
- None! Pure TypeScript implementation
- Uses existing React/Framer Motion stack

**Bundle Impact:**
- ~50KB additional code
- Minimal runtime overhead
- No external dependencies

---

Built with ❤️ for InferencerC 4.0 - Making conversations more exploratory!
