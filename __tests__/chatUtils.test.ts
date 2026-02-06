import { calculateEntropy, simulateLogprobs } from '../src/renderer/lib/chatUtils';

describe('chatUtils', () => {
    describe('calculateEntropy', () => {
        it('should return 0 for empty logprobs', () => {
            expect(calculateEntropy([])).toBe(0);
        });

        it('should calculate entropy correctly for sure event', () => {
            // P(x) = 1 -> log(1)=0 -> entropy=0
            const logprobs = [{ token: 'a', logprob: 0 }]; // e^0 = 1
            expect(calculateEntropy(logprobs)).toBeCloseTo(0);
        });

        it('should calculate entropy for uniform distribution (coin flip)', () => {
            // P(a)=0.5, P(b)=0.5. log(0.5) approx -0.693
            const logprobs = [
                { token: 'a', logprob: Math.log(0.5) },
                { token: 'b', logprob: Math.log(0.5) }
            ];
            // Entropy should be - (0.5 * log(0.5) + 0.5 * log(0.5)) = -log(0.5) = 0.693
            expect(calculateEntropy(logprobs)).toBeCloseTo(0.693, 2);
        });
    });

    describe('simulateLogprobs', () => {
        it('should split text into tokens', () => {
            const text = "Hello world";
            const result = simulateLogprobs(text);
            expect(result).toHaveLength(3); // "Hello", " ", "world"
            expect(result[0].token).toBe("Hello");
            expect(result[1].token).toBe(" ");
            expect(result[2].token).toBe("world");
        });

        it('should generate valid probability values', () => {
            const text = "test";
            const result = simulateLogprobs(text);
            const lp = result[0];

            // logprob should be roughly log(0.7) to log(0.99)
            // log(0.7) = -0.35, log(0.99) = -0.01
            expect(lp.logprob).toBeLessThan(0);
            expect(lp.logprob).toBeGreaterThan(-0.4);

            expect(lp.top_logprobs).toBeDefined();
            expect(lp.top_logprobs!).toHaveLength(3);
            expect(lp.top_logprobs![0].token).toBe("test");
        });
    });
});
