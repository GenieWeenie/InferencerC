export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized?: boolean;
  isFullscreen?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
};

const parseJson = (raw: string): unknown | null => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const parseFiniteNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
};

const parseOptionalFiniteNumber = (value: unknown): number | undefined => {
  const parsed = parseFiniteNumber(value);
  return parsed === null ? undefined : parsed;
};

export const parseWindowState = (raw: string): WindowState | null => {
  const parsed = parseJson(raw);
  if (!isRecord(parsed)) {
    return null;
  }

  const width = parseFiniteNumber(parsed.width);
  const height = parseFiniteNumber(parsed.height);
  if (width === null || height === null) {
    return null;
  }

  return {
    x: parseOptionalFiniteNumber(parsed.x),
    y: parseOptionalFiniteNumber(parsed.y),
    width,
    height,
    isMaximized: typeof parsed.isMaximized === 'boolean' ? parsed.isMaximized : undefined,
    isFullscreen: typeof parsed.isFullscreen === 'boolean' ? parsed.isFullscreen : undefined,
  };
};
