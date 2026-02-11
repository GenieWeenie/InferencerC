import type { ComponentType } from 'react';

export interface ChatVirtuosoHandle {
    scrollToIndex: (options: {
        index: number;
        align?: 'start' | 'center' | 'end';
        behavior?: ScrollBehavior;
    }) => void;
    getScrollerElement?: () => Element | null;
}

export type ChatVirtuosoComponent = ComponentType<Record<string, unknown>>;
