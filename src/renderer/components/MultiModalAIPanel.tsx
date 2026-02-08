/**
 * Multi-Modal AI Panel
 *
 * Support for video, audio, and other media types
 */

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Video, Image, FileText, Mic, Upload, Play, Pause } from 'lucide-react';
import {
    multiModalAIService,
    MediaAttachment,
} from '../services/multiModalAI';
import { toast } from 'sonner';

interface MultiModalAIPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (media: MediaAttachment[], text?: string) => void;
}

export const MultiModalAIPanel: React.FC<MultiModalAIPanelProps> = ({
    isOpen,
    onClose,
    onSend,
}) => {
    const [mediaFiles, setMediaFiles] = useState<MediaAttachment[]>([]);
    const [textInput, setTextInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (files: FileList | null) => {
        if (!files) return;

        setProcessing(true);
        try {
            const newMedia: MediaAttachment[] = [];
            for (const file of Array.from(files)) {
                const processed = await multiModalAIService.processMedia(file);
                newMedia.push(processed);
            }
            setMediaFiles(prev => [...prev, ...newMedia]);
            toast.success(`Processed ${newMedia.length} media file(s)`);
        } catch (error) {
            toast.error('Failed to process media files');
        } finally {
            setProcessing(false);
        }
    };

    const handleRemove = (id: string) => {
        setMediaFiles(prev => prev.filter(m => m.id !== id));
    };

    const handleSend = () => {
        if (mediaFiles.length === 0 && !textInput.trim()) {
            toast.error('Please add media or text');
            return;
        }

        onSend(mediaFiles, textInput.trim() || undefined);
        setMediaFiles([]);
        setTextInput('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    className="relative w-full max-w-3xl h-[90vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            <Video className="w-6 h-6 text-blue-400" />
                            <h2 className="text-2xl font-bold text-white">Multi-Modal AI</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 rounded transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                        {/* Text Input */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Message (Optional)</label>
                            <textarea
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded text-white resize-none"
                                rows={3}
                                placeholder="Describe what you want to analyze or ask about the media..."
                            />
                        </div>

                        {/* Media Files */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="block text-sm font-medium text-slate-300">Media Files</label>
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2"
                                >
                                    <Upload size={14} />
                                    Add Media
                                </button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
                                onChange={(e) => handleFileSelect(e.target.files)}
                                className="hidden"
                            />

                            {mediaFiles.length > 0 && (
                                <div className="space-y-3">
                                    {mediaFiles.map((media) => (
                                        <MediaPreview
                                            key={media.id}
                                            media={media}
                                            onRemove={() => handleRemove(media.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-700 flex items-center justify-between">
                        <div className="text-sm text-slate-400">
                            {mediaFiles.length} media file(s) selected
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={processing || (mediaFiles.length === 0 && !textInput.trim())}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors disabled:opacity-50"
                            >
                                {processing ? 'Processing...' : 'Send'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// Media Preview Component
const MediaPreview: React.FC<{
    media: MediaAttachment;
    onRemove: () => void;
}> = ({ media, onRemove }) => {
    const [isPlaying, setIsPlaying] = useState(false);

    const getIcon = () => {
        switch (media.type) {
            case 'image':
                return Image;
            case 'video':
                return Video;
            case 'audio':
                return Mic;
            default:
                return FileText;
        }
    };

    const Icon = getIcon();

    return (
        <div className="p-4 bg-slate-800 rounded border border-slate-700">
            <div className="flex items-start gap-3">
                {media.thumbnailUrl ? (
                    <img
                        src={media.thumbnailUrl}
                        alt={media.name}
                        className="w-20 h-20 object-cover rounded"
                    />
                ) : (
                    <div className="w-20 h-20 bg-slate-700 rounded flex items-center justify-center">
                        <Icon className="w-8 h-8 text-slate-400" />
                    </div>
                )}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-white text-sm">{media.name}</span>
                        <button
                            onClick={onRemove}
                            className="text-slate-400 hover:text-red-400 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </div>
                    <div className="text-xs text-slate-400 space-y-1">
                        <div>{media.type} • {(media.size / 1024).toFixed(1)} KB</div>
                        {media.transcript && (
                            <div className="text-slate-500">Transcript available</div>
                        )}
                        {media.extractedText && (
                            <div className="text-slate-500">Text extracted</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
