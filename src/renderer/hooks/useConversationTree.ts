import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage } from '../../shared/types';
import { ConversationTreeManager, ConversationNode } from '../lib/conversationTree';

export const useConversationTree = (initialMessages?: ChatMessage[]) => {
    const [treeManager] = useState(() => new ConversationTreeManager(initialMessages));
    const [revision, setRevision] = useState(0); // Force re-renders when tree changes

    // Force a re-render
    const forceUpdate = useCallback(() => {
        setRevision(prev => prev + 1);
    }, []);

    // Get current messages as linear array
    const messages = useMemo(() => {
        return treeManager.getCurrentMessages();
    }, [treeManager, revision]);

    // Get current path
    const currentPath = useMemo(() => {
        return treeManager['tree'].currentPath;
    }, [treeManager, revision]);

    // Get active node
    const activeNode = useMemo(() => {
        const activeId = treeManager['tree'].activeBranchId;
        return treeManager.getNode(activeId);
    }, [treeManager, revision]);

    // Add a message to the current path
    const addMessage = useCallback((message: ChatMessage) => {
        const activeId = treeManager['tree'].activeBranchId;
        treeManager.addNode(message, activeId);
        treeManager.navigateToNode(treeManager['tree'].activeBranchId);
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Create a branch from the current node
    const createBranch = useCallback((message: ChatMessage, branchName?: string) => {
        const activeId = treeManager['tree'].activeBranchId;
        const newNodeId = treeManager.createBranch(activeId, message, branchName);
        forceUpdate();
        return newNodeId;
    }, [treeManager, forceUpdate]);

    // Navigate to a specific node
    const navigateToNode = useCallback((nodeId: string) => {
        treeManager.navigateToNode(nodeId);
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Delete a branch
    const deleteBranch = useCallback((nodeId: string) => {
        treeManager.deleteBranch(nodeId);
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Merge branches
    const mergeBranch = useCallback((sourceBranchId: string, targetBranchId: string) => {
        treeManager.mergeBranch(sourceBranchId, targetBranchId);
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Get siblings of current node
    const getSiblings = useCallback((nodeId?: string) => {
        const id = nodeId || treeManager['tree'].activeBranchId;
        return treeManager.getSiblings(id);
    }, [treeManager, revision]);

    // Switch to a sibling branch
    const switchToSibling = useCallback((siblingIndex: number) => {
        const activeId = treeManager['tree'].activeBranchId;
        treeManager.switchToSibling(activeId, siblingIndex);
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Get current sibling index
    const getCurrentSiblingIndex = useCallback(() => {
        const activeId = treeManager['tree'].activeBranchId;
        const activeNode = treeManager.getNode(activeId);
        if (!activeNode || !activeNode.parentId) return 0;

        const parent = treeManager.getNode(activeNode.parentId);
        if (!parent) return 0;

        return parent.children.findIndex(child => child.id === activeId);
    }, [treeManager, revision]);

    // Check if a node is in the current path
    const isInCurrentPath = useCallback((nodeId: string) => {
        return treeManager.isInCurrentPath(nodeId);
    }, [treeManager, revision]);

    // Get tree statistics
    const getStats = useCallback(() => {
        return treeManager.getTreeStats();
    }, [treeManager, revision]);

    // Export tree structure
    const exportTree = useCallback(() => {
        return treeManager.exportTree();
    }, [treeManager]);

    // Import tree structure
    const importTree = useCallback((treeData: ReturnType<typeof treeManager.exportTree>) => {
        // This will replace the entire tree
        // Note: Since we can't replace the treeManager instance, we'll need to clear and rebuild
        const importedManager = ConversationTreeManager.importTree(treeData);
        // Copy the imported tree into our current manager
        treeManager['tree'] = importedManager['tree'];
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Replace all messages (useful for loading from history)
    const replaceMessages = useCallback((newMessages: ChatMessage[]) => {
        // Create a new tree manager with the new messages
        const newManager = new ConversationTreeManager(newMessages);
        // Copy into current manager
        treeManager['tree'] = newManager['tree'];
        forceUpdate();
    }, [treeManager, forceUpdate]);

    // Clear the tree
    const clearTree = useCallback(() => {
        const newManager = new ConversationTreeManager();
        treeManager['tree'] = newManager['tree'];
        forceUpdate();
    }, [treeManager, forceUpdate]);

    return {
        // State
        messages,
        currentPath,
        activeNode,
        treeManager,

        // Actions
        addMessage,
        createBranch,
        navigateToNode,
        deleteBranch,
        mergeBranch,
        replaceMessages,
        clearTree,

        // Navigation
        getSiblings,
        switchToSibling,
        getCurrentSiblingIndex,
        isInCurrentPath,

        // Utilities
        getStats,
        exportTree,
        importTree,
    };
};
