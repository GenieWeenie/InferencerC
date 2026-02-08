import { ragDocumentChatService } from '../src/renderer/services/ragDocumentChat';

describe('RagDocumentChatService', () => {
  beforeEach(() => {
    ragDocumentChatService.clearDocuments();
  });

  test('ingests text and creates citation-aware search results', () => {
    ragDocumentChatService.ingestTextDocument({
      name: 'architecture.md',
      strategy: 'semantic',
      text: [
        '# Intro',
        'This is the first section.',
        '',
        '## API',
        'The request router handles model dispatch.',
        '\f',
        '## Reliability',
        'Crash recovery persists every 30 seconds.',
      ].join('\n'),
    });

    const results = ragDocumentChatService.search('crash recovery', { topK: 3 });
    expect(results.length).toBeGreaterThan(0);

    const top = results[0];
    expect(top.citation.documentName).toBe('architecture.md');
    expect(top.citation.lineStart).toBeGreaterThan(0);
    expect(top.citation.lineEnd).toBeGreaterThanOrEqual(top.citation.lineStart);
    expect(top.citation.page).toBeGreaterThanOrEqual(1);
  });

  test('returns an answer with explicit source citations', () => {
    ragDocumentChatService.ingestTextDocument({
      name: 'guidelines.txt',
      strategy: 'paragraph',
      text: [
        'Use semantic chunking for docs with headings.',
        '',
        'Use fixed-size chunking for unstructured logs.',
      ].join('\n'),
    });

    const answer = ragDocumentChatService.answerQuestion('Which chunking strategy works for headings?');
    expect(answer.resultsUsed).toBeGreaterThan(0);
    expect(answer.answer).toContain('Sources:');
    expect(answer.citations.length).toBeGreaterThan(0);
    expect(answer.citations[0].lineStart).toBeGreaterThan(0);
  });

  test('reuses embedding cache for repeat queries', () => {
    ragDocumentChatService.ingestTextDocument({
      name: 'cache-check.txt',
      strategy: 'fixed-size',
      text: 'Embedding cache should avoid duplicate vector work for repeated retrieval queries.',
    });

    const before = ragDocumentChatService.getEmbeddingCacheStats();
    ragDocumentChatService.search('repeated retrieval queries');
    ragDocumentChatService.search('repeated retrieval queries');
    const after = ragDocumentChatService.getEmbeddingCacheStats();

    expect(after.entries).toBeGreaterThanOrEqual(before.entries);
    expect(after.hits).toBeGreaterThan(before.hits);
  });
});
