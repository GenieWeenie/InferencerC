import React from 'react';
import type { ChatMessage } from '../../shared/types';
import { ChatMessageRow } from '../components/chat/ChatMessageRow';
import { SearchResultRow } from '../components/chat/ChatSearchPanel';
import {
    buildSearchResultRows,
    getCachedChatRowMetadata,
    type ChatRowMetadataCacheState,
    type SearchResultPreviewCacheEntry,
} from '../lib/chatRenderModels';
import { getWrappedSearchResultIndex } from '../lib/chatUiModels';
import type { SelectedTokenContext } from '../lib/chatSelectionTypes';

interface UseChatMessageListSearchParams {
    history: ChatMessage[];
    isLoadingMessages: boolean;
    searchResults: number[];
    currentSearchIndex: number;
    editingMessageIndex: number | null;
    comparisonIndex: number | null;
    bookmarkedMessages: Set<number>;
    selectedToken: SelectedTokenContext | null;
    messageRatings: Record<number, 'up' | 'down'>;
    editedMessageContent: string;
    loadedMessageIndices: Set<number>;
    rowMetadataCacheRef: React.MutableRefObject<ChatRowMetadataCacheState>;
    searchResultPreviewCacheRef: React.MutableRefObject<Map<number, SearchResultPreviewCacheEntry>>;
    loadMessageRange: (startIndex: number, endIndex: number) => void;
    setEditedMessageContent: React.Dispatch<React.SetStateAction<string>>;
    setShowSearchResultsList: React.Dispatch<React.SetStateAction<boolean>>;
    setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
    setCurrentSearchIndex: React.Dispatch<React.SetStateAction<number>>;
    setShowSearch: React.Dispatch<React.SetStateAction<boolean>>;
    deleteMessage: (index: number) => void;
    handleEditMessage: (index: number) => void;
    handleRegenerateResponse: (index: number) => void;
    handleBranchConversation: (index: number) => void;
    mcpAvailable: boolean;
    handleInsertToFile: (code: string, language: string, filePath: string) => void;
    setSelectedToken: React.Dispatch<React.SetStateAction<SelectedTokenContext | null>>;
    setActiveTab: (value: 'inspector' | 'controls' | 'prompts' | 'documents') => void;
    setComparisonIndex: React.Dispatch<React.SetStateAction<number | null>>;
    modelNameById: Map<string, string>;
    currentModel: string;
    secondaryModel: string;
    handleRateMessage: (index: number, rating: 'up' | 'down') => void;
    showInspector: boolean;
    textareaRef: React.RefObject<HTMLTextAreaElement | null>;
    setInput: React.Dispatch<React.SetStateAction<string>>;
    handleCancelEdit: () => void;
    handleSaveEdit: (index: number) => void;
    selectChoice: (messageIndex: number, choiceIndex: number) => void;
    toggleBookmark: (index: number) => void;
    conversationFontSize: number;
    isCompactViewport: boolean;
    navigateToSearchResult: (resultIndex: number) => void;
    collapsedMessageRows: Record<number, boolean>;
    onToggleMessageCollapsed: (messageIndex: number) => void;
    collapseLongCodeBlocksSignal: number;
    expandLongCodeBlocksSignal: number;
}

