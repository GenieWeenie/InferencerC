import { useCallback, useState } from 'react';

export interface TextAttachmentInput {
    name: string;
    content: string;
}

export interface TextAttachment extends TextAttachmentInput {
    id: string;
}

export interface ImageAttachmentInput {
    name: string;
    mimeType: string;
    base64: string;
    thumbnailUrl: string;
}

export interface ImageAttachment extends ImageAttachmentInput {
    id: string;
}

export const useChatAttachmentState = () => {
    const [attachments, setAttachments] = useState<TextAttachment[]>([]);
    const [imageAttachments, setImageAttachments] = useState<ImageAttachment[]>([]);

    const addAttachment = useCallback((file: TextAttachmentInput) => {
        setAttachments((prev) => [...prev, { id: crypto.randomUUID(), ...file }]);
    }, []);

    const removeAttachment = useCallback((id: string) => {
        setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    }, []);

    const addImageAttachment = useCallback((file: ImageAttachmentInput) => {
        setImageAttachments((prev) => [...prev, { id: crypto.randomUUID(), ...file }]);
    }, []);

    const removeImageAttachment = useCallback((id: string) => {
        setImageAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
    }, []);

    return {
        attachments,
        setAttachments,
        imageAttachments,
        setImageAttachments,
        addAttachment,
        removeAttachment,
        addImageAttachment,
        removeImageAttachment,
    };
};
