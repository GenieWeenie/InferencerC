import React, { useEffect, useState, useRef } from 'react';
import { Model } from '../../shared/types';
import { HistoryService } from '../services/history';
import { Search, Download, Upload, FileText, HardDrive, Cpu, X, Check, AlertCircle, Loader2, Database, Heart, Tag } from 'lucide-react';

interface SearchResult {
  id: string;
  modelId: string; // HF repo ID
  downloads: number;
  likes: number;
  tags: string[];
}

interface DownloadStatus {
  modelId: string;
  fileName: string;
  progress: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

interface HFFile {
  path: string;
  size: number;
}

const Models: React.FC = () => {
  const [localModels, setLocalModels] = useState<Model[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeDownloads, setActiveDownloads] = useState<DownloadStatus[]>([]);

  // Modal State
  const [selectedRepo, setSelectedRepo] = useState<SearchResult | null>(null);
  const [repoFiles, setRepoFiles] = useState<HFFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // For file import
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial Fetch
  useEffect(() => {
    refreshModels();
    const interval = setInterval(fetchDownloads, 1000);
    return () => clearInterval(interval);
  }, []);

  // Export chat history
  const handleExportHistory = () => {
    HistoryService.exportHistory();
  };

  // Import chat history
  const handleImportHistory = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      HistoryService.importHistory(file)
        .then(() => {
          alert('Chat history imported successfully!');
          // Reset the input to allow importing the same file again
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        })
        .catch(error => {
          console.error('Error importing chat history:', error);
          alert('Error importing chat history: ' + error.message);
        });
    }
  };

  const refreshModels = () => {
    fetch('http://localhost:3000/v1/models')
      .then(res => res.json())
      .then(data => setLocalModels(data.data))
      .catch(console.error);
  };

  const fetchDownloads = () => {
    fetch('http://localhost:3000/v1/downloads')
      .then(res => res.json())
      .then(data => setActiveDownloads(data))
      .catch(console.error);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(`http://localhost:3000/v1/models/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const openDownloadModal = async (repo: SearchResult) => {
    setSelectedRepo(repo);
    setIsLoadingFiles(true);
    setRepoFiles([]);
    try {
      const res = await fetch(`http://localhost:3000/v1/models/files?repoId=${repo.modelId}`);
      const files = await res.json();
      setRepoFiles(files);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const startDownload = async (fileName: string) => {
    if (!selectedRepo) return;

    await fetch('http://localhost:3000/v1/models/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repoId: selectedRepo.modelId, fileName, name: selectedRepo.modelId })
    });

    setSelectedRepo(null); // Close modal
    fetchDownloads();
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full overflow-y-auto custom-scrollbar space-y-8 pb-20">

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-heading font-bold text-white mb-2">Model Manager</h2>
          <p className="text-slate-400">Manage your local LLMs and download new ones from Hugging Face.</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleExportHistory}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
          >
            <Download size={16} /> Export History
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-slate-200 rounded-lg hover:bg-slate-700 hover:text-white transition-all border border-slate-700"
          >
            <Upload size={16} /> Import History
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportHistory}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Active Downloads Section */}
      {activeDownloads.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Loader2 className="animate-spin text-primary" size={20} /> Active Downloads
          </h3>
          <div className="space-y-4">
            {activeDownloads.map((d, i) => (
              <div key={i} className="bg-slate-950 rounded-lg p-4 border border-slate-800">
                <div className="flex justify-between mb-2">
                  <span className="font-bold text-slate-200 flex items-center gap-2"><FileText size={14} /> {d.fileName}</span>
                  <span className="text-sm font-mono text-primary">{d.status === 'downloading' ? `${d.progress}%` : d.status}</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${d.status === 'error' ? 'bg-red-500' : 'bg-primary'}`}
                    style={{ width: `${d.progress}%` }}
                  ></div>
                </div>
                {d.error && <small className="text-red-400 mt-2 block flex items-center gap-1"><AlertCircle size={12} /> {d.error}</small>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Local Models List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><HardDrive size={20} /> Installed Models</h3>
        </div>
        <div className="divide-y divide-slate-800">
          {localModels.map(m => (
            <div key={m.id} className="p-6 flex justify-between items-center hover:bg-slate-800/30 transition-colors">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-slate-800 rounded-lg text-slate-400">
                  <Database size={24} />
                </div>
                <div>
                  <div className="font-bold text-lg text-white mb-1">{m.name}</div>
                  <div className="text-sm text-slate-500 font-mono bg-slate-950 px-2 py-1 rounded inline-block">{m.pathOrUrl}</div>
                </div>
              </div>
              <span className={`
                px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5
                ${m.status === 'loaded' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500 border border-slate-700'}
              `}>
                <div className={`w-1.5 h-1.5 rounded-full ${m.status === 'loaded' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}></div>
                {m.status}
              </span>
            </div>
          ))}
          {localModels.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              No models detected. Download one below or point the app to your model directory.
            </div>
          )}
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-white flex items-center gap-2"><Search size={20} /> Find on Hugging Face</h3>
        </div>
        <div className="flex shadow-lg rounded-xl overflow-hidden transition-all focus-within:ring-2 focus-within:ring-primary/50">
          <div className="bg-slate-800 pl-4 flex items-center justify-center text-slate-400">
            <Search size={20} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSearch()}
            placeholder="Search models (e.g. 'llama-3-8b-gguf')..."
            className="flex-1 bg-slate-800 text-white p-4 border-none outline-none placeholder-slate-500"
          />
          <button
            onClick={handleSearch}
            disabled={isSearching}
            className="px-8 bg-primary text-slate-900 font-bold hover:brightness-110 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSearching ? <Loader2 className="animate-spin" /> : 'Search'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {searchResults.map(result => (
            <div key={result.id} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:shadow-xl hover:border-slate-700 transition-all flex flex-col group cursor-default">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-lg text-white break-all pr-2 line-clamp-2">{result.modelId}</h4>
              </div>

              <div className="flex gap-4 text-sm text-slate-400 mb-6 font-mono">
                <div className="flex items-center gap-1"><Heart size={14} className="text-red-400" /> {result.likes}</div>
                <div className="flex items-center gap-1"><Download size={14} className="text-blue-400" /> {result.downloads}</div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 flex-1 content-start">
                {result.tags.slice(0, 5).map(tag => (
                  <span key={tag} className="bg-slate-950 text-slate-400 px-2 py-1 rounded text-xs border border-slate-800 flex items-center gap-1">
                    <Tag size={10} /> {tag}
                  </span>
                ))}
              </div>

              <button
                onClick={() => openDownloadModal(result)}
                className="w-full py-2.5 bg-slate-800 text-white rounded-lg hover:bg-primary hover:text-slate-900 font-bold transition-all flex items-center justify-center gap-2 group-hover:shadow-lg"
              >
                <Download size={16} /> Select File
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* File Selection Modal */}
      {selectedRepo && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl max-h-[80vh] rounded-xl flex flex-col shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/30">
              <div>
                <h3 className="text-xl font-bold text-white">Select File</h3>
                <p className="text-slate-400 text-sm mt-1">{selectedRepo.modelId}</p>
              </div>
              <button onClick={() => setSelectedRepo(null)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-0">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
                  <Loader2 size={32} className="animate-spin text-primary" />
                  <p>Fetching file list...</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-800">
                  <div className="grid grid-cols-12 bg-slate-950/50 p-3 text-xs font-bold text-slate-500 uppercase tracking-wider sticky top-0 backdrop-blur-md">
                    <div className="col-span-8 px-2">Filename</div>
                    <div className="col-span-2 px-2">Size</div>
                    <div className="col-span-2 px-2 text-center">Action</div>
                  </div>
                  {repoFiles.map(file => (
                    <div key={file.path} className="grid grid-cols-12 p-3 hover:bg-slate-800/30 transition-colors items-center text-sm group">
                      <div className="col-span-8 px-2 break-all font-mono text-slate-300">{file.path}</div>
                      <div className="col-span-2 px-2 text-slate-500">{formatSize(file.size)}</div>
                      <div className="col-span-2 px-2 text-center">
                        <button
                          onClick={() => startDownload(file.path)}
                          className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded text-xs font-bold transition-all border border-emerald-600/30 w-full"
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!isLoadingFiles && repoFiles.length === 0 && (
                <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                  <AlertCircle size={32} />
                  <p>No compatible files found in this repository.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Models;