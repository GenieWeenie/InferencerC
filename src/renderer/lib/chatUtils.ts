import { TokenLogprob, TopLogprob } from '../../shared/types';

// Cache for entropy calculations to improve performance
const entropyCache = new Map<string, number>();

export function calculateEntropy(topLogprobs: TopLogprob[] | undefined): number {
    if (!topLogprobs || !Array.isArray(topLogprobs) || topLogprobs.length === 0) return 0;
    const cacheKey = JSON.stringify(topLogprobs);
    const cachedResult = entropyCache.get(cacheKey);
    if (cachedResult !== undefined) {
        return cachedResult;
    }
    try {
        let entropy = 0;
        const probs: number[] = [];
        topLogprobs.forEach(lp => {
            if (typeof lp.logprob === 'number') probs.push(Math.exp(lp.logprob));
        });
        const sum = probs.reduce((a, b) => a + b, 0);
        if (sum === 0) {
            entropyCache.set(cacheKey, 0);
            return 0;
        }
        probs.forEach(p => {
            const normalizedP = p / sum;
            if (normalizedP > 0) entropy -= normalizedP * Math.log(normalizedP);
        });
        const result = isNaN(entropy) ? 0 : entropy;
        entropyCache.set(cacheKey, result);
        return result;
    } catch (e) {
        entropyCache.set(cacheKey, 0);
        return 0;
    }
}

export const simulateLogprobs = (text: string): TokenLogprob[] => {
    const words = text.split(/(\s+)/).filter(w => w.length > 0);
    return words.map(word => {
        const actualProb = 0.7 + (Math.random() * 0.29);
        const logprob = Math.log(actualProb);
        return {
            token: word,
            logprob: logprob,
            top_logprobs: [
                { token: word, logprob: logprob },
                { token: "alt1", logprob: Math.log(0.1) },
                { token: "alt2", logprob: Math.log(0.05) }
            ]
        };
    });
};
export async function compressImage(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.8): Promise<{ base64: string, thumbnailUrl: string }> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/webp', quality);
                const base64 = dataUrl.split(',')[1];

                // Create thumbnail
                const thumbCanvas = document.createElement('canvas');
                const thumbWidth = 200;
                const thumbHeight = (img.height / img.width) * thumbWidth;
                thumbCanvas.width = thumbWidth;
                thumbCanvas.height = Math.min(thumbHeight, 200);
                const thumbCtx = thumbCanvas.getContext('2d');
                thumbCtx?.drawImage(img, 0, 0, thumbCanvas.width, thumbCanvas.height);
                const thumbnailUrl = thumbCanvas.toDataURL('image/webp', quality);

                resolve({ base64, thumbnailUrl });
            };
            img.onerror = (e) => reject(new Error("Failed to load image for compression"));
        };
        reader.onerror = (e) => reject(new Error("Failed to read file"));
    });
}

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
