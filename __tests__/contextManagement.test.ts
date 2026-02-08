import { ContextManagementService } from '../src/renderer/services/contextManagement';
import { ChatMessage } from '../src/shared/types';

const messages: ChatMessage[] = [
  { role: 'user', content: 'A short opening question.' },
  { role: 'assistant', content: 'A long detailed answer that contains architecture notes and implementation details. '.repeat(30) },
  { role: 'user', content: 'Another follow-up asking for tradeoffs and alternatives.' },
  { role: 'assistant', content: 'Response with code samples and additional explanations. '.repeat(25) },
  { role: 'user', content: 'Final prompt asking for summary.' },
];

describe('ContextManagementService', () => {
  test('computes context usage and warning threshold', () => {
    const usage = ContextManagementService.estimateUsage({
      messages,
      excludedIndices: new Set(),
      systemPrompt: 'You are a helpful assistant.',
      currentInput: 'What should we do next?',
      reservedOutputTokens: 600,
      maxContextTokens: 1000,
    });

    expect(usage.totalTokens).toBeGreaterThan(0);
    expect(usage.fillRatio).toBeGreaterThan(0);
    expect(usage.warning).toBe(true);
  });

  test('suggests older large messages for trimming', () => {
    const longThread: ChatMessage[] = new Array(14).fill(0).map((_, idx) => ({
      role: idx % 2 === 0 ? 'user' : 'assistant',
      content: idx < 9
        ? `Older verbose message ${idx}. ` + 'Detailed context '.repeat(80)
        : `Recent message ${idx}.`,
    } as ChatMessage));

    const usage = ContextManagementService.estimateUsage({
      messages: longThread,
      excludedIndices: new Set(),
      systemPrompt: '',
      currentInput: '',
      reservedOutputTokens: 700,
      maxContextTokens: 900,
    });

    const suggestions = ContextManagementService.suggestMessagesToTrim({
      messages: longThread,
      excludedIndices: new Set(),
      targetFillRatio: 0.75,
      usage,
    });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions[0].estimatedTokenSavings).toBeGreaterThan(20);
    expect(suggestions[0].messageIndex).toBeLessThan(longThread.length - 8);
  });

  test('builds auto-summary plan for older messages', () => {
    const plan = ContextManagementService.buildAutoSummaryPlan({
      messages: new Array(14).fill(0).map((_, idx) => ({
        role: idx % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${idx + 1} content with details and steps.`,
      } as ChatMessage)),
      excludedIndices: new Set([1]),
      keepRecentCount: 6,
    });

    expect(plan).not.toBeNull();
    expect(plan!.indicesToExclude.length).toBeGreaterThan(0);
    expect(plan!.summary).toContain('Summarized prior context');
  });
});
