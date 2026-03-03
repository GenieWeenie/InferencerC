/** @jest-environment jsdom */
import {
    ConversationTreeManager,
    type MergeOptions,
} from '../src/renderer/lib/conversationTree';
import type { ChatMessage } from '../src/shared/types';

let uuidCounter = 0;
beforeEach(() => {
    uuidCounter = 0;
    jest.spyOn(crypto, 'randomUUID').mockImplementation(() => `node-${++uuidCounter}`);
});

const msg = (role: 'user' | 'assistant' | 'system', content: string): ChatMessage => ({
    role,
    content,
});

describe('ConversationTreeManager', () => {
    let tree: ConversationTreeManager;

    beforeEach(() => {
        tree = new ConversationTreeManager();
    });

    describe('Construction', () => {
        it('creates root node with empty constructor', () => {
            expect(tree.getNode('root')).toBeDefined();
            expect(tree.getNode('root')?.message.role).toBe('system');
            expect(tree.getNode('root')?.message.content).toBe('');
            expect(tree.getCurrentMessages()).toEqual([]);
        });

        it('initializes from linear messages as a chain', () => {
            const messages: ChatMessage[] = [
                msg('user', 'Hello'),
                msg('assistant', 'Hi there'),
                msg('user', 'How are you?'),
            ];
            tree = new ConversationTreeManager(messages);

            const current = tree.getCurrentMessages();
            expect(current).toHaveLength(3);
            expect(current[0].content).toBe('Hello');
            expect(current[1].content).toBe('Hi there');
            expect(current[2].content).toBe('How are you?');
        });

        it('sets active branch to last message when initialized from messages', () => {
            const messages: ChatMessage[] = [
                msg('user', 'A'),
                msg('assistant', 'B'),
            ];
            tree = new ConversationTreeManager(messages);
            const lastNodeId = tree.getCurrentPath().slice(-1)[0]?.id;
            expect(tree.getActiveBranchId()).toBe(lastNodeId);
        });
    });

    describe('addNode / getNode', () => {
        it('adds node and returns ID', () => {
            const id = tree.addNode(msg('user', 'Hello'), 'root');
            expect(id).toBe('node-1');
            const node = tree.getNode(id);
            expect(node).toBeDefined();
            expect(node?.message.content).toBe('Hello');
            expect(node?.message.role).toBe('user');
            expect(node?.parentId).toBe('root');
        });

        it('adds node with metadata', () => {
            const id = tree.addNode(msg('user', 'Test'), 'root', {
                branchName: 'My branch',
                notes: 'A note',
            });
            const node = tree.getNode(id);
            expect(node?.metadata?.branchName).toBe('My branch');
            expect(node?.metadata?.notes).toBe('A note');
        });

        it('chains nodes correctly', () => {
            const id1 = tree.addNode(msg('user', 'A'), 'root');
            const id2 = tree.addNode(msg('assistant', 'B'), id1);
            expect(tree.getNode(id1)?.children).toHaveLength(1);
            expect(tree.getNode(id2)?.parentId).toBe(id1);
        });
    });

    describe('createBranch', () => {
        it('creates branch and navigates to it', () => {
            tree.addNode(msg('user', 'A'), 'root');
            const branchId = tree.createBranch('root', msg('user', 'B'), 'alt');
            expect(tree.getActiveBranchId()).toBe(branchId);
            expect(tree.getCurrentMessages()).toHaveLength(1);
            expect(tree.getCurrentMessages()[0].content).toBe('B');
        });

        it('creates diverging paths', () => {
            const a = tree.addNode(msg('user', 'A'), 'root');
            tree.addNode(msg('assistant', 'B1'), a);
            const branchId = tree.createBranch(a, msg('user', 'C'), 'branch2');
            expect(tree.getBranches(a)).toHaveLength(2);
            expect(tree.getNode(branchId)?.metadata?.branchName).toBe('branch2');
        });
    });

    describe('navigateToNode / getCurrentMessages', () => {
        it('updates current path when navigating', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n1);
            expect(tree.getCurrentMessages()).toEqual([
                expect.objectContaining({ content: 'A' }),
            ]);
            tree.navigateToNode(n2);
            expect(tree.getCurrentMessages()).toEqual([
                expect.objectContaining({ content: 'A' }),
                expect.objectContaining({ content: 'B' }),
            ]);
        });

        it('skips root in getCurrentMessages', () => {
            const n1 = tree.addNode(msg('user', 'Hi'), 'root');
            tree.navigateToNode(n1);
            const msgs = tree.getCurrentMessages();
            expect(msgs.every(m => m.role !== 'system' || m.content !== '')).toBe(true);
            expect(msgs[0].content).toBe('Hi');
        });
    });

    describe('deleteBranch', () => {
        it('removes node and descendants', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n2);
            tree.deleteBranch(n2);
            expect(tree.getNode(n2)).toBeUndefined();
            expect(tree.getNode(n1)).toBeDefined();
        });

        it('auto-navigates to parent when deleting active branch', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n2);
            tree.deleteBranch(n2);
            expect(tree.getActiveBranchId()).toBe(n1);
        });

        it('does not delete root', () => {
            tree.deleteBranch('root');
            expect(tree.getNode('root')).toBeDefined();
        });
    });

    describe('getBranches / getSiblings', () => {
        it('getBranches returns children', () => {
            tree.addNode(msg('user', 'A'), 'root');
            tree.addNode(msg('user', 'B'), 'root');
            const branches = tree.getBranches('root');
            expect(branches).toHaveLength(2);
        });

        it('getSiblings returns alternative paths from same parent', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('user', 'B'), 'root');
            const siblings = tree.getSiblings(n1);
            expect(siblings).toHaveLength(1);
            expect(siblings[0].id).toBe(n2);
        });

        it('getSiblings returns empty for root', () => {
            expect(tree.getSiblings('root')).toEqual([]);
        });
    });

    describe('getTreeStats', () => {
        it('returns correct counts for empty tree', () => {
            const stats = tree.getTreeStats();
            expect(stats.totalNodes).toBe(1);
            expect(stats.totalBranches).toBe(0);
            expect(stats.maxDepth).toBe(0);
            expect(stats.currentDepth).toBe(0);
        });

        it('returns correct counts for linear chain', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n2);
            const stats = tree.getTreeStats();
            expect(stats.totalNodes).toBe(3);
            expect(stats.totalBranches).toBe(0);
            expect(stats.maxDepth).toBe(2);
            expect(stats.currentDepth).toBe(2);
        });

        it('counts branches when node has multiple children', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            tree.addNode(msg('assistant', 'B1'), n1);
            tree.addNode(msg('assistant', 'B2'), n1);
            const stats = tree.getTreeStats();
            expect(stats.totalBranches).toBe(1); // 2 children = 1 extra branch
        });
    });

    describe('exportTree / importTree', () => {
        it('round-trip preserves structure', () => {
            tree.addNode(msg('user', 'A'), 'root');
            const n1 = tree.addNode(msg('assistant', 'B'), 'node-1');
            tree.createBranch('node-1', msg('user', 'C'), 'branch');
            const exported = tree.exportTree();
            const restored = ConversationTreeManager.importTree(exported);

            expect(restored.getCurrentMessages().map(m => m.content)).toEqual(
                tree.getCurrentMessages().map(m => m.content)
            );
            expect(restored.getTreeStats()).toEqual(tree.getTreeStats());
        });

        it('preserves current path and active branch', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n1);
            const exported = tree.exportTree();
            const restored = ConversationTreeManager.importTree(exported);
            expect(restored.getActiveBranchId()).toBe(n1);
        });
    });

    describe('mergeBranch', () => {
        it('appends source messages after target', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            const leafId = tree.addNode(msg('assistant', 'D'), branch2Id);

            tree.navigateToNode(n2);
            tree.mergeBranch(leafId, n2);

            const msgs = tree.getCurrentMessages().map(m => m.content);
            expect(msgs).toContain('C');
            expect(msgs).toContain('D');
        });
    });

    describe('getMergePreview', () => {
        it('returns preview with append strategy', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            const leafId = tree.addNode(msg('assistant', 'D'), branch2Id);

            const preview = tree.getMergePreview(leafId, n2, 'append');
            expect(preview.commonAncestor).toBeDefined();
            expect(preview.sourceMessages.map(m => m.content)).toEqual(['C', 'D']);
            expect(preview.targetMessages.map(m => m.content)).toEqual(['B']);
            expect(preview.mergedMessages.map(m => m.content)).toEqual(['B', 'C', 'D']);
        });

        it('returns preview with interleave strategy', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            tree.addNode(msg('assistant', 'D'), branch2Id);

            const preview = tree.getMergePreview(branch2Id, n2, 'interleave');
            expect(preview.mergedMessages.length).toBeGreaterThan(0);
        });

        it('returns empty for invalid node IDs', () => {
            const preview = tree.getMergePreview('nonexistent', 'root', 'append');
            expect(preview.commonAncestor).toBeNull();
            expect(preview.sourceMessages).toEqual([]);
            expect(preview.mergedMessages).toEqual([]);
        });
    });

    describe('executeMerge', () => {
        it('append strategy adds source messages to target', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            const leafId = tree.addNode(msg('assistant', 'D'), branch2Id);

            const result = tree.executeMerge(leafId, n2, {
                strategy: 'append',
            });
            expect(result.success).toBe(true);
            expect(result.mergedNodeId).toBeDefined();
            expect(result.messagesAdded).toBe(2);
        });

        it('cherry-pick strategy with selectedMessageIndices', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            const leafId = tree.addNode(msg('assistant', 'D'), branch2Id);

            const result = tree.executeMerge(leafId, n2, {
                strategy: 'cherry-pick',
                selectedMessageIndices: [1],
            });
            expect(result.success).toBe(true);
            expect(result.messagesAdded).toBe(1);
        });

        it('cherry-pick fails without selectedMessageIndices', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;

            const result = tree.executeMerge(branch2Id, n2, {
                strategy: 'cherry-pick',
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No messages selected');
        });

        it('squash strategy with squashMessage', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;
            tree.addNode(msg('assistant', 'D'), branch2Id);

            const result = tree.executeMerge(branch2Id, n2, {
                strategy: 'squash',
                squashMessage: 'Summary of C and D',
            });
            expect(result.success).toBe(true);
            expect(result.messagesAdded).toBe(1);
            const msgs = tree.getCurrentMessages();
            expect(msgs.some(m => m.content === 'Summary of C and D')).toBe(true);
        });

        it('squash fails without squashMessage', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branch2Id = tree.getBranches(n1)[1].id;

            const result = tree.executeMerge(branch2Id, n2, {
                strategy: 'squash',
            });
            expect(result.success).toBe(false);
            expect(result.error).toContain('No squash message');
        });
    });

    describe('isInCurrentPath / switchToSibling', () => {
        it('isInCurrentPath returns true for nodes in path', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n2);
            expect(tree.isInCurrentPath('root')).toBe(true);
            expect(tree.isInCurrentPath(n1)).toBe(true);
            expect(tree.isInCurrentPath(n2)).toBe(true);
        });

        it('isInCurrentPath returns false for nodes not in path', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            tree.createBranch('root', msg('user', 'B'), 'alt');
            const branchId = tree.getBranches('root')[1].id;
            tree.navigateToNode(n1);
            expect(tree.isInCurrentPath(branchId)).toBe(false);
        });

        it('switchToSibling navigates to sibling by index', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('user', 'B'), 'root');
            tree.navigateToNode(n1);
            tree.switchToSibling(n1, 0);
            expect(tree.getActiveBranchId()).toBe(n2);
        });

        it('switchToSibling does nothing for invalid index', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            tree.navigateToNode(n1);
            tree.switchToSibling(n1, 99);
            expect(tree.getActiveBranchId()).toBe(n1);
        });
    });

    describe('getMergeableBranches', () => {
        it('returns leaf nodes not in current path', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.createBranch(n1, msg('user', 'C'), 'alt');
            const branchId = tree.getBranches(n1)[1].id;
            const leafId = tree.addNode(msg('assistant', 'D'), branchId);

            tree.navigateToNode(n2);
            const mergeable = tree.getMergeableBranches(n1);
            expect(mergeable.length).toBeGreaterThan(0);
            const leafNode = mergeable.find(n => n.id === leafId);
            expect(leafNode).toBeDefined();
            expect(leafNode?.message.content).toBe('D');
        });

        it('excludes nodes in current path', () => {
            const n1 = tree.addNode(msg('user', 'A'), 'root');
            const n2 = tree.addNode(msg('assistant', 'B'), n1);
            tree.navigateToNode(n2);
            const mergeable = tree.getMergeableBranches('root');
            expect(mergeable.every(n => !tree.isInCurrentPath(n.id))).toBe(true);
        });
    });
});
