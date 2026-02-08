import { ChatMessage } from '../../shared/types';

/**
 * A node in the conversation tree
 * Each node can have multiple children, representing different conversation branches
 */
export interface ConversationNode {
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

/**
 * Represents a path through the conversation tree
 */
export interface ConversationPath {
    nodeIds: string[];
    name?: string;
}

/**
 * The conversation tree structure
 */
export interface ConversationTree {
    rootId: string;
    nodes: Map<string, ConversationNode>;
    currentPath: string[]; // Array of node IDs representing the current path
    activeBranchId: string; // ID of the currently active node
}

export class ConversationTreeManager {
    private tree: ConversationTree;

    constructor(initialMessages?: ChatMessage[]) {
        // Initialize with a root node
        const rootNode: ConversationNode = {
            id: 'root',
            message: {
                role: 'system',
                content: '',
            },
            children: [],
            parentId: null,
            createdAt: Date.now(),
        };

        this.tree = {
            rootId: 'root',
            nodes: new Map([['root', rootNode]]),
            currentPath: ['root'],
            activeBranchId: 'root',
        };

        // Convert linear messages to tree structure
        if (initialMessages && initialMessages.length > 0) {
            this.initializeFromLinearHistory(initialMessages);
        }
    }

    /**
     * Convert linear chat history to tree structure
     */
    private initializeFromLinearHistory(messages: ChatMessage[]): void {
        let parentId = 'root';

        messages.forEach((message, index) => {
            const nodeId = this.addNode(message, parentId);
            parentId = nodeId;
            this.tree.currentPath.push(nodeId);
        });

        if (this.tree.currentPath.length > 1) {
            this.tree.activeBranchId = this.tree.currentPath[this.tree.currentPath.length - 1];
        }
    }

    /**
     * Add a new node to the tree
     */
    addNode(message: ChatMessage, parentId: string, metadata?: ConversationNode['metadata']): string {
        const nodeId = crypto.randomUUID();
        const node: ConversationNode = {
            id: nodeId,
            message,
            children: [],
            parentId,
            createdAt: Date.now(),
            metadata,
        };

        this.tree.nodes.set(nodeId, node);

        // Add to parent's children
        const parent = this.tree.nodes.get(parentId);
        if (parent) {
            parent.children.push(node);
        }

        return nodeId;
    }

    /**
     * Create a new branch from a specific node
     */
    createBranch(fromNodeId: string, message: ChatMessage, branchName?: string): string {
        const metadata = branchName ? { branchName } : undefined;
        const newNodeId = this.addNode(message, fromNodeId, metadata);

        // Update current path to include the new branch
        this.navigateToNode(newNodeId);

        return newNodeId;
    }

    /**
     * Navigate to a specific node and update the current path
     */
    navigateToNode(nodeId: string): void {
        const path = this.getPathToNode(nodeId);
        if (path) {
            this.tree.currentPath = path;
            this.tree.activeBranchId = nodeId;
        }
    }

    /**
     * Get the path from root to a specific node
     */
    private getPathToNode(nodeId: string): string[] | null {
        const path: string[] = [];
        let currentId: string | null = nodeId;

        while (currentId !== null) {
            path.unshift(currentId);
            const node = this.tree.nodes.get(currentId);
            if (!node) return null;
            currentId = node.parentId;
        }

        return path;
    }

    /**
     * Get all messages in the current path (as a linear array)
     */
    getCurrentMessages(): ChatMessage[] {
        return this.tree.currentPath
            .slice(1) // Skip root
            .map(nodeId => this.tree.nodes.get(nodeId)?.message)
            .filter(Boolean) as ChatMessage[];
    }

    /**
     * Get a specific node by ID
     */
    getNode(nodeId: string): ConversationNode | undefined {
        return this.tree.nodes.get(nodeId);
    }

    /**
     * Get all child branches of a node
     */
    getBranches(nodeId: string): ConversationNode[] {
        const node = this.tree.nodes.get(nodeId);
        return node?.children || [];
    }

