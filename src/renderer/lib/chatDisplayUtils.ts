import { TopLogprob } from '../../shared/types';

// Cache entropy calculations to avoid recomputing for repeated token views.
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
    } catch {
        entropyCache.set(cacheKey, 0);
        return 0;
    }
}

export async function compressImage(
    file: File,
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8
): Promise<{ base64: string; thumbnailUrl: string }> {
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
                } else if (height > maxHeight) {
                    width *= maxHeight / height;
                    height = maxHeight;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                const dataUrl = canvas.toDataURL('image/webp', quality);
                const base64 = dataUrl.split(',')[1];

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
            img.onerror = () => reject(new Error('Failed to load image for compression'));
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
    });
}