export const useChatMessageListSearch = ({
    history,
    isLoadingMessages,
    searchResults,
    currentSearchIndex,
    editingMessageIndex,
    comparisonIndex,
    bookmarkedMessages,
    selectedToken,
    messageRatings,
    editedMessageContent,
    loadedMessageIndices,
    rowMetadataCacheRef,
    searchResultPreviewCacheRef,
    loadMessageRange,
    setEditedMessageContent,
    setShowSearchResultsList,
    setSearchQuery,
    setCurrentSearchIndex,
    setShowSearch,
    deleteMessage,
    handleEditMessage,
    handleRegenerateResponse,
    handleBranchConversation,
    mcpAvailable,
    handleInsertToFile,
    setSelectedToken,
    setActiveTab,
    setComparisonIndex,
    modelNameById,
    currentModel,
    secondaryModel,
    handleRateMessage,
    showInspector,
    textareaRef,
    setInput,
    handleCancelEdit,
    handleSaveEdit,
    selectChoice,
    toggleBookmark,
    conversationFontSize,
    isCompactViewport,
    navigateToSearchResult,
    collapsedMessageRows,
    onToggleMessageCollapsed,
    collapseLongCodeBlocksSignal,
    expandLongCodeBlocksSignal,
}: UseChatMessageListSearchParams) => {
    const searchResultSet = React.useMemo(() => new Set(searchResults), [searchResults]);
    const activeSearchMessageIndex = React.useMemo(
        () => (currentSearchIndex >= 0 ? searchResults[currentSearchIndex] : undefined),
        [searchResults, currentSearchIndex]
    );
    const searchResultRows = React.useMemo(() => {
        const { rows, nextPreviewCache } = buildSearchResultRows({
            searchResults,
            history,
            previewCache: searchResultPreviewCacheRef.current,
        });
        searchResultPreviewCacheRef.current = nextPreviewCache;
        return rows;
    }, [searchResults, history, searchResultPreviewCacheRef]);

    const loadMessageAtIndex = React.useCallback((messageIndex: number) => {
        loadMessageRange(messageIndex, messageIndex);
    }, [loadMessageRange]);

    const onEditingContentChange = React.useCallback((value: string) => {
        setEditedMessageContent(value);
    }, [setEditedMessageContent]);

    const handleToggleSearchResultsList = React.useCallback(() => {
        setShowSearchResultsList((prev) => !prev);
    }, [setShowSearchResultsList]);

    const handleSearchQueryChange = React.useCallback((value: string) => {
        setSearchQuery(value);
    }, [setSearchQuery]);

    const handlePreviousSearchResult = React.useCallback(() => {
        setCurrentSearchIndex((prev) => getWrappedSearchResultIndex(prev, searchResults.length, 'previous'));
    }, [setCurrentSearchIndex, searchResults.length]);

    const handleNextSearchResult = React.useCallback(() => {
        setCurrentSearchIndex((prev) => getWrappedSearchResultIndex(prev, searchResults.length, 'next'));
    }, [setCurrentSearchIndex, searchResults.length]);

    const handleCloseSearchPanel = React.useCallback(() => {
        setShowSearch(false);
        setSearchQuery('');
        setShowSearchResultsList(false);
    }, [setShowSearch, setSearchQuery, setShowSearchResultsList]);

    const rowMetadataByIndex = React.useMemo(() => getCachedChatRowMetadata({
        history,
        editingMessageIndex,
        searchResultSet,
        activeSearchMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        selectedToken,
        messageRatings,
        editedMessageContent,
        loadedMessageIndices,
    }, rowMetadataCacheRef.current), [
        history,
        editingMessageIndex,
        searchResultSet,
        activeSearchMessageIndex,
        comparisonIndex,
        bookmarkedMessages,
        selectedToken,
        messageRatings,
        editedMessageContent,
        loadedMessageIndices,
        rowMetadataCacheRef,
    ]);

    const renderItemContent = React.useCallback((index: number, msg: ChatMessage) => {
        const rowMetadata = rowMetadataByIndex[index];
        if (!rowMetadata) {
            return null;
        }

        return (
            <ChatMessageRow
                index={index}
                msg={msg}
                isLoadingMessages={isLoadingMessages}
                isSearchResult={rowMetadata.isSearchResult}
                isCurrentSearchResult={rowMetadata.isCurrentSearchResult}
                isLastMessage={rowMetadata.isLastMessage}
                previousMessage={rowMetadata.previousMessage}
                nextMessage={rowMetadata.nextMessage}
                isShowingComparison={rowMetadata.isShowingComparison}
                isComparisonPartnerHidden={rowMetadata.isComparisonPartnerHidden}
                isBookmarked={rowMetadata.isBookmarked}
                deleteMessage={deleteMessage}
                handleEditMessage={handleEditMessage}
                handleRegenerateResponse={handleRegenerateResponse}
                handleBranchConversation={handleBranchConversation}
                mcpAvailable={mcpAvailable}
                handleInsertToFile={handleInsertToFile}
                selectedTokenForMessage={rowMetadata.selectedTokenForMessage}
                setSelectedToken={setSelectedToken}
                setActiveTab={setActiveTab}
                setComparisonIndex={setComparisonIndex}
                modelNameById={modelNameById}
                currentModel={currentModel}
                secondaryModel={secondaryModel}
                handleRateMessage={handleRateMessage}
                messageRating={rowMetadata.messageRating}
                showInspector={showInspector}
                textareaRef={textareaRef}
                setInput={setInput}
                isEditingRow={rowMetadata.isEditingRow}
                editingContentForRow={rowMetadata.editingContentForRow}
                onEditingContentChange={onEditingContentChange}
                handleCancelEdit={handleCancelEdit}
                handleSaveEdit={handleSaveEdit}
                selectChoice={selectChoice}
                toggleBookmark={toggleBookmark}
                conversationFontSize={conversationFontSize}
                isCompactViewport={isCompactViewport}
                isLazyLoaded={rowMetadata.isLazyLoaded}
                loadMessageAtIndex={loadMessageAtIndex}
                isMessageCollapsed={collapsedMessageRows[index] === true}
                onToggleMessageCollapsed={onToggleMessageCollapsed}
                collapseLongCodeBlocksSignal={collapseLongCodeBlocksSignal}
                expandLongCodeBlocksSignal={expandLongCodeBlocksSignal}
            />
        );
    }, [
        rowMetadataByIndex,
        isLoadingMessages,
        deleteMessage,
        handleEditMessage,
        handleRegenerateResponse,
        handleBranchConversation,
        mcpAvailable,
        handleInsertToFile,
        setSelectedToken,
        setActiveTab,
        setComparisonIndex,
        modelNameById,
        currentModel,
        secondaryModel,
        handleRateMessage,
        showInspector,
        textareaRef,
        setInput,
        onEditingContentChange,
        handleCancelEdit,
        handleSaveEdit,
        selectChoice,
        toggleBookmark,
        conversationFontSize,
        isCompactViewport,
        loadMessageAtIndex,
        collapsedMessageRows,
        onToggleMessageCollapsed,
        collapseLongCodeBlocksSignal,
        expandLongCodeBlocksSignal,
    ]);

    const renderSearchResultItem = React.useCallback((resultIndex: number) => {
        const row = searchResultRows[resultIndex];
        if (!row) {
            return null;
        }
        return (
            <SearchResultRow
                resultIndex={row.resultIndex}
                messageIndex={row.messageIndex}
                preview={row.preview}
                roleLabel={row.roleLabel}
                roleClass={row.roleClass}
                isActive={resultIndex === currentSearchIndex}
                onNavigate={navigateToSearchResult}
            />
        );
    }, [searchResultRows, currentSearchIndex, navigateToSearchResult]);

    return {
        handleToggleSearchResultsList,
        handleSearchQueryChange,
        handlePreviousSearchResult,
        handleNextSearchResult,
        handleCloseSearchPanel,
        renderItemContent,
        renderSearchResultItem,
    };
};