    /**
     * Delete a branch (node and all its descendants)
     */
    deleteBranch(nodeId: string): void {
        const node = this.tree.nodes.get(nodeId);
        if (!node || nodeId === 'root') return;

        // Remove from parent's children
        const parent = node.parentId ? this.tree.nodes.get(node.parentId) : null;
        if (parent) {
            parent.children = parent.children.filter(child => child.id !== nodeId);
        }

        // Recursively delete all descendants
        this.deleteNodeAndDescendants(nodeId);

        // If we deleted the active node, navigate to parent
        if (this.tree.activeBranchId === nodeId && node.parentId) {
            this.navigateToNode(node.parentId);
        }
    }

    /**
     * Recursively delete a node and all its descendants
     */
    private deleteNodeAndDescendants(nodeId: string): void {
        const node = this.tree.nodes.get(nodeId);
        if (!node) return;

        // Delete all children first
        node.children.forEach(child => {
            this.deleteNodeAndDescendants(child.id);
        });

        // Delete this node
        this.tree.nodes.delete(nodeId);
    }

    /**
     * Merge a branch into another branch
     * This appends the messages from sourceBranch to targetBranch
     */
    mergeBranch(sourceBranchId: string, targetBranchId: string): void {
        const sourceNode = this.tree.nodes.get(sourceBranchId);
        const targetNode = this.tree.nodes.get(targetBranchId);

        if (!sourceNode || !targetNode) return;

        // Get all messages in the source branch path
        const sourcePath = this.getPathToNode(sourceBranchId);
        if (!sourcePath) return;

        // Find the common ancestor
        const targetPath = this.getPathToNode(targetBranchId);
        if (!targetPath) return;

        const commonAncestorIndex = this.findCommonAncestorIndex(sourcePath, targetPath);
        const messagesToMerge = sourcePath
            .slice(commonAncestorIndex + 1)
            .map(id => this.tree.nodes.get(id)?.message)
            .filter(Boolean) as ChatMessage[];

        // Append messages to target branch
        let currentParent = targetBranchId;
        messagesToMerge.forEach(message => {
            currentParent = this.addNode(message, currentParent);
        });

        // Navigate to the merged result
        this.navigateToNode(currentParent);
    }

    /**
     * Find the index of the last common ancestor in two paths
     */
    private findCommonAncestorIndex(path1: string[], path2: string[]): number {
        let i = 0;
        while (i < path1.length && i < path2.length && path1[i] === path2[i]) {
            i++;
        }
        return i - 1;
    }

    /**
     * Get statistics about the tree
     */
    getTreeStats(): {
        totalNodes: number;
        totalBranches: number;
        maxDepth: number;
        currentDepth: number;
    } {
        let maxDepth = 0;
        let branchCount = 0;

        const calculateDepth = (nodeId: string, depth: number): void => {
            maxDepth = Math.max(maxDepth, depth);
            const node = this.tree.nodes.get(nodeId);
            if (node) {
                if (node.children.length > 1) {
                    branchCount += node.children.length - 1;
                }
                node.children.forEach(child => {
                    calculateDepth(child.id, depth + 1);
                });
            }
        };

        calculateDepth(this.tree.rootId, 0);

        return {
            totalNodes: this.tree.nodes.size,
            totalBranches: branchCount,
            maxDepth,
            currentDepth: this.tree.currentPath.length - 1,
        };
    }

    /**
     * Export the tree structure for persistence
     */
    exportTree(): {
        rootId: string;
        nodes: Array<ConversationNode & { childIds: string[] }>;
        currentPath: string[];
        activeBranchId: string;
    } {
        const nodes = Array.from(this.tree.nodes.values()).map(node => ({
            ...node,
            childIds: node.children.map(child => child.id),
            children: [], // Don't export circular references
        }));

        return {
            rootId: this.tree.rootId,
            nodes,
            currentPath: this.tree.currentPath,
            activeBranchId: this.tree.activeBranchId,
        };
    }

