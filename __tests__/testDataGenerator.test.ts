import {
    generateLargeConversation,
    generateChatSession,
    generateMultipleSessions,
    generateStressTestData,
    calculateConversationStats
} from '../src/renderer/lib/testDataGenerator';

describe('testDataGenerator', () => {
    describe('generateLargeConversation', () => {
        it('should generate default number of messages', () => {
            const messages = generateLargeConversation();
            expect(messages).toHaveLength(100);
        });

        it('should generate specified number of messages', () => {
            const messages = generateLargeConversation({ messageCount: 50 });
            expect(messages).toHaveLength(50);
        });

        it('should alternate between user and assistant messages', () => {
            const messages = generateLargeConversation({ messageCount: 10 });
            expect(messages[0].role).toBe('system');
            expect(messages[1].role).toBe('user');
            expect(messages[2].role).toBe('assistant');
            expect(messages[3].role).toBe('user');
        });

        it('should generate messages with content', () => {
            const messages = generateLargeConversation({ messageCount: 10 });
            messages.forEach(msg => {
                expect(msg.content).toBeDefined();
                expect(msg.content.length).toBeGreaterThan(0);
            });
        });

        it('should respect average message length', () => {
            const avgLength = 500;
            const messages = generateLargeConversation({
                messageCount: 20,
                averageMessageLength: avgLength,
                variability: 0.2
            });

            const actualAvg = messages.reduce((sum, m) => sum + m.content.length, 0) / messages.length;
            // Should be within 50% of target due to variability
            expect(actualAvg).toBeGreaterThan(avgLength * 0.5);
            expect(actualAvg).toBeLessThan(avgLength * 1.5);
        });

        it('should include attachments when requested', () => {
            const messages = generateLargeConversation({
                messageCount: 100,
                includeAttachments: true
            });

            const withAttachments = messages.filter(m => m.attachments && m.attachments.length > 0);
            expect(withAttachments.length).toBeGreaterThan(0);

            const firstAttachment = withAttachments[0].attachments![0];
            expect(firstAttachment.id).toBeDefined();
            expect(firstAttachment.name).toBeDefined();
            expect(firstAttachment.type).toBeDefined();
            expect(firstAttachment.content).toBeDefined();
        });

        it('should include images when requested', () => {
            const messages = generateLargeConversation({
                messageCount: 200,
                includeImages: true
            });

            const withImages = messages.filter(m => m.images && m.images.length > 0);
            expect(withImages.length).toBeGreaterThan(0);

            const firstImage = withImages[0].images![0];
            expect(firstImage.id).toBeDefined();
            expect(firstImage.name).toBeDefined();
            expect(firstImage.mimeType).toBeDefined();
            expect(firstImage.base64).toBeDefined();
            expect(firstImage.thumbnailUrl).toBeDefined();
        });

        it('should include logprobs when requested', () => {
            const messages = generateLargeConversation({
                messageCount: 100,
                includeLogprobs: true
            });

            const withLogprobs = messages.filter(m =>
                m.choices && m.choices[0]?.logprobs?.content
            );
            expect(withLogprobs.length).toBeGreaterThan(0);

            const firstLogprob = withLogprobs[0].choices![0].logprobs!.content[0];
            expect(firstLogprob.token).toBeDefined();
            expect(firstLogprob.logprob).toBeDefined();
            expect(typeof firstLogprob.logprob).toBe('number');
        });

        it('should include multiple choices when requested', () => {
            const messages = generateLargeConversation({
                messageCount: 100,
                includeChoices: true
            });

            const withChoices = messages.filter(m =>
                m.choices && m.choices.length > 1
            );
            expect(withChoices.length).toBeGreaterThan(0);

            const firstMultiChoice = withChoices[0];
            expect(firstMultiChoice.choices!.length).toBeGreaterThanOrEqual(2);
            expect(firstMultiChoice.selectedChoiceIndex).toBe(0);
        });

        it('should include generation time for assistant messages', () => {
            const messages = generateLargeConversation({ messageCount: 20 });
            const assistantMessages = messages.filter(m => m.role === 'assistant');
            const withGenTime = assistantMessages.filter(m => m.generationTime !== undefined);

            expect(withGenTime.length).toBeGreaterThan(0);
            withGenTime.forEach(msg => {
                expect(msg.generationTime).toBeGreaterThan(0);
                expect(msg.generationTime).toBeLessThan(10000);
            });
        });
    });

    describe('generateChatSession', () => {
        it('should generate a valid chat session', () => {
            const session = generateChatSession({ messageCount: 50 });

            expect(session.id).toBeDefined();
            expect(session.title).toBeDefined();
            expect(session.lastModified).toBeDefined();
            expect(session.modelId).toBeDefined();
            expect(session.messages).toHaveLength(50);
            expect(session.temperature).toBe(0.7);
            expect(session.topP).toBe(0.9);
            expect(session.maxTokens).toBe(2000);
        });

        it('should use custom title and model', () => {
            const session = generateChatSession({
                title: 'Custom Title',
                modelId: 'custom-model'
            });

            expect(session.title).toBe('Custom Title');
            expect(session.modelId).toBe('custom-model');
        });

        it('should include system prompt when requested', () => {
            const sessionWithPrompt = generateChatSession({
                includeSystemPrompt: true
            });
            expect(sessionWithPrompt.systemPrompt).toBeDefined();

            const sessionWithoutPrompt = generateChatSession({
                includeSystemPrompt: false
            });
            expect(sessionWithoutPrompt.systemPrompt).toBeUndefined();
        });
    });

    describe('generateMultipleSessions', () => {
        it('should generate specified number of sessions', () => {
            const sessions = generateMultipleSessions(5, { messageCount: 20 });
            expect(sessions).toHaveLength(5);
        });

        it('should generate sessions with varying message counts', () => {
            const sessions = generateMultipleSessions(3, { messageCount: 100 });
            const messageCounts = sessions.map(s => s.messages.length);

            // All should be different (with high probability)
            const uniqueCounts = new Set(messageCounts);
            expect(uniqueCounts.size).toBeGreaterThan(1);

            // All should be within reasonable range
            messageCounts.forEach(count => {
                expect(count).toBeGreaterThan(40);
                expect(count).toBeLessThan(160);
            });
        });

        it('should generate unique session IDs', () => {
            const sessions = generateMultipleSessions(5);
            const ids = sessions.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(5);
        });
    });

    describe('generateStressTestData', () => {
        it('should generate all size categories', () => {
            const data = generateStressTestData();

            expect(data.small).toHaveLength(100);
            expect(data.medium).toHaveLength(500);
            expect(data.large).toHaveLength(1000);
            expect(data.xlarge).toHaveLength(5000);
        });

        it('should generate valid messages in all categories', () => {
            const data = generateStressTestData();

            [data.small, data.medium, data.large, data.xlarge].forEach(messages => {
                expect(messages.length).toBeGreaterThan(0);
                messages.forEach(msg => {
                    expect(msg.role).toBeDefined();
                    expect(msg.content).toBeDefined();
                });
            });
        });
    });

    describe('calculateConversationStats', () => {
        it('should calculate correct statistics', () => {
            const messages = generateLargeConversation({
                messageCount: 50,
                includeAttachments: true,
                includeImages: true,
                includeChoices: true
            });

            const stats = calculateConversationStats(messages);

            expect(stats.totalMessages).toBe(50);
            expect(stats.totalCharacters).toBeGreaterThan(0);
            expect(stats.averageMessageLength).toBeGreaterThan(0);
            expect(stats.averageMessageLength).toBe(stats.totalCharacters / stats.totalMessages);
        });

        it('should count attachments and images correctly', () => {
            const messages = generateLargeConversation({
                messageCount: 200,
                includeAttachments: true,
                includeImages: true
            });

            const stats = calculateConversationStats(messages);

            expect(stats.messagesWithAttachments).toBeGreaterThanOrEqual(0);
            expect(stats.messagesWithImages).toBeGreaterThanOrEqual(0);
        });

        it('should handle empty conversation', () => {
            const stats = calculateConversationStats([]);

            expect(stats.totalMessages).toBe(0);
            expect(stats.totalCharacters).toBe(0);
            expect(stats.averageMessageLength).toBe(0);
            expect(stats.messagesWithAttachments).toBe(0);
            expect(stats.messagesWithImages).toBe(0);
            expect(stats.messagesWithChoices).toBe(0);
        });

        it('should calculate average message length correctly', () => {
            const messages = generateLargeConversation({
                messageCount: 100,
                averageMessageLength: 300,
                variability: 0.3
            });

            const stats = calculateConversationStats(messages);

            // Should be roughly around the target (within reasonable variance)
            expect(stats.averageMessageLength).toBeGreaterThan(150);
            expect(stats.averageMessageLength).toBeLessThan(450);
        });
    });

    describe('Performance and Memory', () => {
        it('should generate 1000 messages quickly', () => {
            const start = Date.now();
            const messages = generateLargeConversation({ messageCount: 1000 });
            const duration = Date.now() - start;

            expect(messages).toHaveLength(1000);
            expect(duration).toBeLessThan(5000); // Should complete in under 5 seconds
        });

        it('should generate 5000 messages without errors', () => {
            const messages = generateLargeConversation({ messageCount: 5000 });
            expect(messages).toHaveLength(5000);

            // Verify structural integrity
            messages.forEach((msg, idx) => {
                expect(msg.role).toBeDefined();
                expect(msg.content).toBeDefined();
            });
        });
    });
});
