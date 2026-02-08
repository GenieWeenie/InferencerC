import { Message, TokenLogprob, ChatMessage, ChatSession, RecoveryState } from '../../shared/types';
import { encryptionService } from './encryption';
import { SearchIndexService } from './searchIndex';

export interface ExportedChatHistory {
  version: string;
  exportedAt: number;
  sessions: ChatSession[];
}

const STORAGE_KEY = 'app_chat_sessions';
const ACTIVE_SESSION_KEY = 'app_active_session_id';
const ENCRYPTED_SESSIONS_KEY = 'app_encrypted_sessions'; // Store encrypted session data separately
const SESSION_PASSWORDS_KEY = 'app_session_passwords'; // Store password hashes (for verification only)
const SESSION_DATA_PREFIX = 'app_session_';
const MESSAGE_CONTENT_PREFIX = 'app_message_content_'; // Store large message content separately
const CONTENT_CHUNK_THRESHOLD = 1024; // 1KB threshold for chunking
const RECOVERY_STATE_KEY = 'app_recovery_state';

/**
 * Calculate message size in bytes
 */
const getMessageSize = (message: ChatMessage): number => {
  try {
    const contentStr = typeof message.content === 'string'
      ? message.content
      : JSON.stringify(message.content);
    return new Blob([contentStr]).size;
  } catch (e) {
    return 0;
  }
};

/**
 * Check if message content should be stored separately
 */
const shouldChunkMessage = (message: ChatMessage): boolean => {
  return getMessageSize(message) > CONTENT_CHUNK_THRESHOLD;
};

/**
 * Store message content separately
 */
const storeMessageContent = (sessionId: string, messageIndex: number, content: string | any): void => {
  const key = `${MESSAGE_CONTENT_PREFIX}${sessionId}_${messageIndex}`;
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  localStorage.setItem(key, contentStr);
};

/**
 * Load message content from separate storage
 */
const loadMessageContent = (sessionId: string, messageIndex: number): string | any | null => {
  const key = `${MESSAGE_CONTENT_PREFIX}${sessionId}_${messageIndex}`;
  const content = localStorage.getItem(key);
  if (!content) return null;

  // Try to parse as JSON (for multimodal content), fallback to string
  try {
    return JSON.parse(content);
  } catch (e) {
    return content;
  }
};

/**
 * Delete all message content chunks for a session
 */
const deleteMessageContents = (sessionId: string): void => {
  const keysToDelete: string[] = [];

  // Find all keys matching this session's message content
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(`${MESSAGE_CONTENT_PREFIX}${sessionId}_`)) {
      keysToDelete.push(key);
    }
  }

  // Delete found keys
  keysToDelete.forEach(key => localStorage.removeItem(key));
};

// Migration helper (monolithic -> split)
const migrateStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    // Check if it's already migrated (naive check: if raw size is small vs number of sessions)
    // Better: parse and check structure
    const sessions = JSON.parse(raw);
    let migratedCount = 0;

    sessions.forEach((s: ChatSession) => {
      // If session exists in main list AND has messages, check if we need to migrate
      if (s.messages && s.messages.length > 0) {
        // Double check if individual key exists (to avoid overwriting if something is weird)
        const key = `${SESSION_DATA_PREFIX}${s.id}`;
        if (!localStorage.getItem(key)) {
          localStorage.setItem(key, JSON.stringify(s));
        }

        // Clear messages from metadata object
        s.messages = [];
        migratedCount++;
      }
    });

    if (migratedCount > 0) {
      console.log(`Migrated ${migratedCount} sessions to split storage`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }
  } catch (e) {
    console.error("Migration failed", e);
  }
};

// Migration helper (chunking large messages)
const migrateToChunkedStorage = () => {
  try {
    const metadataSessions = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');

    metadataSessions.forEach((meta: ChatSession) => {
      const sessionKey = `${SESSION_DATA_PREFIX}${meta.id}`;
      const rawSession = localStorage.getItem(sessionKey);

      if (!rawSession) return;

      const session: ChatSession = JSON.parse(rawSession);
      let needsMigration = false;

      // Check if any messages need chunking
      session.messages.forEach((msg, index) => {
        const chatMsg = msg as any;
        // Skip if already chunked
        if (chatMsg._contentChunked) return;

        // Check if message should be chunked
        if (shouldChunkMessage(chatMsg as ChatMessage)) {
          needsMigration = true;
        }
      });

      // Re-save session if migration needed (saveSession will handle chunking)
      if (needsMigration) {
        HistoryService.saveSession(session);
      }
    });
  } catch (e) {
    console.error("Chunking migration failed", e);
  }
};

