import React, { useMemo, useRef, useState } from 'react';
import { FileText, Upload, Search, Trash2, BookOpen, Quote, Cpu } from 'lucide-react';
import { toast } from 'sonner';
import {
    ragDocumentChatService,
    ChunkingStrategy,
    RAGAnswerResult,
    RAGCitation,
} from '../services/ragDocumentChat';

const ACCEPTED_EXTENSIONS = '.pdf,.docx,.txt,.md,.markdown,.js,.ts,.tsx,.jsx,.py,.json,.yaml,.yml,.html,.css,.c,.cpp,.h,.hpp,.java,.go,.rs,.sql,.xml,.sh,.bash,.zsh,.ini,.toml';

export const DocumentChatPanel: React.FC = () => {
    const [documents, setDocuments] = useState(ragDocumentChatService.getDocuments());
    const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(documents[0]?.id || null);
    const [chunkingStrategy, setChunkingStrategy] = useState<ChunkingStrategy>('semantic');
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState<RAGAnswerResult | null>(null);
    const [isIngesting, setIsIngesting] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedCitation, setSelectedCitation] = useState<RAGCitation | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const refreshDocuments = () => {
        const next = ragDocumentChatService.getDocuments();
        setDocuments(next);
        if (!selectedDocumentId && next[0]) {
            setSelectedDocumentId(next[0].id);
        }
    };

    const selectedDocument = useMemo(() => {
        return selectedDocumentId ? ragDocumentChatService.getDocument(selectedDocumentId) : undefined;
    }, [selectedDocumentId, documents]);

    const previewText = useMemo(() => {
        if (!selectedDocument) return '';

        if (selectedCitation && selectedCitation.documentId === selectedDocument.id) {
            const chunks = ragDocumentChatService.getDocumentChunks(selectedDocument.id);
            const selectedChunk = chunks.find(chunk => chunk.id === selectedCitation.chunkId);
            if (selectedChunk) {
                return selectedChunk.text;
            }
        }
        return selectedDocument.preview;
    }, [selectedDocument, selectedCitation]);

    const cacheStats = ragDocumentChatService.getEmbeddingCacheStats();

    const handleUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        setIsIngesting(true);
        try {
            for (const file of Array.from(files)) {
                await ragDocumentChatService.ingestFile(file, chunkingStrategy);
            }
            refreshDocuments();
            toast.success(`Indexed ${files.length} document${files.length > 1 ? 's' : ''}`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to ingest document');
        } finally {
            setIsIngesting(false);
        }
    };

    const handleAsk = async () => {
        if (!question.trim()) {
            toast.error('Enter a question first');
            return;
        }
        setIsSearching(true);
        try {
            const targetDocs = selectedDocumentId ? [selectedDocumentId] : undefined;
            const response = ragDocumentChatService.answerQuestion(question, {
                topK: 5,
                documentIds: targetDocs,
            });
            setAnswer(response);
            if (response.citations[0]) {
                setSelectedCitation(response.citations[0]);
                setSelectedDocumentId(response.citations[0].documentId);
            }
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="p-4 flex-1 overflow-y-auto custom-scrollbar space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <BookOpen size={15} className="text-primary" />
                    Document Chat (RAG)
                </h3>
                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isIngesting}
                    className="px-2.5 py-1.5 rounded bg-primary text-white text-xs font-medium hover:brightness-110 disabled:opacity-50 inline-flex items-center gap-1"
                >
                    <Upload size={12} />
                    {isIngesting ? 'Indexing...' : 'Upload'}
                </button>
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept={ACCEPTED_EXTENSIONS}
                    className="hidden"
                    onChange={(e) => handleUpload(e.target.files)}
                />
            </div>

            <div className="text-[11px] text-slate-500 bg-slate-900/80 border border-slate-800 rounded p-2">
                Supports PDF, DOCX, TXT, MD, and code files. Citations include page and line ranges.
            </div>

            <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Chunking Strategy</label>
                <select
                    value={chunkingStrategy}
                    onChange={(e) => setChunkingStrategy(e.target.value as ChunkingStrategy)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                >
                    <option value="semantic">Semantic (heading-aware)</option>
                    <option value="fixed-size">Fixed-size</option>
                    <option value="paragraph">Paragraph</option>
                </select>
            </div>

            <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Indexed Documents</label>
                {documents.length === 0 ? (
                    <div className="text-xs text-slate-500 border border-slate-800 rounded-lg p-3 bg-slate-900/60">
                        No documents indexed yet.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {documents.map(doc => (
                            <button
                                key={doc.id}
                                onClick={() => {
                                    setSelectedDocumentId(doc.id);
                                    setSelectedCitation(null);
                                }}
                                className={`w-full text-left border rounded-lg px-3 py-2 transition-colors ${selectedDocumentId === doc.id ? 'border-primary bg-primary/10' : 'border-slate-700 bg-slate-900/70 hover:border-slate-600'}`}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0">
                                        <div className="text-xs text-slate-200 truncate">{doc.name}</div>
                                        <div className="text-[10px] text-slate-500">{doc.chunkCount} chunks • {doc.strategy}</div>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            ragDocumentChatService.removeDocument(doc.id);
                                            if (selectedDocumentId === doc.id) {
                                                setSelectedDocumentId(null);
                                                setSelectedCitation(null);
                                            }
                                            refreshDocuments();
                                        }}
                                        className="p-1 text-slate-500 hover:text-red-300"
                                        title="Remove document"
                                    >
                                        <Trash2 size={12} />
                                    </button>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Ask Documents</label>
                <div className="flex gap-2">
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="Ask about indexed content..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-xs text-white placeholder-slate-500"
                    />
                    <button
                        onClick={handleAsk}
                        disabled={isSearching || documents.length === 0}
                        className="px-3 py-2 rounded bg-slate-800 border border-slate-700 text-slate-200 hover:text-white disabled:opacity-50 inline-flex items-center gap-1 text-xs"
                    >
                        <Search size={12} />
                        {isSearching ? 'Searching' : 'Ask'}
                    </button>
                </div>
            </div>

            {answer && (
                <div className="space-y-2 border border-slate-800 bg-slate-900/70 rounded-lg p-3">
                    <div className="text-xs text-slate-200 whitespace-pre-wrap">{answer.answer}</div>
                    {answer.citations.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 space-y-1">
                            <div className="text-[11px] text-slate-400 uppercase tracking-wider">Citations</div>
                            {answer.citations.map((citation, idx) => (
                                <button
                                    key={`${citation.chunkId}-${idx}`}
                                    onClick={() => {
                                        setSelectedCitation(citation);
                                        setSelectedDocumentId(citation.documentId);
                                    }}
                                    className={`w-full text-left px-2 py-1 rounded text-[11px] border ${selectedCitation?.chunkId === citation.chunkId ? 'border-primary bg-primary/10 text-slate-100' : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'}`}
                                >
                                    <span className="inline-flex items-center gap-1 mr-1 text-primary">
                                        <Quote size={10} />
                                    </span>
                                    {citation.documentName} • page {citation.page} • lines {citation.lineStart}-{citation.lineEnd}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

            <div className="space-y-2">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider">Document Preview</label>
                <div className="border border-slate-800 rounded-lg bg-slate-950/70 p-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {selectedDocument ? (
                        <div className="space-y-2">
                            <div className="text-xs text-slate-300 flex items-center gap-2">
                                <FileText size={12} className="text-slate-500" />
                                {selectedDocument.name}
                            </div>
                            {selectedCitation && (
                                <div className="text-[11px] text-primary">
                                    Focused citation: page {selectedCitation.page}, lines {selectedCitation.lineStart}-{selectedCitation.lineEnd}
                                </div>
                            )}
                            <pre className="text-[11px] leading-relaxed whitespace-pre-wrap text-slate-300 font-mono break-words">
                                {previewText || 'No preview available.'}
                            </pre>
                        </div>
                    ) : (
                        <div className="text-xs text-slate-500">Select a document to preview content.</div>
                    )}
                </div>
            </div>

            <div className="text-[10px] text-slate-500 flex items-center gap-2">
                <Cpu size={10} />
                Embedding cache: {cacheStats.entries} entries • {cacheStats.hits} hits • {cacheStats.misses} misses
            </div>
        </div>
    );
};
