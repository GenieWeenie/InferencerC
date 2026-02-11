import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { ChatMessage } from '../../shared/types';

interface UseChatWebFetchParams {
    appendMessage: (message: ChatMessage) => void;
    logComplianceEvent: (event: unknown) => void;
}

export const useChatWebFetch = ({
    appendMessage,
    logComplianceEvent,
}: UseChatWebFetchParams) => {
    const [isFetchingWeb, setIsFetchingWeb] = useState(false);
    const [showUrlInput, setShowUrlInput] = useState(false);
    const [urlInput, setUrlInput] = useState('');

    const executeWebFetch = useCallback(async () => {
        if (!urlInput) {
            setShowUrlInput(false);
            return;
        }

        const url = urlInput;
        setShowUrlInput(false);
        setUrlInput('');
        setIsFetchingWeb(true);

        try {
            const response = await fetch('http://localhost:3000/v1/tools/web-fetch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url }),
            });
            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            const content = `[CONTEXT FROM WEB: ${url}]\n\n${data.content}`;
            appendMessage({ role: 'user', content });
            toast.success('Web content added to conversation context.');
            logComplianceEvent({
                category: 'chat.tools',
                action: 'web_fetch.completed',
                result: 'success',
                details: { url },
                piiFields: ['url'],
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            toast.error(message);
            logComplianceEvent({
                category: 'chat.tools',
                action: 'web_fetch.failed',
                result: 'failure',
                details: { url, error: message },
                piiFields: ['url'],
            });
        } finally {
            setIsFetchingWeb(false);
        }
    }, [appendMessage, logComplianceEvent, urlInput]);

    return {
        isFetchingWeb,
        showUrlInput,
        setShowUrlInput,
        urlInput,
        setUrlInput,
        executeWebFetch,
    };
};
