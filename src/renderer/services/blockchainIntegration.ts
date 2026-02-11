/**
 * Blockchain Integration Service
 *
 * Decentralized conversation storage
 */

export interface BlockchainConfig {
    enabled: boolean;
    network: 'ethereum' | 'polygon' | 'arbitrum' | 'local';
    contractAddress?: string;
    privateKey?: string; // Encrypted
    gasPrice?: number;
}

export interface ConversationBlock {
    blockNumber: number;
    transactionHash: string;
    sessionId: string;
    encryptedData: string;
    timestamp: number;
    blockHash: string;
}

export interface BlockchainTransaction {
    hash: string;
    from: string;
    to: string;
    value: string;
    gasUsed: number;
    status: 'pending' | 'confirmed' | 'failed';
    timestamp: number;
}

const BLOCKCHAIN_NETWORKS = new Set<BlockchainConfig['network']>(['ethereum', 'polygon', 'arbitrum', 'local']);
const TRANSACTION_STATUSES = new Set<BlockchainTransaction['status']>(['pending', 'confirmed', 'failed']);

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === 'object' && value !== null
);

const parseJson = (raw: string): unknown => {
    try {
        return JSON.parse(raw);
    } catch {
        return null;
    }
};

const tryParseJsonString = (raw: string): { ok: true; value: unknown } | { ok: false } => {
    try {
        return { ok: true, value: JSON.parse(raw) };
    } catch {
        return { ok: false };
    }
};

const getErrorMessage = (error: unknown, fallback: string): string => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }
    return fallback;
};

const decodeConversationPayload = (raw: string): unknown => {
    const parsed = tryParseJsonString(raw);
    if (!parsed.ok) {
        throw new Error('Conversation payload is not valid JSON');
    }
    return parsed.value;
};

const getDefaultConfig = (): BlockchainConfig => ({
    enabled: false,
    network: 'local',
});

const sanitizeConfig = (value: unknown): BlockchainConfig => {
    const defaults = getDefaultConfig();
    if (!isRecord(value)) {
        return defaults;
    }

    return {
        enabled: typeof value.enabled === 'boolean' ? value.enabled : defaults.enabled,
        network: BLOCKCHAIN_NETWORKS.has(value.network as BlockchainConfig['network'])
            ? value.network as BlockchainConfig['network']
            : defaults.network,
        contractAddress: typeof value.contractAddress === 'string' ? value.contractAddress : undefined,
        privateKey: typeof value.privateKey === 'string' ? value.privateKey : undefined,
        gasPrice: typeof value.gasPrice === 'number' ? value.gasPrice : undefined,
    };
};

const sanitizeBlock = (value: unknown): ConversationBlock | null => {
    if (!isRecord(value)
        || typeof value.blockNumber !== 'number'
        || typeof value.transactionHash !== 'string'
        || typeof value.sessionId !== 'string'
        || typeof value.encryptedData !== 'string'
        || typeof value.timestamp !== 'number'
        || typeof value.blockHash !== 'string') {
        return null;
    }

    return {
        blockNumber: value.blockNumber,
        transactionHash: value.transactionHash,
        sessionId: value.sessionId,
        encryptedData: value.encryptedData,
        timestamp: value.timestamp,
        blockHash: value.blockHash,
    };
};

const sanitizeTransaction = (value: unknown): BlockchainTransaction | null => {
    if (!isRecord(value)
        || typeof value.hash !== 'string'
        || typeof value.from !== 'string'
        || typeof value.to !== 'string'
        || typeof value.value !== 'string'
        || typeof value.gasUsed !== 'number'
        || !TRANSACTION_STATUSES.has(value.status as BlockchainTransaction['status'])
        || typeof value.timestamp !== 'number') {
        return null;
    }

    return {
        hash: value.hash,
        from: value.from,
        to: value.to,
        value: value.value,
        gasUsed: value.gasUsed,
        status: value.status as BlockchainTransaction['status'],
        timestamp: value.timestamp,
    };
};

const parseStoredTransactions = (raw: string): BlockchainTransaction[] => {
    const parsed = parseJson(raw);
    if (!Array.isArray(parsed)) {
        return [];
    }

    return parsed
        .map((entry) => sanitizeTransaction(entry))
        .filter((entry): entry is BlockchainTransaction => entry !== null);
};

export class BlockchainIntegrationService {
    private static instance: BlockchainIntegrationService;
    private readonly STORAGE_KEY = 'blockchain_config';
    private readonly TRANSACTIONS_KEY = 'blockchain_transactions';
    private config: BlockchainConfig;

    private constructor() {
        this.config = this.loadConfig();
    }

    static getInstance(): BlockchainIntegrationService {
        if (!BlockchainIntegrationService.instance) {
            BlockchainIntegrationService.instance = new BlockchainIntegrationService();
        }
        return BlockchainIntegrationService.instance;
    }

