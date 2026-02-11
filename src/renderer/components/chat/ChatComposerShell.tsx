import React from 'react';
import { ImageIcon } from 'lucide-react';

interface ChatComposerShellProps {
    composerContainerRef: React.RefObject<HTMLDivElement | null>;
    isCompactViewport: boolean;
    isDragging: boolean;
    onDragOver: (event: React.DragEvent<HTMLDivElement>) => void;
    onDragLeave: (event: React.DragEvent<HTMLDivElement>) => void;
    onDrop: (event: React.DragEvent<HTMLDivElement>) => void;
    attachmentsPanel: React.ReactNode;
    auxPanels: React.ReactNode;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    input: string;
    slashMatchActive: boolean;
    onInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onInputPaste: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void;
    onInputKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    showBottomControls: boolean;
    actionButtons: React.ReactNode;
    bottomControls: React.ReactNode;
}

export const ChatComposerShell: React.FC<ChatComposerShellProps> = React.memo(({
    composerContainerRef,
    isCompactViewport,
    isDragging,
    onDragOver,
    onDragLeave,
    onDrop,
    attachmentsPanel,
    auxPanels,
    textareaRef,
    input,
    slashMatchActive,
    onInputChange,
    onInputPaste,
    onInputKeyDown,
    showBottomControls,
    actionButtons,
    bottomControls,
}) => (
    <div ref={composerContainerRef} className={`absolute bottom-6 left-1/2 -translate-x-1/2 w-full ${isCompactViewport ? 'max-w-full' : 'max-w-4xl'} px-4 z-20 min-w-0 overflow-x-hidden`}>
        <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`bg-slate-900/90 border backdrop-blur-xl rounded-2xl shadow-2xl flex flex-col transition-all duration-300 min-w-0 max-w-full overflow-x-hidden ${isDragging ? 'border-primary ring-2 ring-primary/50 bg-slate-800/90' : 'border-slate-700/50'}`}
        >
            {attachmentsPanel}
            {auxPanels}

            <div className={`flex items-start p-4 gap-3 bg-slate-950/30 relative min-w-0 max-w-full overflow-x-hidden ${showBottomControls ? 'rounded-t-2xl' : 'rounded-2xl'}`}>
                {isDragging && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/80 rounded-t-2xl backdrop-blur-sm pointer-events-none">
                        <div className="text-primary font-bold text-lg animate-bounce flex items-center gap-2">
                            <ImageIcon size={24} /> Drop files or images
                        </div>
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={onInputChange}
                    onPaste={onInputPaste}
                    onKeyDown={onInputKeyDown}
                    className={`flex-1 bg-transparent text-white placeholder-slate-400 border-none outline-none resize-none max-h-64 py-2 font-sans text-base leading-relaxed custom-scrollbar min-w-0 overflow-x-hidden break-words ${slashMatchActive ? 'text-primary' : ''}`}
                    placeholder="Type your prompt here... (Try '/')"
                    rows={1}
                />
                {actionButtons}
            </div>

            {showBottomControls && bottomControls}
        </div>
    </div>
), (prev, next) => (
    prev.composerContainerRef === next.composerContainerRef &&
    prev.isCompactViewport === next.isCompactViewport &&
    prev.isDragging === next.isDragging &&
    prev.onDragOver === next.onDragOver &&
    prev.onDragLeave === next.onDragLeave &&
    prev.onDrop === next.onDrop &&
    prev.attachmentsPanel === next.attachmentsPanel &&
    prev.auxPanels === next.auxPanels &&
    prev.textareaRef === next.textareaRef &&
    prev.input === next.input &&
    prev.slashMatchActive === next.slashMatchActive &&
    prev.onInputChange === next.onInputChange &&
    prev.onInputPaste === next.onInputPaste &&
    prev.onInputKeyDown === next.onInputKeyDown &&
    prev.showBottomControls === next.showBottomControls &&
    prev.actionButtons === next.actionButtons &&
    prev.bottomControls === next.bottomControls
));
