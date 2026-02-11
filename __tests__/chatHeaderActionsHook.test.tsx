/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatHeaderActions } from '../src/renderer/hooks/useChatHeaderActions';

const createSetStateMock = <T,>() =>
    (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<T>>;

describe('useChatHeaderActions', () => {
    it('wires top primary actions and cloud sync experimental opener', () => {
        const createNewSession = jest.fn();
        const setShowCloudSync = createSetStateMock<boolean>();

        const { result } = renderHook(() => useChatHeaderActions({
            createNewSession,
            setShowTemplateLibrary: createSetStateMock<boolean>(),
            setShowABTesting: createSetStateMock<boolean>(),
            setShowPromptOptimization: createSetStateMock<boolean>(),
            setShowWorkflows: createSetStateMock<boolean>(),
            setShowAPIPlayground: createSetStateMock<boolean>(),
            setShowDeveloperDocs: createSetStateMock<boolean>(),
            setShowPluginManager: createSetStateMock<boolean>(),
            setShowWorkspaceViews: createSetStateMock<boolean>(),
            setShowCloudSync,
            setShowBCI: createSetStateMock<boolean>(),
            setShowMultiModal: createSetStateMock<boolean>(),
            setShowCollaboration: createSetStateMock<boolean>(),
            setShowTeamWorkspaces: createSetStateMock<boolean>(),
            setShowEnterpriseCompliance: createSetStateMock<boolean>(),
            setShowBlockchain: createSetStateMock<boolean>(),
            setShowAIAgents: createSetStateMock<boolean>(),
            setShowFederatedLearning: createSetStateMock<boolean>(),
        }));

        const newAction = result.current.topHeaderPrimaryActions.find((action) => action.key === 'new-chat');
        expect(newAction).toBeTruthy();

        act(() => {
            newAction!.onClick();
        });
        expect(createNewSession).toHaveBeenCalledTimes(1);

        const cloudAction = result.current.experimentalFeatureActions.find((action) => action.key === 'cloudSync');
        expect(cloudAction).toBeTruthy();

        act(() => {
            cloudAction!.onClick();
        });
        expect(setShowCloudSync).toHaveBeenCalledWith(true);
    });
});
