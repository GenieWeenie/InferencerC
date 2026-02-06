/**
 * Blockchain Integration Panel
 *
 * Decentralized conversation storage
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link, CheckCircle, Clock, AlertCircle, Copy, ExternalLink } from 'lucide-react';
import {
    blockchainIntegrationService,
    BlockchainTransaction,
    ConversationBlock,
} from '../services/blockchainIntegration';
import { toast } from 'sonner';

interface BlockchainPanelProps {
    isOpen: boolean;
    onClose: () => void;
    sessionId?: string;
    conversationData?: unknown;
}

export const BlockchainPanel: React.FC<BlockchainPanelProps> = ({
    isOpen,
    onClose,
    sessionId,
    conversationData,
}) => {
    const [config, setConfig] = useState(blockchainIntegrationService.getConfig());
    const [transactions, setTransactions] = useState<BlockchainTransaction[]>([]);
    const [storedBlocks, setStoredBlocks] = useState<ConversationBlock[]>([]);
    const [isStoring, setIsStoring] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setTransactions(blockchainIntegrationService.getTransactionHistory());
        }
    }, [isOpen]);

    const handleConfigChange = (updates: Partial<typeof config>) => {
        const updated = { ...config, ...updates };
        setConfig(updated);
        blockchainIntegrationService.saveConfig(updates);
    };

    const handleStoreConversation = async () => {
        if (!sessionId || !conversationData) {
            toast.error('No conversation to store');
            return;
        }

        if (!config.enabled) {
            toast.error('Blockchain integration is not enabled');
            return;
        }

        setIsStoring(true);
        try {
            const block = await blockchainIntegrationService.storeConversation(
                sessionId,
                conversationData
            );
            setStoredBlocks(prev => [...prev, block]);
            setTransactions(blockchainIntegrationService.getTransactionHistory());
            toast.success('Conversation stored on blockchain!');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to store conversation');
        } finally {
            setIsStoring(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Link className="w-6 h-6 text-yellow-400" />
                            <h2 className="text-2xl font-bold text-white">Blockchain Integration</h2>
                            <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded">
                                Experimental
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {/* Configuration */}
                        <section>
                            <h3 className="text-lg font-semibold text-white mb-4">Configuration</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800 rounded border border-slate-700">
                                    <div>
                                        <div className="font-medium text-white">Enable Blockchain</div>
                                        <div className="text-sm text-slate-400">Store conversations on blockchain</div>
                                    </div>
                                    <button
                                        onClick={() => handleConfigChange({ enabled: !config.enabled })}
                                        className={`relative w-12 h-6 rounded-full transition-colors ${
                                            config.enabled ? 'bg-yellow-500' : 'bg-slate-700'
                                        }`}
                                    >
                                        <div className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                                            config.enabled ? 'translate-x-6' : 'translate-x-0'
                                        }`} />
                                    </button>
                                </div>

                                {config.enabled && (
                                    <>
                                        <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                            <label className="block text-sm font-medium text-slate-300 mb-2">Network</label>
                                            <select
                                                value={config.network}
                                                onChange={(e) => handleConfigChange({ network: e.target.value as any })}
                                                className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                                            >
                                                <option value="local">Local (Testing)</option>
                                                <option value="ethereum">Ethereum</option>
                                                <option value="polygon">Polygon</option>
                                                <option value="arbitrum">Arbitrum</option>
                                            </select>
                                        </div>

                                        {config.contractAddress && (
                                            <div className="p-4 bg-slate-800 rounded border border-slate-700">
                                                <label className="block text-sm font-medium text-slate-300 mb-2">Contract Address</label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={config.contractAddress}
                                                        onChange={(e) => handleConfigChange({ contractAddress: e.target.value })}
                                                        className="flex-1 px-4 py-2 bg-slate-700 border border-slate-600 rounded text-white font-mono text-sm"
                                                        placeholder="0x..."
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            if (config.contractAddress) {
                                                                navigator.clipboard.writeText(config.contractAddress);
                                                                toast.success('Copied!');
                                                            }
                                                        }}
                                                        className="p-2 bg-slate-700 hover:bg-slate-600 rounded"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </section>

                        {/* Store Conversation */}
                        {sessionId && conversationData && (
                            <section>
                                <h3 className="text-lg font-semibold text-white mb-4">Store Conversation</h3>
                                <button
                                    onClick={handleStoreConversation}
                                    disabled={!config.enabled || isStoring}
                                    className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isStoring ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Storing...
                                        </>
                                    ) : (
                                        <>
                                            <Link size={18} />
                                            Store on Blockchain
                                        </>
                                    )}
                                </button>
                            </section>
                        )}

                        {/* Stored Blocks */}
                        {storedBlocks.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-white mb-4">Stored Conversations</h3>
                                <div className="space-y-2">
                                    {storedBlocks.map((block) => (
                                        <div
                                            key={block.transactionHash}
                                            className="p-4 bg-slate-800 rounded border border-slate-700"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="w-4 h-4 text-green-400" />
                                                    <span className="text-sm font-mono text-white">
                                                        {block.transactionHash.substring(0, 16)}...
                                                    </span>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(block.transactionHash);
                                                        toast.success('Transaction hash copied!');
                                                    }}
                                                    className="p-1 text-slate-400 hover:text-white"
                                                >
                                                    <Copy size={12} />
                                                </button>
                                            </div>
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <div>Block: {block.blockNumber}</div>
                                                <div>Session: {block.sessionId}</div>
                                                <div>{new Date(block.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Transaction History */}
                        {transactions.length > 0 && (
                            <section>
                                <h3 className="text-lg font-semibold text-white mb-4">Transaction History</h3>
                                <div className="space-y-2">
                                    {transactions.map((tx) => (
                                        <div
                                            key={tx.hash}
                                            className="p-4 bg-slate-800 rounded border border-slate-700"
                                        >
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    {tx.status === 'confirmed' ? (
                                                        <CheckCircle className="w-4 h-4 text-green-400" />
                                                    ) : tx.status === 'pending' ? (
                                                        <Clock className="w-4 h-4 text-yellow-400" />
                                                    ) : (
                                                        <AlertCircle className="w-4 h-4 text-red-400" />
                                                    )}
                                                    <span className="text-sm font-mono text-white">
                                                        {tx.hash.substring(0, 16)}...
                                                    </span>
                                                </div>
                                                <span className={`text-xs px-2 py-1 rounded ${
                                                    tx.status === 'confirmed' ? 'bg-green-500/20 text-green-400' :
                                                    tx.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                                                    'bg-red-500/20 text-red-400'
                                                }`}>
                                                    {tx.status}
                                                </span>
                                            </div>
                                            <div className="text-xs text-slate-400 space-y-1">
                                                <div>Gas: {tx.gasUsed}</div>
                                                <div>{new Date(tx.timestamp).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
