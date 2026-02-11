import { RecoveryState } from '../../shared/types';

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null
);

const isFiniteNumber = (value: unknown): value is number => (
  typeof value === 'number' && Number.isFinite(value)
);

export const sanitizeRecoveryState = (value: unknown): RecoveryState | null => {
  if (!isRecord(value) || typeof value.sessionId !== 'string' || !isFiniteNumber(value.timestamp)) {
    return null;
  }

  const sessionId = value.sessionId.trim();
  if (!sessionId) {
    return null;
  }

  return {
    sessionId,
    timestamp: Math.max(0, Math.floor(value.timestamp)),
    draftMessage: typeof value.draftMessage === 'string' && value.draftMessage.length > 0
      ? value.draftMessage
      : undefined,
    pendingResponse: typeof value.pendingResponse === 'boolean'
      ? value.pendingResponse
      : undefined,
  };
};

export const parseRecoveryStateFromRaw = (raw: string | null): RecoveryState | null => {
  if (!raw) {
    return null;
  }
  try {
    return sanitizeRecoveryState(JSON.parse(raw));
  } catch {
    return null;
  }
};

