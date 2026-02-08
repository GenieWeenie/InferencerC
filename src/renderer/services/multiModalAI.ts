/**
 * Multi-Modal AI Service
 *
 * Support for video, audio, and other media types
 */

export interface MediaAttachment {
    id: string;
    type: 'image' | 'video' | 'audio' | 'document';
    url: string;
    thumbnailUrl?: string;
    mimeType: string;
    size: number;
    duration?: number; // For video/audio
    transcript?: string; // For audio/video
    extractedText?: string; // For documents
}

export interface MultiModalRequest {
    text?: string;
    media: MediaAttachment[];
    model?: string;
    options?: {
        extractText?: boolean;
        generateTranscript?: boolean;
        analyzeContent?: boolean;
    };
}

export interface MultiModalResponse {
    content: string;
    mediaAnalysis?: {
        type: string;
        description?: string;
        transcript?: string;
        extractedText?: string;
    }[];
}

export class MultiModalAIService {
    private static instance: MultiModalAIService;
    private readonly STORAGE_KEY = 'multimodal_config';

    private constructor() {}

    static getInstance(): MultiModalAIService {
        if (!MultiModalAIService.instance) {
            MultiModalAIService.instance = new MultiModalAIService();
        }
        return MultiModalAIService.instance;
    }

    /**
     * Process media file and extract information
     */
    async processMedia(file: File): Promise<MediaAttachment> {
        const id = crypto.randomUUID();
        const url = URL.createObjectURL(file);
        let thumbnailUrl: string | undefined;
        let transcript: string | undefined;
        let extractedText: string | undefined;

        if (file.type.startsWith('image/')) {
            thumbnailUrl = url;
            // Generate thumbnail for large images
            const img = await this.createImageThumbnail(file);
            thumbnailUrl = img;
        } else if (file.type.startsWith('video/')) {
            thumbnailUrl = await this.createVideoThumbnail(file);
            // Extract audio and generate transcript
            transcript = await this.extractVideoTranscript(file);
        } else if (file.type.startsWith('audio/')) {
            thumbnailUrl = undefined;
            transcript = await this.extractAudioTranscript(file);
        } else if (file.type.includes('pdf') || file.type.includes('document')) {
            extractedText = await this.extractDocumentText(file);
        }

        return {
            id,
            type: this.getMediaType(file.type),
            url,
            thumbnailUrl,
            mimeType: file.type,
            size: file.size,
            transcript,
            extractedText,
        };
    }

    /**
     * Get media type from MIME type
     */
    private getMediaType(mimeType: string): MediaAttachment['type'] {
        if (mimeType.startsWith('image/')) return 'image';
        if (mimeType.startsWith('video/')) return 'video';
        if (mimeType.startsWith('audio/')) return 'audio';
        return 'document';
    }

    /**
     * Create image thumbnail
     */
    private async createImageThumbnail(file: File): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const maxSize = 200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxSize) {
                        height = (height * maxSize) / width;
                        width = maxSize;
                    }
                } else {
                    if (height > maxSize) {
                        width = (width * maxSize) / height;
                        height = maxSize;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    /**
     * Create video thumbnail
     */
    private async createVideoThumbnail(file: File): Promise<string> {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            video.onloadedmetadata = () => {
                video.currentTime = 1; // Get frame at 1 second
            };
            video.onseeked = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(video, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            video.src = URL.createObjectURL(file);
        });
    }

    /**
     * Extract transcript from video (mock implementation)
     */
    private async extractVideoTranscript(file: File): Promise<string> {
        // In a real implementation, this would use speech-to-text API
        // For now, return mock transcript
        return `[Video transcript for ${file.name}]`;
    }

    /**
     * Extract transcript from audio
     */
    private async extractAudioTranscript(file: File): Promise<string> {
        // In a real implementation, this would use speech-to-text API
        // For now, return mock transcript
        return `[Audio transcript for ${file.name}]`;
    }

    /**
     * Extract text from document
     */
    private async extractDocumentText(file: File): Promise<string> {
        // In a real implementation, this would use OCR or PDF parsing
        // For now, return mock text
        return `[Extracted text from ${file.name}]`;
    }

    /**
     * Send multi-modal request to AI
     */
    async sendMultiModalRequest(
        request: MultiModalRequest,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<MultiModalResponse> {
        // Build prompt with media context
        let prompt = request.text || 'Analyze the provided media:';
        
        if (request.media.length > 0) {
            prompt += '\n\nMedia attachments:';
            request.media.forEach((media, index) => {
                prompt += `\n${index + 1}. ${media.type}: ${media.mimeType}`;
                if (media.transcript) {
                    prompt += `\n   Transcript: ${media.transcript}`;
                }
                if (media.extractedText) {
                    prompt += `\n   Extracted text: ${media.extractedText}`;
                }
            });
        }

        const systemPrompt = 'You are a multi-modal AI assistant. Analyze images, videos, audio, and documents to provide comprehensive insights.';

        const response = await executePrompt(prompt, systemPrompt);

        return {
            content: response.content,
            mediaAnalysis: request.media.map(media => ({
                type: media.type,
                description: `Analyzed ${media.type}`,
                transcript: media.transcript,
                extractedText: media.extractedText,
            })),
        };
    }

    /**
     * Analyze media content
     */
    async analyzeMedia(
        media: MediaAttachment,
        executePrompt: (prompt: string, systemPrompt?: string) => Promise<{ content: string }>
    ): Promise<string> {
        let prompt = `Analyze this ${media.type}:`;
        
        if (media.transcript) {
            prompt += `\n\nTranscript: ${media.transcript}`;
        }
        if (media.extractedText) {
            prompt += `\n\nExtracted text: ${media.extractedText}`;
        }

        const response = await executePrompt(prompt);
        return response.content;
    }
}

export const multiModalAIService = MultiModalAIService.getInstance();
