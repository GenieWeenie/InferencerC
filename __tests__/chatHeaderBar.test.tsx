/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ChatHeaderBar } from '../src/renderer/components/chat/ChatHeaderBar';

describe('ChatHeaderBar', () => {
  it('renders primary controls and cloud badge', () => {
    render(
      <ChatHeaderBar
        isCompactViewport={false}
        showHistory={false}
        onToggleHistory={jest.fn()}
        topHeaderPrimaryActions={[
          { key: 'new', title: 'New Chat', label: 'New', icon: () => null, onClick: jest.fn(), variant: 'primary' },
        ]}
        experimentalFeatureActions={[]}
        onOpenCloudSyncPanel={jest.fn()}
        cloudSyncBadge={{ label: 'Cloud Off', className: 'text-slate-300', title: 'Cloud disabled' }}
        hasHistory={false}
        showTreeView={false}
        integrationAvailability={{ notion: false, slack: false, discord: false, email: false, calendar: false }}
        onOpenCodeIntegration={jest.fn()}
        onClearChat={jest.fn()}
        onOpenExportDialog={jest.fn()}
        onToggleTreeView={jest.fn()}
        onExportSessionToObsidian={jest.fn()}
        onSaveToNotion={jest.fn()}
        onSendToSlack={jest.fn()}
        onSendToDiscord={jest.fn()}
        onSendToEmail={jest.fn()}
        onOpenCalendarSchedule={jest.fn()}
        battleMode={false}
        currentModel="m1"
        secondaryModel=""
        allModelOptionElements={<option value="m1">Model One</option>}
        onCurrentModelChange={jest.fn()}
        onSecondaryModelChange={jest.fn()}
        showRequestLog={false}
        onToggleRequestLog={jest.fn()}
        apiLogCount={0}
        showSearch={false}
        onToggleSearch={jest.fn()}
        diagnosticsPanelRef={{ current: null }}
        diagnosticsButtonRef={{ current: null }}
        diagnosticsStatusClassName="text-green-300"
        diagnosticsStatusLabel="Healthy"
        diagnosticsReady={true}
        showDiagnosticsPanel={false}
        onToggleDiagnosticsPanel={jest.fn()}
        diagnosticsPopover={null}
        connectionStatus={{ local: 'online', remote: 'none' }}
      />
    );

    expect(screen.getByText('New')).toBeTruthy();
    expect(screen.getByText('Cloud Off')).toBeTruthy();
    expect(screen.getByText('Experimental')).toBeTruthy();
    expect(screen.getByText('Healthy')).toBeTruthy();
  });
});
