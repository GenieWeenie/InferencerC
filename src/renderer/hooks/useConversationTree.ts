import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChatMessage } from '../../shared/types';

interface UseConversationTreeOptions {
    enabled?: boolean;
}

type ConversationTreeModule = typeof import('../lib/conversationTree');
type ConversationTreeManagerClass = ConversationTreeModule['ConversationTreeManager'];
type ConversationTreeManagerInstance = InstanceType<ConversationTreeManagerClass>;
type ExportedConversationTree = ReturnType<ConversationTreeManagerInstance['exportTree']>;

let conversationTreeModulePromise: Promise<ConversationTreeModule> | null = null;

const loadConversationTreeModule = async (): Promise<ConversationTreeModule> => {
    if (!conversationTreeModulePromise) {
        conversationTreeModulePromise = import('../lib/conversationTree').catch((error) => {
            conversationTreeModulePromise = null;
            throw error;
        });
    }
    return conversationTreeModulePromise;
};

export const useConversationTree = (
    initialMessages: ChatMessage[] = [],
    options: UseConversationTreeOptions = {}
) => {
    const { enabled = true } = options;
    const treeManagerRef = useRef<ConversationTreeManagerInstance | null>(null);
    const initialMessagesRef = useRef<ChatMessage[]>(initialMessages);
    const pendingReplaceMessagesRef = useRef<ChatMessage[] | null>(null);
    const isLoadingRef = useRef(false);
    const [revision, setRevision] = useState(0); // Force re-renders when tree changes

    useEffect(() => {
        initialMessagesRef.current = initialMessages;
    }, [initialMessages]);

    const forceUpdate = useCallback(() => {
        setRevision(prev => prev + 1);
    }, []);

    const initializeTreeManager = useCallback(async () => {
        if (!enabled || treeManagerRef.current || isLoadingRef.current) {
            return;
        }

        isLoadingRef.current = true;
        try {
            const { ConversationTreeManager } = await loadConversationTreeModule();
            const seedMessages = pendingReplaceMessagesRef.current ?? initialMessagesRef.current;
            pendingReplaceMessagesRef.current = null;
            treeManagerRef.current = new ConversationTreeManager(seedMessages);
            forceUpdate();
        } catch (error) {
            console.warn('Failed to initialize conversation tree:', error);
        } finally {
            isLoadingRef.current = false;
        }
    }, [enabled, forceUpdate]);

    useEffect(() => {
        void initializeTreeManager();
    }, [initializeTreeManager]);

    const getTreeManager = useCallback(() => treeManagerRef.current, []);

    // Get current messages as linear array
    const messages = useMemo(() => {
        const manager = getTreeManager();
        return manager ? manager.getCurrentMessages() : [];
    }, [getTreeManager, revision]);

    // Get current path
    const currentPath = useMemo(() => {
        const manager = getTreeManager();
        return manager ? manager['tree'].currentPath : ['root'];
    }, [getTreeManager, revision]);

    // Get active node
    const activeNode = useMemo(() => {
        const manager = getTreeManager();
        if (!manager) return undefined;
        const activeId = manager['tree'].activeBranchId;
        return manager.getNode(activeId);
    }, [getTreeManager, revision]);

    // Add a message to the current path
    const addMessage = useCallback((message: ChatMessage) => {
        const manager = getTreeManager();
        if (!manager) {
            void initializeTreeManager();
            return;
        }
        const activeId = manager['tree'].activeBranchId;
        manager.addNode(message, activeId);
        manager.navigateToNode(manager['tree'].activeBranchId);
        forceUpdate();
    }, [getTreeManager, forceUpdate, initializeTreeManager]);

    // Create a branch from the current node
    const createBranch = useCallback((message: ChatMessage, branchName?: string) => {
        const manager = getTreeManager();
        if (!manager) {
            void initializeTreeManager();
            return null;
        }
        const activeId = manager['tree'].activeBranchId;
        const newNodeId = manager.createBranch(activeId, message, branchName);
        forceUpdate();
        return newNodeId;
    }, [getTreeManager, forceUpdate, initializeTreeManager]);

    // Navigate to a specific node
    const navigateToNode = useCallback((nodeId: string) => {
        const manager = getTreeManager();
        if (!manager) return;
        manager.navigateToNode(nodeId);
        forceUpdate();
    }, [getTreeManager, forceUpdate]);

    // Delete a branch
    const deleteBranch = useCallback((nodeId: string) => {
        const manager = getTreeManager();
        if (!manager) return;
        manager.deleteBranch(nodeId);
        forceUpdate();
    }, [getTreeManager, forceUpdate]);

    // Merge branches
    const mergeBranch = useCallback((sourceBranchId: string, targetBranchId: string) => {
        const manager = getTreeManager();
        if (!manager) return;
        manager.mergeBranch(sourceBranchId, targetBranchId);
        forceUpdate();
    }, [getTreeManager, forceUpdate]);

    // Get siblings of current node
    const getSiblings = useCallback((nodeId?: string) => {
        const manager = getTreeManager();
        if (!manager) return [];
        const id = nodeId || manager['tree'].activeBranchId;
        return manager.getSiblings(id);
    }, [getTreeManager, revision]);

    // Switch to a sibling branch
    const switchToSibling = useCallback((siblingIndex: number) => {
        const manager = getTreeManager();
        if (!manager) return;
        const activeId = manager['tree'].activeBranchId;
        manager.switchToSibling(activeId, siblingIndex);
        forceUpdate();
    }, [getTreeManager, forceUpdate]);

    // Get current sibling index
    const getCurrentSiblingIndex = useCallback(() => {
        const manager = getTreeManager();
        if (!manager) return 0;
        const activeId = manager['tree'].activeBranchId;
        const active = manager.getNode(activeId);
        if (!active || !active.parentId) return 0;

        const parent = manager.getNode(active.parentId);
        if (!parent) return 0;

        return parent.children.findIndex(child => child.id === activeId);
    }, [getTreeManager, revision]);

    // Check if a node is in the current path
    const isInCurrentPath = useCallback((nodeId: string) => {
        const manager = getTreeManager();
        return manager ? manager.isInCurrentPath(nodeId) : false;
    }, [getTreeManager, revision]);

    // Get tree statistics
    const getStats = useCallback(() => {
        const manager = getTreeManager();
        if (!manager) {
            return {
                totalNodes: 1,
                totalBranches: 0,
                maxDepth: 0,
                currentDepth: 0,
            };
        }
        return manager.getTreeStats();
    }, [getTreeManager, revision]);

    // Export tree structure
    const exportTree = useCallback(() => {
        const manager = getTreeManager();
        return manager ? manager.exportTree() : null;
    }, [getTreeManager]);

    // Import tree structure
    const importTree = useCallback((treeData: ExportedConversationTree) => {
        const manager = getTreeManager();
        if (!manager) {
            void loadConversationTreeModule()
                .then(({ ConversationTreeManager }) => {
                    treeManagerRef.current = ConversationTreeManager.importTree(treeData);
                    forceUpdate();
                })
                .catch((error) => {
                    console.warn('Failed to import conversation tree:', error);
                });
            return;
        }

        const importedManager = (manager.constructor as ConversationTreeManagerClass).importTree(treeData);
        manager['tree'] = importedManager['tree'];
        forceUpdate();
    }, [getTreeManager, forceUpdate]);

    // Replace all messages (useful for loading from history)
    const replaceMessages = useCallback((newMessages: ChatMessage[]) => {
        const manager = getTreeManager();
        if (!manager) {
            pendingReplaceMessagesRef.current = newMessages;
            void initializeTreeManager();
            return;
        }

        const ManagerConstructor = manager.constructor as new (messages?: ChatMessage[]) => ConversationTreeManagerInstance;
        const newManager = new ManagerConstructor(newMessages);
        manager['tree'] = newManager['tree'];
        forceUpdate();
    }, [getTreeManager, forceUpdate, initializeTreeManager]);

    // Clear the tree
    const clearTree = useCallback(() => {
        const manager = getTreeManager();
        if (!manager) {
            pendingReplaceMessagesRef.current = [];
            void initializeTreeManager();
            return;
        }

        const ManagerConstructor = manager.constructor as new () => ConversationTreeManagerInstance;
        const newManager = new ManagerConstructor();
        manager['tree'] = newManager['tree'];
        forceUpdate();
    }, [getTreeManager, forceUpdate, initializeTreeManager]);

    return {
        // State
        messages,
        currentPath,
        activeNode,
        treeManager: treeManagerRef.current,

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
