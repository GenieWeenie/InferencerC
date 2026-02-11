/**
 * @jest-environment jsdom
 */
import { act, renderHook } from '@testing-library/react';
import { useChatDiagnosticsPanel } from '../src/renderer/hooks/useChatDiagnosticsPanel';

describe('useChatDiagnosticsPanel', () => {
    it('toggles and closes diagnostics panel', () => {
        const onOpenSettings = jest.fn();
        const onOpenModels = jest.fn();
        const onInsertStarterPrompt = jest.fn();

        const { result } = renderHook(() => useChatDiagnosticsPanel({
            onOpenSettings,
            onOpenModels,
            onInsertStarterPrompt,
        }));

        expect(result.current.showDiagnosticsPanel).toBe(false);

        act(() => {
            result.current.handleToggleDiagnosticsPanel();
        });
        expect(result.current.showDiagnosticsPanel).toBe(true);

        act(() => {
            result.current.handleDiagnosticsOpenSettings();
        });

        expect(onOpenSettings).toHaveBeenCalledTimes(1);
        expect(result.current.showDiagnosticsPanel).toBe(false);
    });
});