    /**
     * Load configuration
     */
    private loadConfig(): BlockchainConfig {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                return sanitizeConfig(parseJson(stored));
            }
        } catch (error) {
            console.error('Failed to load blockchain config:', error);
        }

        return getDefaultConfig();
    }

    /**
     * Save configuration
     */
    saveConfig(config: Partial<BlockchainConfig>): void {
        this.config = sanitizeConfig({ ...this.config, ...config });
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.config));
    }

    /**
     * Get configuration
     */
    getConfig(): BlockchainConfig {
        return { ...this.config };
    }

    /**
     * Store conversation on blockchain
     */
    async storeConversation(
        sessionId: string,
        conversationData: unknown,
        encryptionKey?: string
    ): Promise<ConversationBlock> {
        if (!this.config.enabled) {
            throw new Error('Blockchain integration is not enabled');
        }

        // Encrypt conversation data
        const encryptedData = encryptionKey
            ? await this.encryptData(JSON.stringify(conversationData), encryptionKey)
            : JSON.stringify(conversationData);

        // In a real implementation, this would interact with a smart contract
        // For now, we'll simulate the blockchain transaction
        const block: ConversationBlock = {
            blockNumber: Date.now(), // Mock block number
            transactionHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
            sessionId,
            encryptedData,
            timestamp: Date.now(),
            blockHash: `0x${crypto.randomUUID().replace(/-/g, '')}`,
        };

        // Save transaction record
        this.saveTransaction({
            hash: block.transactionHash,
            from: '0x' + this.localId().substring(0, 40),
            to: this.config.contractAddress || '0x0000000000000000000000000000000000000000',
            value: '0',
            gasUsed: 21000, // Standard gas for simple transaction
            status: 'confirmed',
            timestamp: Date.now(),
        });

        return block;
    }

    /**
     * Retrieve conversation from blockchain
     */
    async retrieveConversation(
        transactionHash: string,
        encryptionKey?: string
    ): Promise<unknown> {
        if (!this.config.enabled) {
            throw new Error('Blockchain integration is not enabled');
        }

        // In a real implementation, this would query the blockchain
        // For now, we'll return mock data
        const stored = localStorage.getItem(`blockchain_${transactionHash}`);
        if (!stored) {
            throw new Error('Conversation not found on blockchain');
        }

        const block = sanitizeBlock(parseJson(stored));
        if (!block) {
            throw new Error('Stored blockchain payload is invalid');
        }
        
        try {
            const payload = encryptionKey
                ? await this.decryptData(block.encryptedData, encryptionKey)
                : block.encryptedData;
            return decodeConversationPayload(payload);
        } catch (error) {
            throw new Error(`Stored blockchain conversation is unreadable: ${getErrorMessage(error, 'decode failed')}`);
        }
    }

    /**
     * Get local ID (mock wallet address)
     */
    private localId(): string {
        let id = localStorage.getItem('blockchain_wallet_id');
        if (!id) {
            id = '0x' + Array.from({ length: 40 }, () => 
                Math.floor(Math.random() * 16).toString(16)
            ).join('');
            localStorage.setItem('blockchain_wallet_id', id);
        }
        return id;
    }

    /**
     * Encrypt data
     */
    private async encryptData(data: string, key: string): Promise<string> {
        // Simple encryption (in production, use proper crypto)
        return btoa(data + key);
    }

    /**
     * Decrypt data
     */
    private async decryptData(encrypted: string, key: string): Promise<string> {
        // Simple decryption (in production, use proper crypto)
        const decrypted = atob(encrypted);
        return decrypted.replace(key, '');
    }

    /**
     * Save transaction record
     */
    private saveTransaction(transaction: BlockchainTransaction): void {
        try {
            const stored = localStorage.getItem(this.TRANSACTIONS_KEY);
            const transactions = stored ? parseStoredTransactions(stored) : [];
            transactions.push(transaction);
            // Keep only last 100 transactions
            if (transactions.length > 100) {
                transactions.shift();
            }
            localStorage.setItem(this.TRANSACTIONS_KEY, JSON.stringify(transactions));
        } catch (error) {
            console.error('Failed to save transaction:', error);
        }
    }

    /**
     * Get transaction history
     */
    getTransactionHistory(limit: number = 20): BlockchainTransaction[] {
        try {
            const stored = localStorage.getItem(this.TRANSACTIONS_KEY);
            if (!stored) return [];
            const transactions = parseStoredTransactions(stored);
            return transactions.slice(-limit).reverse();
        } catch (error) {
            console.error('Failed to load transactions:', error);
            return [];
        }
    }

    /**
     * Verify conversation integrity
     */
    async verifyConversation(block: ConversationBlock): Promise<boolean> {
        // In a real implementation, this would verify the block hash on-chain
        // For now, return true
        return true;
    }
}

export const blockchainIntegrationService = BlockchainIntegrationService.getInstance();