    /**
     * Import a tree structure
     */
    static importTree(data: ReturnType<ConversationTreeManager['exportTree']>): ConversationTreeManager {
        const manager = new ConversationTreeManager();
        manager.tree.rootId = data.rootId;
        manager.tree.currentPath = data.currentPath;
        manager.tree.activeBranchId = data.activeBranchId;

        // First pass: create all nodes
        const nodeMap = new Map<string, ConversationNode>();
        data.nodes.forEach(nodeData => {
            const node: ConversationNode = {
                id: nodeData.id,
                message: nodeData.message,
                children: [],
                parentId: nodeData.parentId,
                createdAt: nodeData.createdAt,
                metadata: nodeData.metadata,
            };
            nodeMap.set(node.id, node);
        });

        // Second pass: rebuild parent-child relationships
        data.nodes.forEach(nodeData => {
            const node = nodeMap.get(nodeData.id);
            if (node && 'childIds' in nodeData) {
                const childIds = nodeData.childIds as string[];
                node.children = childIds
                    .map(id => nodeMap.get(id))
                    .filter(Boolean) as ConversationNode[];
            }
        });

        manager.tree.nodes = nodeMap;
        return manager;
    }

    /**
     * Get sibling branches (alternative paths from the parent)
     */
    getSiblings(nodeId: string): ConversationNode[] {
        const node = this.tree.nodes.get(nodeId);
        if (!node || !node.parentId) return [];

        const parent = this.tree.nodes.get(node.parentId);
        if (!parent) return [];

        return parent.children.filter(child => child.id !== nodeId);
    }

    /**
     * Check if a node is in the current path
     */
    isInCurrentPath(nodeId: string): boolean {
        return this.tree.currentPath.includes(nodeId);
    }

    /**
     * Switch to a sibling branch
     */
    switchToSibling(currentNodeId: string, siblingIndex: number): void {
        const siblings = this.getSiblings(currentNodeId);
        if (siblingIndex >= 0 && siblingIndex < siblings.length) {
            this.navigateToNode(siblings[siblingIndex].id);
        }
    }

    // ==================== ADVANCED MERGE CAPABILITIES ====================

    /**
     * Merge strategy types
     */
    static readonly MERGE_STRATEGIES = {
        APPEND: 'append',           // Append source messages after target
        INTERLEAVE: 'interleave',   // Interleave messages by role
        CHERRY_PICK: 'cherry-pick', // Select specific messages to merge
        SQUASH: 'squash',           // Combine into a summary
    } as const;

    /**
     * Merge preview - shows what the merge would look like
     */
    getMergePreview(
        sourceBranchId: string,
        targetBranchId: string,
        strategy: string = 'append'
    ): {
        commonAncestor: ConversationNode | null;
        sourceMessages: ChatMessage[];
        targetMessages: ChatMessage[];
        mergedMessages: ChatMessage[];
        conflicts: MergeConflict[];
    } {
        const sourceNode = this.tree.nodes.get(sourceBranchId);
        const targetNode = this.tree.nodes.get(targetBranchId);

        if (!sourceNode || !targetNode) {
            return {
                commonAncestor: null,
                sourceMessages: [],
                targetMessages: [],
                mergedMessages: [],
                conflicts: [],
            };
        }

        const sourcePath = this.getPathToNode(sourceBranchId);
        const targetPath = this.getPathToNode(targetBranchId);

        if (!sourcePath || !targetPath) {
            return {
                commonAncestor: null,
                sourceMessages: [],
                targetMessages: [],
                mergedMessages: [],
                conflicts: [],
            };
        }

        // Find common ancestor
        const commonIndex = this.findCommonAncestorIndex(sourcePath, targetPath);
        const commonAncestorId = sourcePath[commonIndex];
        const commonAncestor = this.tree.nodes.get(commonAncestorId) || null;

        // Get messages from each branch after the common ancestor
        const sourceMessages = sourcePath
            .slice(commonIndex + 1)
            .map(id => this.tree.nodes.get(id)?.message)
            .filter(Boolean) as ChatMessage[];

        const targetMessages = targetPath
            .slice(commonIndex + 1)
            .map(id => this.tree.nodes.get(id)?.message)
            .filter(Boolean) as ChatMessage[];

        // Calculate merged messages based on strategy
        let mergedMessages: ChatMessage[] = [];
        const conflicts: MergeConflict[] = [];

        switch (strategy) {
            case 'append':
                mergedMessages = [...targetMessages, ...sourceMessages];
                break;

            case 'interleave':
                mergedMessages = this.interleaveMessages(targetMessages, sourceMessages);
                break;

            case 'cherry-pick':
                // For cherry-pick, return all messages and let UI handle selection
                mergedMessages = [...targetMessages];
                break;

            default:
                mergedMessages = [...targetMessages, ...sourceMessages];
        }

        // Detect potential conflicts (e.g., similar user messages with different responses)
        this.detectConflicts(sourceMessages, targetMessages, conflicts);

        return {
            commonAncestor,
            sourceMessages,
            targetMessages,
            mergedMessages,
            conflicts,
        };
    }

