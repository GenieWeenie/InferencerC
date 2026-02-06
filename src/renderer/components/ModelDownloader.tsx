import React, { useState, useEffect, useCallback } from 'react';
import {
    Search, Download, Package, HardDrive, Cpu, Star, TrendingDown,
    Clock, X, Loader2, ChevronRight, ChevronDown, AlertCircle,
    Check, Pause, RefreshCw, Trash2, Sparkles, Zap, Code, MessageSquare
} from 'lucide-react';
import { toast } from 'sonner';
import {
    modelDownloader,
    HFModel,
    GGUFFile,
    DownloadProgress,
    QUANTIZATION_INFO,
    RECOMMENDED_MODELS
} from '../services/modelDownloader';

/**
 * Model Downloader Component
 * Browse and download GGUF models from HuggingFace
 */
const ModelDownloader: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<HFModel[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [selectedModel, setSelectedModel] = useState<HFModel | null>(null);
    const [modelFiles, setModelFiles] = useState<GGUFFile[]>([]);
    const [isLoadingFiles, setIsLoadingFiles] = useState(false);
    const [downloads, setDownloads] = useState<DownloadProgress[]>([]);
    const [activeTab, setActiveTab] = useState<'recommended' | 'search' | 'downloads'>('recommended');

    // Subscribe to download updates
    useEffect(() => {
        const update = () => setDownloads(modelDownloader.getDownloads());
        return modelDownloader.subscribe(update);
    }, []);

    // Search for models
    const handleSearch = useCallback(async () => {
        if (!searchQuery.trim()) return;

        setIsSearching(true);
        try {
            const results = await modelDownloader.searchModels(searchQuery + ' gguf');
            setSearchResults(results);
            setActiveTab('search');
        } catch (error: any) {
            toast.error(`Search failed: ${error.message}`);
        } finally {
            setIsSearching(false);
        }
    }, [searchQuery]);

    // Load files for a model
    const handleSelectModel = useCallback(async (model: HFModel | { id: string; name: string }) => {
        const modelObj = 'author' in model ? model : {
            id: model.id,
            author: model.id.split('/')[0],
            modelId: model.id.split('/')[1] || model.id,
            downloads: 0,
            likes: 0,
            tags: [],
            lastModified: '',
            private: false
        } as HFModel;

        setSelectedModel(modelObj);
        setIsLoadingFiles(true);
        setModelFiles([]);

        try {
            const files = await modelDownloader.getModelFiles(modelObj.id);
            setModelFiles(files);
        } catch (error: any) {
            toast.error(`Failed to load files: ${error.message}`);
        } finally {
            setIsLoadingFiles(false);
        }
    }, []);

    // Start download
    const handleDownload = useCallback(async (file: GGUFFile) => {
        if (!selectedModel) return;

        try {
            toast.info(`Starting download: ${file.name}`);
            setActiveTab('downloads');
            await modelDownloader.downloadModel(selectedModel.id, file);
            toast.success(`Download complete: ${file.name}`);
        } catch (error: any) {
            toast.error(`Download failed: ${error.message}`);
        }
    }, [selectedModel]);

    // Cancel download
    const handleCancelDownload = useCallback((modelId: string, fileName: string) => {
        modelDownloader.cancelDownload(modelId, fileName);
        toast.info('Download cancelled');
    }, []);

    // Remove download from list
    const handleRemoveDownload = useCallback((modelId: string, fileName: string) => {
        modelDownloader.removeDownload(modelId, fileName);
    }, []);

    // Get category icon
    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'Coding': return <Code size={14} className="text-emerald-400" />;
            case 'General': return <MessageSquare size={14} className="text-blue-400" />;
            default: return <Sparkles size={14} className="text-purple-400" />;
        }
    };

    // Format download count
    const formatNumber = (num: number): string => {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Download size={20} className="text-primary" />
                        Model Downloader
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">
                        Browse and download GGUF models from HuggingFace
                    </p>
                </div>
                {downloads.filter(d => d.status === 'downloading').length > 0 && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/20 text-primary rounded-full text-sm">
                        <Loader2 size={14} className="animate-spin" />
                        {downloads.filter(d => d.status === 'downloading').length} downloading
                    </div>
                )}
            </div>

            {/* Search Bar */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        placeholder="Search HuggingFace for GGUF models..."
                        className="w-full pl-12 pr-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-primary transition-colors"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
                    className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                    {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                    Search
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl">
                {[
                    { id: 'recommended', label: 'Recommended', icon: Star },
                    { id: 'search', label: 'Search Results', icon: Search, count: searchResults.length },
                    { id: 'downloads', label: 'Downloads', icon: Download, count: downloads.length }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id
                            ? 'bg-slate-700 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="bg-primary/30 text-primary text-xs px-1.5 rounded">{tab.count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="min-h-[400px]">
                {/* Recommended Tab */}
                {activeTab === 'recommended' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 animate-in fade-in duration-200">
                        {RECOMMENDED_MODELS.map(model => (
                            <button
                                key={model.id}
                                onClick={() => handleSelectModel(model)}
                                className="flex items-start gap-3 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl text-left transition-all group"
                            >
                                <div className="p-2 bg-slate-900 rounded-lg group-hover:bg-slate-700 transition-colors">
                                    <Package size={20} className="text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {getCategoryIcon(model.category)}
                                        <span className="font-medium text-white">{model.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <span className="bg-slate-700/50 px-2 py-0.5 rounded">{model.size}</span>
                                        <span className="bg-slate-700/50 px-2 py-0.5 rounded">{model.category}</span>
                                    </div>
                                </div>
                                <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Search Results Tab */}
                {activeTab === 'search' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                        {searchResults.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <Search size={32} className="mx-auto mb-3 opacity-50" />
                                <p>No search results yet</p>
                                <p className="text-sm text-slate-500 mt-1">Try searching for models like "llama", "mistral", or "codellama"</p>
                            </div>
                        ) : (
                            searchResults.map(model => (
                                <button
                                    key={model.id}
                                    onClick={() => handleSelectModel(model)}
                                    className="w-full flex items-start gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl text-left transition-all group"
                                >
                                    <div className="p-2 bg-slate-900 rounded-lg">
                                        <Package size={24} className="text-primary" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-white mb-1 truncate">{model.id}</div>
                                        <div className="flex items-center gap-3 text-xs text-slate-400">
                                            <span className="flex items-center gap-1">
                                                <Download size={12} />
                                                {formatNumber(model.downloads)}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <Star size={12} />
                                                {formatNumber(model.likes)}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-slate-500 group-hover:text-white transition-colors" />
                                </button>
                            ))
                        )}
                    </div>
                )}

                {/* Downloads Tab */}
                {activeTab === 'downloads' && (
                    <div className="space-y-3 animate-in fade-in duration-200">
                        {downloads.length === 0 ? (
                            <div className="text-center py-16 text-slate-400">
                                <Download size={32} className="mx-auto mb-3 opacity-50" />
                                <p>No active downloads</p>
                                <p className="text-sm text-slate-500 mt-1">Select a model and choose a file to download</p>
                            </div>
                        ) : (
                            downloads.map(download => (
                                <div
                                    key={`${download.modelId}/${download.fileName}`}
                                    className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-xl"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div>
                                            <div className="font-medium text-white text-sm">{download.fileName}</div>
                                            <div className="text-xs text-slate-400">{download.modelId}</div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {download.status === 'downloading' && (
                                                <button
                                                    onClick={() => handleCancelDownload(download.modelId, download.fileName)}
                                                    className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            )}
                                            {(download.status === 'completed' || download.status === 'error' || download.status === 'cancelled') && (
                                                <button
                                                    onClick={() => handleRemoveDownload(download.modelId, download.fileName)}
                                                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                                        <div
                                            className={`h-full transition-all duration-300 ${download.status === 'error' ? 'bg-red-500' :
                                                download.status === 'completed' ? 'bg-emerald-500' :
                                                    download.status === 'cancelled' ? 'bg-amber-500' :
                                                        'bg-primary'
                                                }`}
                                            style={{ width: `${download.percentage}%` }}
                                        />
                                    </div>

                                    <div className="flex items-center justify-between text-xs">
                                        <span className={`font-medium ${download.status === 'error' ? 'text-red-400' :
                                            download.status === 'completed' ? 'text-emerald-400' :
                                                download.status === 'cancelled' ? 'text-amber-400' :
                                                    'text-slate-300'
                                            }`}>
                                            {download.status === 'completed' && <Check size={12} className="inline mr-1" />}
                                            {download.status === 'error' && <AlertCircle size={12} className="inline mr-1" />}
                                            {download.status.charAt(0).toUpperCase() + download.status.slice(1)}
                                            {download.status === 'downloading' && ` ${download.percentage}%`}
                                        </span>
                                        <span className="text-slate-400">
                                            {modelDownloader.formatBytes(download.downloadedBytes)} / {modelDownloader.formatBytes(download.totalBytes)}
                                            {download.speed && download.status === 'downloading' && (
                                                <> • {modelDownloader.formatBytes(download.speed)}/s</>
                                            )}
                                            {download.eta !== undefined && download.status === 'downloading' && download.eta > 0 && (
                                                <> • ~{modelDownloader.formatTime(download.eta)}</>
                                            )}
                                        </span>
                                    </div>

                                    {download.error && (
                                        <div className="mt-2 text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
                                            {download.error}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Model Files Modal */}
            {selectedModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="w-full max-w-2xl max-h-[80vh] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-slate-800">
                            <div>
                                <h4 className="font-bold text-white">{selectedModel.modelId || selectedModel.id}</h4>
                                <p className="text-sm text-slate-400">{selectedModel.author}</p>
                            </div>
                            <button
                                onClick={() => setSelectedModel(null)}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Files List */}
                        <div className="p-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {isLoadingFiles ? (
                                <div className="text-center py-12">
                                    <Loader2 size={32} className="mx-auto mb-3 text-primary animate-spin" />
                                    <p className="text-slate-400">Loading available files...</p>
                                </div>
                            ) : modelFiles.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <AlertCircle size={32} className="mx-auto mb-3 opacity-50" />
                                    <p>No GGUF files found</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <p className="text-xs text-slate-500 mb-3">
                                        Select a quantization level. Higher quality = larger file and more VRAM required.
                                    </p>
                                    {modelFiles.map(file => {
                                        const quantKey = file.quantization || 'Q4_K_M';
                                        const quantInfo = QUANTIZATION_INFO[quantKey] || QUANTIZATION_INFO['Q4_K_M'];
                                        const vramInfo = modelDownloader.estimateVRAM(file.size, quantKey);

                                        return (
                                            <div
                                                key={file.name}
                                                className="flex items-center gap-4 p-4 bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 rounded-xl transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-mono text-sm text-white truncate">{file.name}</div>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                                                        <span className={`px-2 py-0.5 rounded font-medium ${quantInfo.quality >= 7 ? 'bg-emerald-500/20 text-emerald-400' :
                                                            quantInfo.quality >= 4 ? 'bg-amber-500/20 text-amber-400' :
                                                                'bg-slate-700 text-slate-300'
                                                            }`}>
                                                            {file.quantization}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <HardDrive size={12} />
                                                            {modelDownloader.formatBytes(file.size)}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Cpu size={12} />
                                                            ~{vramInfo.vramGB}GB VRAM
                                                        </span>
                                                    </div>
                                                    <div className="mt-1 text-[10px] text-slate-500">
                                                        {quantInfo.description} • {vramInfo.suggestion}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => handleDownload(file)}
                                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:brightness-110 transition-all flex items-center gap-2"
                                                >
                                                    <Download size={16} />
                                                    Download
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelDownloader;
