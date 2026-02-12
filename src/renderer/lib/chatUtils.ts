import { TokenLogprob } from '../../shared/types';
export { calculateEntropy, compressImage } from './chatDisplayUtils';

export const simulateLogprobs = (text: string): TokenLogprob[] => {
    const words = text.split(/(\s+)/).filter(w => w.length > 0);
    return words.map(word => {
        const actualProb = 0.7 + (Math.random() * 0.29);
        const logprob = Math.log(actualProb);
        return {
            token: word,
            logprob: logprob,
            top_logprobs: [
                { token: word, logprob: logprob }
            ]
        };
    });
};

export type UserIntent = 'coding' | 'creative' | 'math' | 'general' | 'reasoning';

export function detectIntent(query: string): UserIntent {
    const q = query.toLowerCase();

    // Reasoning keywords
    if (/(solve|analyze|reason|think|step by step|logic|why|explain)/.test(q) && q.length > 20) return 'reasoning';

    if (/(code|function|bug|error|typescript|react|python|java|script|api|component|variable|class|interface|impl)/.test(q)) return 'coding';
    if (/(poem|story|write a|creative|imagine|scenario|script|lyrics|narrative|fantasy|fiction)/.test(q)) return 'creative';
    if (/(calculate|equation|math|algebra|geometry|formula|compute|integral|derivative)/.test(q)) return 'math';

    return 'general';
}

export function findBestModelForIntent(intent: UserIntent, availableModels: { id: string, name?: string }[]): string | null {
    if (!availableModels.length) return null;

    const find = (keywords: string[]) => availableModels.find(m => keywords.some(k => m.id.toLowerCase().includes(k) || (m.name && m.name.toLowerCase().includes(k))));

    switch (intent) {
        case 'coding':
            return find(['coder', 'deepseek-coder', 'code', 'sonnet', 'claude', 'qwen-coder'])?.id || null;
        case 'reasoning':
            return find(['r1', 'reasoning', 'think', 'deepseek'])?.id || null;
        case 'creative':
            return find(['gemini', 'gpt-4', 'claude', 'opus', 'mistral'])?.id || null;
        case 'math':
            return find(['math', 'deepseek', 'gpt-4', 'o1'])?.id || null;
        default:
            return null;
    }
}