    /**
     * Interleave messages by role (user/assistant pairs)
     */
    private interleaveMessages(target: ChatMessage[], source: ChatMessage[]): ChatMessage[] {
        const result: ChatMessage[] = [];
        let tIdx = 0;
        let sIdx = 0;

        while (tIdx < target.length || sIdx < source.length) {
            // Add user message from target
            if (tIdx < target.length && target[tIdx].role === 'user') {
                result.push(target[tIdx]);
                tIdx++;
            }

            // Add assistant response from target
            if (tIdx < target.length && target[tIdx].role === 'assistant') {
                result.push(target[tIdx]);
                tIdx++;
            }

            // Add user message from source
            if (sIdx < source.length && source[sIdx].role === 'user') {
                result.push(source[sIdx]);
                sIdx++;
            }

            // Add assistant response from source
            if (sIdx < source.length && source[sIdx].role === 'assistant') {
                result.push(source[sIdx]);
                sIdx++;
            }

            // Handle remaining messages
            if (tIdx < target.length) {
                result.push(target[tIdx]);
                tIdx++;
            }
            if (sIdx < source.length) {
                result.push(source[sIdx]);
                sIdx++;
            }
        }

        return result;
    }

    /**
     * Detect potential merge conflicts
     */
    private detectConflicts(
        source: ChatMessage[],
        target: ChatMessage[],
        conflicts: MergeConflict[]
    ): void {
        // Simple conflict detection: similar user messages with different responses
        const sourceUserMsgs = source.filter(m => m.role === 'user');
        const targetUserMsgs = target.filter(m => m.role === 'user');

        for (const sMsg of sourceUserMsgs) {
            for (const tMsg of targetUserMsgs) {
                const similarity = this.calculateSimilarity(sMsg.content, tMsg.content);
                if (similarity > 0.8) {
                    // Find the responses to these messages
                    const sIdx = source.indexOf(sMsg);
                    const tIdx = target.indexOf(tMsg);
                    const sResponse = source[sIdx + 1];
                    const tResponse = target[tIdx + 1];

                    if (sResponse && tResponse && sResponse.content !== tResponse.content) {
                        conflicts.push({
                            type: 'divergent-response',
                            sourceMessage: sMsg,
                            targetMessage: tMsg,
                            sourceResponse: sResponse,
                            targetResponse: tResponse,
                            similarity,
                        });
                    }
                }
            }
        }
    }

    /**
     * Simple similarity calculation between two strings
     */
    private calculateSimilarity(a: string, b: string): number {
        const aWords = new Set(a.toLowerCase().split(/\s+/));
        const bWords = new Set(b.toLowerCase().split(/\s+/));

        const intersection = [...aWords].filter(w => bWords.has(w)).length;
        const union = new Set([...aWords, ...bWords]).size;

        return union > 0 ? intersection / union : 0;
    }

