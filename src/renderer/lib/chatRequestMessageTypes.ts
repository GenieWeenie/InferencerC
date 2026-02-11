import type { Message } from '../../shared/types';

export interface ChatRequestTextContentPart {
    type: 'text';
    text: string;
}

export interface ChatRequestImageContentPart {
    type: 'image_url';
    image_url: {
        url: string;
        detail: 'auto';
    };
}

export type ChatRequestContentPart =
    | ChatRequestTextContentPart
    | ChatRequestImageContentPart;

export type ChatRequestMessageContent =
    | string
    | ChatRequestContentPart[];

export type ChatRequestMessage = Omit<Message, 'content'> & {
    content: ChatRequestMessageContent;
};
