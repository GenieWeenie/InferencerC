import type { TokenLogprob } from '../../shared/types';

export interface SelectedTokenContext {
    logprob: TokenLogprob;
    messageIndex: number;
    tokenIndex: number;
}
