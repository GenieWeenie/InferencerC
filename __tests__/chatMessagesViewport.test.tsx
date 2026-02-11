/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatMessagesViewport } from '../src/renderer/components/chat/ChatMessagesViewport';

describe('ChatMessagesViewport', () => {
  it('renders fallback loading state when history exists but virtuoso component is unavailable', () => {
    render(
      <ChatMessagesViewport
        messageListRef={{ current: null }}
        longPressMenuRef={{ current: null }}
        swipeSessionIndicator={null}
        history={[{ role: 'user', content: 'hello' }]}
        isLoadingMessages={false}
        VirtuosoComponent={null}
        virtuosoRef={{ current: null }}
        messageListFooterHeight={180}
        renderItemContent={() => null}
        showBottomControls={true}
        emptyStateReady={false}
        showLaunchChecklist={false}
        readinessCompletedCount={0}
        readinessSteps={[]}
        onSelectPrompt={jest.fn()}
        longPressMenu={null}
        longPressMessage={null}
        isLongPressMessageBookmarked={false}
        longPressMessageCapabilities={{
          canCopy: true,
          canBookmark: true,
          canEdit: false,
          canRegenerate: false,
          canBranch: true,
          canDelete: true,
        }}
        onLongPressAction={jest.fn()}
      />
    );

    expect(screen.getByText('Loading conversation...')).toBeTruthy();
  });
});