    /**
     * Execute merge with specific strategy
     */
    executeMerge(
        sourceBranchId: string,
        targetBranchId: string,
        options: MergeOptions
    ): MergeResult {
        const preview = this.getMergePreview(sourceBranchId, targetBranchId, options.strategy);

        if (!preview.commonAncestor) {
            return {
                success: false,
                error: 'Could not find common ancestor',
                mergedNodeId: null,
            };
        }

        let messagesToAdd: ChatMessage[];

        switch (options.strategy) {
            case 'append':
                messagesToAdd = preview.sourceMessages;
                break;

            case 'interleave':
                // For interleave, we need to replace all messages after common ancestor
                messagesToAdd = preview.mergedMessages;
                // In this case, we create a new branch from the common ancestor
                break;

            case 'cherry-pick':
                if (!options.selectedMessageIndices) {
                    return {
                        success: false,
                        error: 'No messages selected for cherry-pick',
                        mergedNodeId: null,
                    };
                }
                messagesToAdd = options.selectedMessageIndices
                    .map(idx => preview.sourceMessages[idx])
                    .filter(Boolean);
                break;

            case 'squash':
                // For squash, we create a summary message
                if (!options.squashMessage) {
                    return {
                        success: false,
                        error: 'No squash message provided',
                        mergedNodeId: null,
                    };
                }
                messagesToAdd = [{
                    role: 'assistant' as const,
                    content: options.squashMessage,
                }];
                break;

            default:
                messagesToAdd = preview.sourceMessages;
        }

        // Apply the merge
        let currentParent = targetBranchId;

        for (const message of messagesToAdd) {
            const newNodeId = this.addNode(
                { ...message },
                currentParent,
                { branchName: options.mergeBranchName || 'Merged' }
            );
            currentParent = newNodeId;
        }

        // Navigate to the merged result
        this.navigateToNode(currentParent);

        // Optionally delete the source branch
        if (options.deleteSourceAfterMerge) {
            this.deleteBranch(sourceBranchId);
        }

        return {
            success: true,
            mergedNodeId: currentParent,
            messagesAdded: messagesToAdd.length,
        };
    }

    /**
     * Get all mergeable branches from a given node
     */
    getMergeableBranches(nodeId: string): ConversationNode[] {
        const currentPath = new Set(this.tree.currentPath);
        const result: ConversationNode[] = [];

        // Find all leaf nodes that are not in the current path
        const findLeaves = (node: ConversationNode) => {
            if (node.children.length === 0 && !currentPath.has(node.id)) {
                result.push(node);
            }
            for (const child of node.children) {
                findLeaves(child);
            }
        };

        const root = this.tree.nodes.get(this.tree.rootId);
        if (root) {
            findLeaves(root);
        }

        return result;
    }

    /**
     * Get the current path nodes
     */
    getCurrentPath(): ConversationNode[] {
        return this.tree.currentPath
            .map(id => this.tree.nodes.get(id))
            .filter(Boolean) as ConversationNode[];
    }

    /**
     * Get the active branch ID
     */
    getActiveBranchId(): string {
        return this.tree.activeBranchId;
    }
}

// Types for merge operations
export interface MergeConflict {
    type: 'divergent-response';
    sourceMessage: ChatMessage;
    targetMessage: ChatMessage;
    sourceResponse?: ChatMessage;
    targetResponse?: ChatMessage;
    similarity: number;
}

export interface MergeOptions {
    strategy: 'append' | 'interleave' | 'cherry-pick' | 'squash';
    selectedMessageIndices?: number[];
    squashMessage?: string;
    mergeBranchName?: string;
    deleteSourceAfterMerge?: boolean;
}

export interface MergeResult {
    success: boolean;
    error?: string;
    mergedNodeId: string | null;
    messagesAdded?: number;
}
