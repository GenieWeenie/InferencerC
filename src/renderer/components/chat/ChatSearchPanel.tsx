import React from 'react';
import { Check, ChevronDown, ChevronUp, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import type { ChatVirtuosoComponent } from '../../lib/chatVirtuosoTypes';

export interface SearchResultRowProps {
    resultIndex: number;
    messageIndex: number;
    preview: string;
    roleLabel: string;
    roleClass: string;
    isActive: boolean;
    onNavigate: (resultIndex: number) => void;
}

export const SearchResultRow: React.FC<SearchResultRowProps> = React.memo(({
    resultIndex,
    messageIndex,
    preview,
    roleLabel,
    roleClass,
    isActive,
    onNavigate,
}) => {
    return (
        <button
            onClick={() => onNavigate(resultIndex)}
            className={`w-full text-left px-6 py-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 ${
                isActive ? 'bg-primary/10 border-l-2 border-l-primary' : ''
            }`}
        >
            <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400">
                    {resultIndex + 1}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-semibold ${roleClass}`}>{roleLabel}</span>
                        <span className="text-xs text-slate-500">Message #{messageIndex + 1}</span>
                    </div>
                    <p className="text-sm text-slate-300 truncate">{preview}</p>
                </div>
                {isActive && (
                    <Check size={16} className="text-primary flex-shrink-0 mt-1" />
                )}
            </div>
        </button>
    );
}, (prev, next) => {
    return (
        prev.resultIndex === next.resultIndex &&
        prev.messageIndex === next.messageIndex &&
        prev.preview === next.preview &&
        prev.roleLabel === next.roleLabel &&
        prev.roleClass === next.roleClass &&
        prev.isActive === next.isActive
    );
});

interface SearchToolbarControlsProps {
    hasResults: boolean;
    currentSearchIndex: number;
    searchResultsCount: number;
    showSearchResultsList: boolean;
    onToggleSearchResultsList: () => void;
    onPreviousSearchResult: () => void;
    onNextSearchResult: () => void;
    onCloseSearch: () => void;
}

const SearchToolbarControls: React.FC<SearchToolbarControlsProps> = React.memo(({
    hasResults,
    currentSearchIndex,
    searchResultsCount,
    showSearchResultsList,
    onToggleSearchResultsList,
    onPreviousSearchResult,
    onNextSearchResult,
    onCloseSearch,
}) => (
    <>
        {hasResults && (
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleSearchResultsList}
                    className="px-2 py-1.5 hover:bg-slate-700 rounded transition-colors text-sm text-slate-400 hover:text-white flex items-center gap-1"
                    title="Show all results"
                >
                    <span>{currentSearchIndex + 1} / {searchResultsCount}</span>
                    {showSearchResultsList ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                <button
                    onClick={onPreviousSearchResult}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Previous result"
                >
                    <ChevronUp size={16} className="text-slate-400" />
                </button>
                <button
                    onClick={onNextSearchResult}
                    className="p-1.5 hover:bg-slate-700 rounded transition-colors"
                    title="Next result"
                >
                    <ChevronDown size={16} className="text-slate-400" />
                </button>
            </div>
        )}
        <button
            onClick={onCloseSearch}
            className="p-1.5 hover:bg-slate-700 rounded transition-colors"
            title="Close search"
        >
            <X size={16} className="text-slate-400" />
        </button>
    </>
), (prev, next) => (
    prev.hasResults === next.hasResults &&
    prev.currentSearchIndex === next.currentSearchIndex &&
    prev.searchResultsCount === next.searchResultsCount &&
    prev.showSearchResultsList === next.showSearchResultsList &&
    prev.onToggleSearchResultsList === next.onToggleSearchResultsList &&
    prev.onPreviousSearchResult === next.onPreviousSearchResult &&
    prev.onNextSearchResult === next.onNextSearchResult &&
    prev.onCloseSearch === next.onCloseSearch
));

export interface ChatSearchPanelProps {
    showSearch: boolean;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    hasResults: boolean;
    currentSearchIndex: number;
    searchResultsCount: number;
    showSearchResultsList: boolean;
    onToggleSearchResultsList: () => void;
    onPreviousSearchResult: () => void;
    onNextSearchResult: () => void;
    onCloseSearch: () => void;
    virtuosoComponent: ChatVirtuosoComponent | null;
    renderSearchResultItem: (resultIndex: number) => React.ReactNode;
}

export const ChatSearchPanel: React.FC<ChatSearchPanelProps> = React.memo(({
    showSearch,
    searchQuery,
    onSearchQueryChange,
    hasResults,
    currentSearchIndex,
    searchResultsCount,
    showSearchResultsList,
    onToggleSearchResultsList,
    onPreviousSearchResult,
    onNextSearchResult,
    onCloseSearch,
    virtuosoComponent: VirtuosoComponent,
    renderSearchResultItem,
}) => {
    const handleSearchInputChange = React.useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        onSearchQueryChange(event.target.value);
    }, [onSearchQueryChange]);

    return (
        <AnimatePresence>
            {showSearch && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-b border-slate-800 bg-slate-900/50 overflow-hidden min-w-0"
                >
                    <div className="relative">
                        <div className="px-6 py-3 flex items-center gap-3 min-w-0 overflow-hidden">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={handleSearchInputChange}
                                    placeholder="Search in this conversation..."
                                    className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-10 pr-4 py-2 focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none"
                                    autoFocus
                                />
                            </div>
                            <SearchToolbarControls
                                hasResults={hasResults}
                                currentSearchIndex={currentSearchIndex}
                                searchResultsCount={searchResultsCount}
                                showSearchResultsList={showSearchResultsList}
                                onToggleSearchResultsList={onToggleSearchResultsList}
                                onPreviousSearchResult={onPreviousSearchResult}
                                onNextSearchResult={onNextSearchResult}
                                onCloseSearch={onCloseSearch}
                            />
                        </div>

                        <AnimatePresence>
                            {showSearchResultsList && searchResultsCount > 0 && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="border-t border-slate-800 bg-slate-900 overflow-hidden"
                                >
                                    <div className="max-h-80 overflow-y-auto">
                                        {VirtuosoComponent ? (
                                            <VirtuosoComponent
                                                style={{ height: Math.min(searchResultsCount * 60, 320) }}
                                                totalCount={searchResultsCount}
                                                itemContent={renderSearchResultItem}
                                            />
                                        ) : (
                                            <div className="h-24 flex items-center justify-center text-xs text-slate-500">
                                                Loading search results...
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}, (prev, next) => (
    prev.showSearch === next.showSearch &&
    prev.searchQuery === next.searchQuery &&
    prev.onSearchQueryChange === next.onSearchQueryChange &&
    prev.hasResults === next.hasResults &&
    prev.currentSearchIndex === next.currentSearchIndex &&
    prev.searchResultsCount === next.searchResultsCount &&
    prev.showSearchResultsList === next.showSearchResultsList &&
    prev.onToggleSearchResultsList === next.onToggleSearchResultsList &&
    prev.onPreviousSearchResult === next.onPreviousSearchResult &&
    prev.onNextSearchResult === next.onNextSearchResult &&
    prev.onCloseSearch === next.onCloseSearch &&
    prev.virtuosoComponent === next.virtuosoComponent &&
    prev.renderSearchResultItem === next.renderSearchResultItem
));
