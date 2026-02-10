import {
  buildLazyLoadRequestKey,
  getLazyLoadDecision,
  getMessageRenderMode,
  hasSyntaxSentinel,
  isLikelyTruncatedContent,
} from '../src/renderer/lib/messageContentSyntax';

describe('messageContentSyntax', () => {
  it('prefers plain mode while streaming even when syntax exists', () => {
    const mode = getMessageRenderMode('```ts\nconst x = 1;\n```', true);
    expect(mode).toBe('plain');
  });

  it('uses plain mode when syntax sentinels are absent', () => {
    expect(hasSyntaxSentinel('hello world')).toBe(false);
    expect(getMessageRenderMode('hello world', false)).toBe('plain');
  });

  it('detects rich mode for code/math syntax', () => {
    expect(getMessageRenderMode('```js\nconsole.log(1)\n```', false)).toBe('rich');
    expect(getMessageRenderMode('Here is math: $x^2 + y^2$', false)).toBe('rich');
  });

  it('detects markdown mode when markdown syntax is present', () => {
    expect(getMessageRenderMode('# Title\n\nBody', false)).toBe('markdown');
    expect(getMessageRenderMode('Use **bold** text', false)).toBe('markdown');
  });

  it('classifies truncated content markers', () => {
    expect(isLikelyTruncatedContent('abc...')).toBe(true);
    expect(isLikelyTruncatedContent('a'.repeat(110) + '...')).toBe(false);
    expect(isLikelyTruncatedContent('complete message')).toBe(false);
  });

  it('builds deterministic lazy-load request keys', () => {
    expect(buildLazyLoadRequestKey(5, true, false)).toBe('5:lazy:full');
    expect(buildLazyLoadRequestKey(5, false, true)).toBe('5:normal:truncated');
  });

  it('dispatches lazy-load once and dedupes repeated requests', () => {
    const first = getLazyLoadDecision({
      content: 'short...',
      isLazyLoaded: true,
      messageIndex: 8,
      hasOnLoadContent: true,
      isLoadingContent: false,
      lastRequestKey: null,
    });
    expect(first.shouldDispatch).toBe(true);
    expect(first.nextRequestKey).toBe('8:lazy:truncated');

    const second = getLazyLoadDecision({
      content: 'short...',
      isLazyLoaded: true,
      messageIndex: 8,
      hasOnLoadContent: true,
      isLoadingContent: false,
      lastRequestKey: first.nextRequestKey,
    });
    expect(second.shouldDispatch).toBe(false);
    expect(second.nextRequestKey).toBe(first.nextRequestKey);
  });

  it('does not dispatch when callback is missing or load is already in progress', () => {
    const missingCallback = getLazyLoadDecision({
      content: 'short...',
      isLazyLoaded: true,
      messageIndex: 1,
      hasOnLoadContent: false,
      isLoadingContent: false,
      lastRequestKey: null,
    });
    expect(missingCallback.shouldDispatch).toBe(false);

    const loading = getLazyLoadDecision({
      content: 'short...',
      isLazyLoaded: true,
      messageIndex: 1,
      hasOnLoadContent: true,
      isLoadingContent: true,
      lastRequestKey: null,
    });
    expect(loading.shouldDispatch).toBe(false);
  });
});