// Run migrations on load
migrateStorage();
migrateToChunkedStorage();

export const HistoryService = {
  /**
   * Get all sessions metadata (active sessions, ordered by date)
   * Note: Returned sessions behave as metadata, messages array will be empty.
   */
  getAllSessions: (): ChatSession[] => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Failed to load history", e);
      return [];
    }
  },

  /**
   * Get full session data including messages
   */
  getSession: (id: string): ChatSession | undefined => {
    try {
      // 1. Try to load from specific key (Split Storage)
      const specificKey = `${SESSION_DATA_PREFIX}${id}`;
      const rawSpecific = localStorage.getItem(specificKey);

      let session: ChatSession | undefined;

      if (rawSpecific) {
        session = JSON.parse(rawSpecific);
      } else {
        // Fallback: Try loading from global list (if not migrated or error)
        const sessions = HistoryService.getAllSessions();
        session = sessions.find(s => s.id === id);
      }

      if (!session) return undefined;

      // If session is encrypted, return metadata only (messages will be decrypted on demand)
      if (session.encrypted) {
        return {
          ...session,
          messages: [], // Messages are stored encrypted separately
        };
      }

      // Load chunked message content
      const messagesWithContent = session.messages.map((msg, index) => {
        const chatMsg = msg as any;

        // Check if message has chunked content
        if (chatMsg._contentChunked) {
          // Load content from separate storage
          const content = loadMessageContent(id, index);
          if (content !== null) {
            // Remove the chunked marker and restore content
            const { _contentChunked, ...msgWithoutMarker } = chatMsg;
            return {
              ...msgWithoutMarker,
              content
            } as ChatMessage;
          }
        }

        return chatMsg as ChatMessage;
      });

      return {
        ...session,
        messages: messagesWithContent
      };
    } catch (e) {
      console.error(`Failed to get session ${id}`, e);
      return undefined;
    }
  },

  /**
   * Decrypt an encrypted session with password
   */
  decryptSession: async (id: string, password: string): Promise<ChatSession | null> => {
    try {
      // Verify password hash
      const passwordHashes = JSON.parse(localStorage.getItem(SESSION_PASSWORDS_KEY) || '{}');
      const storedHash = passwordHashes[id];

      if (!storedHash) {
        return null; // Session not encrypted or password not set
      }

      // Simple password verification
      const passwordHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      const passwordHashStr = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (passwordHashStr !== storedHash) {
        return null; // Wrong password
      }

      // Decrypt session data
      const encryptedData = localStorage.getItem(`${ENCRYPTED_SESSIONS_KEY}_${id}`);
      if (!encryptedData) {
        return null;
      }

      const session = HistoryService.getSession(id);
      if (!session) return null;

      const decryptedJson = await encryptionService.decrypt(encryptedData);
      const decryptedMessages = JSON.parse(decryptedJson) as ChatMessage[];

      return {
        ...session,
        messages: decryptedMessages,
        encrypted: false, // Decrypted for the current runtime session
      };
    } catch (error) {
      console.error('Failed to decrypt session:', error);
      return null;
    }
  },

  /**
   * Encrypt a session with password
   */
  encryptSession: async (id: string, password: string): Promise<boolean> => {
    try {
      if (!encryptionService.isAvailable()) {
        return false;
      }

      const session = HistoryService.getSession(id);
      if (!session) return false;

      // Hash password for verification
      const passwordHash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
      const passwordHashStr = Array.from(new Uint8Array(passwordHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      // Store password hash
      const passwordHashes = JSON.parse(localStorage.getItem(SESSION_PASSWORDS_KEY) || '{}');
      passwordHashes[id] = passwordHashStr;
      localStorage.setItem(SESSION_PASSWORDS_KEY, JSON.stringify(passwordHashes));

      // Encrypt messages
      const messagesJson = JSON.stringify(session.messages);
      const encryptedMessages = await encryptionService.encrypt(messagesJson);

      // Store encrypted messages separately
      localStorage.setItem(`${ENCRYPTED_SESSIONS_KEY}_${id}`, encryptedMessages);

      // Update session metadata
      session.encrypted = true;
      session.encryptedHash = passwordHashStr;

      // Save session (this will clear messages from metadata automatically)
      HistoryService.saveSession({
        ...session,
        messages: [] // Ensure messages are cleared
      });

      return true;
    } catch (error) {
      console.error('Failed to encrypt session:', error);
      return false;
    }
  },

  /**
   * Save session state (updates both split storage and metadata list)
   */
  saveSession: (session: ChatSession) => {
    // Process messages for chunking (store large content separately)
    const processedMessages = session.messages.map((msg, index) => {
      const chatMsg = msg as ChatMessage;

      // Check if message should be chunked
      if (shouldChunkMessage(chatMsg)) {
        // Store content separately
        storeMessageContent(session.id, index, chatMsg.content);

        // Return message with marker indicating content is chunked
        return {
          ...chatMsg,
          content: '', // Clear content to save space
          _contentChunked: true // Marker for lazy loading
        } as any;
      }

      return chatMsg;
    });

    // Create session with processed messages
    const processedSession = { ...session, messages: processedMessages };

    // 1. Save full session to specific key
    const uniqueKey = `${SESSION_DATA_PREFIX}${session.id}`;
    localStorage.setItem(uniqueKey, JSON.stringify(processedSession));

    // 2. Update metadata in main list
    const sessions = HistoryService.getAllSessions();
    const idx = sessions.findIndex(s => s.id === session.id);

    // Create metadata object (copy session but remove heavy messages)
    const metadata = { ...processedSession, messages: [] };

    // Update or Insert
    if (idx >= 0) {
      sessions[idx] = { ...metadata, lastModified: Date.now() };
    } else {
      sessions.unshift({ ...metadata, lastModified: Date.now() });
    }

    // Auto-generate title logic (using original session data)
    const currentSessionMetadata = idx >= 0 ? sessions[idx] : sessions[0];
    if (currentSessionMetadata.title === 'New Chat' && session.messages.length > 0) {
      const firstUserMsg = session.messages.find(m => m.role === 'user');
      if (firstUserMsg) {
        const content = typeof firstUserMsg.content === 'string' ? firstUserMsg.content : '';
        currentSessionMetadata.title = content.substring(0, 30) + (content.length > 30 ? '...' : '');
      }
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

      // Index the full session content (use original session with full content)
      SearchIndexService.indexSession(session);
    } catch (e) {
      console.error("Failed to save session index", e);
    }
  },

  deleteSession: (id: string) => {
    // 1. Remove from main list
    let sessions = HistoryService.getAllSessions();
    sessions = sessions.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));

    // 2. Remove specific data
    localStorage.removeItem(`${SESSION_DATA_PREFIX}${id}`);

    // 3. Remove encrypted data if exists
    localStorage.removeItem(`${ENCRYPTED_SESSIONS_KEY}_${id}`);

    // 4. Remove password hash
    const passwordHashes = JSON.parse(localStorage.getItem(SESSION_PASSWORDS_KEY) || '{}');
    if (passwordHashes[id]) {
      delete passwordHashes[id];
      localStorage.setItem(SESSION_PASSWORDS_KEY, JSON.stringify(passwordHashes));
    }

    // 5. Remove chunked message content
    deleteMessageContents(id);

    // 6. Remove from search index
    SearchIndexService.removeSession(id);
  },

  /**
   * Exports all chat sessions to a downloadable JSON file
   */
  exportHistory: (): void => {
    // We need to load FULL sessions for export, not just metadata
    const metadataSessions = HistoryService.getAllSessions();
    const fullSessions = metadataSessions.map(meta => {
      const full = HistoryService.getSession(meta.id);
      return full || meta;
    });

    const exportData: ExportedChatHistory = {
      version: '1.0',
      exportedAt: Date.now(),
      sessions: fullSessions
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);

    const exportFileDefaultName = `chat-history-export-${new Date().toISOString().slice(0, 10)}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  },

  /**
   * Exports a single chat session as Obsidian-compatible markdown
   */
  exportToObsidian: (sessionId: string): string | null => {
    const session = HistoryService.getSession(sessionId);
    if (!session) return null;

    const date = new Date(session.lastModified);
    const dateStr = date.toISOString().split('T')[0];
    const timeStr = date.toTimeString().split(' ')[0];

    // Obsidian frontmatter
    let markdown = `---\n`;
    markdown += `title: "${session.title.replace(/"/g, '\\"')}"\n`;
    markdown += `created: ${dateStr} ${timeStr}\n`;
    markdown += `model: ${session.modelId || 'unknown'}\n`;
    if (session.systemPrompt) {
      markdown += `system_prompt: "${session.systemPrompt.replace(/"/g, '\\"').replace(/\n/g, ' ')}"\n`;
    }
    if (session.temperature !== undefined) markdown += `temperature: ${session.temperature}\n`;
    if (session.topP !== undefined) markdown += `top_p: ${session.topP}\n`;
    if (session.maxTokens !== undefined) markdown += `max_tokens: ${session.maxTokens}\n`;
    markdown += `tags: [chat, ${session.modelId?.split('/').pop() || 'ai'}]\n`;
    markdown += `---\n\n`;

    // Conversation content
    markdown += `# ${session.title}\n\n`;
    markdown += `**Model:** ${session.modelId || 'Unknown'}\n`;
    markdown += `**Date:** ${date.toLocaleString()}\n\n`;
    markdown += `---\n\n`;

    // Messages
    session.messages.forEach((msg, index) => {
      const role = msg.role === 'user' ? '👤 User' : '🤖 Assistant';
      markdown += `## ${role} (Message ${index + 1})\n\n`;

      // Handle multimodal content
      if (Array.isArray(msg.content)) {
        msg.content.forEach((part: any) => {
          if (part.type === 'text') {
            markdown += `${part.text}\n\n`;
          } else if (part.type === 'image_url') {
            markdown += `![Image](${part.image_url.url})\n\n`;
          }
        });
      } else {
        markdown += `${msg.content}\n\n`;
      }

      markdown += `---\n\n`;
    });

    return markdown;
  },

  /**
   * Exports a session to Obsidian markdown file
   */
  exportSessionToObsidian: (sessionId: string): void => {
    const markdown = HistoryService.exportToObsidian(sessionId);
    if (!markdown) {
      throw new Error('Session not found');
    }

    const session = HistoryService.getSession(sessionId);
    const safeTitle = (session?.title || 'chat').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const filename = `${safeTitle}-${new Date().toISOString().slice(0, 10)}.md`;

    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  },

  /**
   * Imports chat sessions from a JSON file
   */
  importHistory: (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const importedData: ExportedChatHistory = JSON.parse(content);

          // Validate the imported data
          if (!importedData.version || !importedData.sessions) {
            throw new Error('Invalid export file format');
          }

          // Save Imported Sessions (Split Strategy)
          importedData.sessions.forEach(session => {
            HistoryService.saveSession(session);
          });

          resolve();
        } catch (error) {
          console.error('Error importing chat history:', error);
          reject(error);
        }
      };

      reader.onerror = () => {
        reject(new Error('Error reading file'));
      };

      reader.readAsText(file);
    });
  },

  getLastActiveSessionId: (): string | null => {
    return localStorage.getItem(ACTIVE_SESSION_KEY);
  },

  setLastActiveSessionId: (id: string) => {
    localStorage.setItem(ACTIVE_SESSION_KEY, id);
  },

  createNewSession: (modelId: string): ChatSession => {
    return {
      id: crypto.randomUUID(),
      title: 'New Chat',
      lastModified: Date.now(),
      modelId,
      messages: []
    };
  },

  renameSession: (id: string, newTitle: string) => {
    // Update main list metadata
    const sessions = HistoryService.getAllSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
      sessions[idx].title = newTitle;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }

    // Update individual session file
    const session = HistoryService.getSession(id);
    if (session) {
      session.title = newTitle;
      const uniqueKey = `${SESSION_DATA_PREFIX}${id}`;
      localStorage.setItem(uniqueKey, JSON.stringify(session));
    }
  },

  togglePinSession: (id: string) => {
    // Update main list metadata
    const sessions = HistoryService.getAllSessions();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx >= 0) {
      sessions[idx].pinned = !sessions[idx].pinned;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    }

    // Update individual session file
    const session = HistoryService.getSession(id);
    if (session) {
      session.pinned = !session.pinned;
      const uniqueKey = `${SESSION_DATA_PREFIX}${id}`;
      localStorage.setItem(uniqueKey, JSON.stringify(session));
    }
  },

  /**
   * Save recovery state for crash recovery
   */
  saveRecoveryState: (state: RecoveryState) => {
    try {
      localStorage.setItem(RECOVERY_STATE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error("Failed to save recovery state", e);
    }
  },

  /**
   * Get recovery state from storage
   */
  getRecoveryState: (): RecoveryState | null => {
    try {
      const raw = localStorage.getItem(RECOVERY_STATE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.error("Failed to load recovery state", e);
      return null;
    }
  },

  /**
   * Clear recovery state from storage
   */
  clearRecoveryState: () => {
    try {
      localStorage.removeItem(RECOVERY_STATE_KEY);
    } catch (e) {
      console.error("Failed to clear recovery state", e);
    }
  }
};
