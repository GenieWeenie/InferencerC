/**
 * @jest-environment jsdom
 */
import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { useChatHeaderUtilityControls } from '../src/renderer/hooks/useChatHeaderUtilityControls';

const createSetStateMock = <T,>() =>
    (jest.fn() as unknown) as React.Dispatch<React.SetStateAction<T>>;

describe('useChatHeaderUtilityControls', () => {
    it('derives model options and map', () => {
        const setCurrentModel = jest.fn();
        const { result } = renderHook(() => useChatHeaderUtilityControls({
            availableModels: [
                { id: 'm1', name: 'Model One' },
                { id: 'm2', name: 'Model Two' },
            ],
            currentModel: 'm1',
            setCurrentModel,
            setSecondaryModel: createSetStateMock<string>(),
            setShowRequestLog: createSetStateMock<boolean>(),
            setShowSearch: createSetStateMock<boolean>(),
        }));

        expect(result.current.modelOptionItems).toEqual([
            { id: 'm1', label: 'Model One' },
            { id: 'm2', label: 'Model Two' },
        ]);
        expect(result.current.modelNameById.get('m2')).toBe('Model Two');
        expect(result.current.nonCurrentModelOptionElements).toHaveLength(1);

        act(() => {
            result.current.handleCurrentModelChange('m2');
        });
        expect(setCurrentModel).toHaveBeenCalledWith('m2');
    });

    it('toggles request log and search panels via state setters', () => {
        const setShowRequestLog = createSetStateMock<boolean>();
        const setShowSearch = createSetStateMock<boolean>();

        const { result } = renderHook(() => useChatHeaderUtilityControls({
            availableModels: [{ id: 'm1', name: 'Model One' }],
            currentModel: 'm1',
            setCurrentModel: jest.fn(),
            setSecondaryModel: createSetStateMock<string>(),
            setShowRequestLog,
            setShowSearch,
        }));

        act(() => {
            result.current.handleToggleRequestLog();
            result.current.handleToggleSearch();
        });

        expect(setShowRequestLog).toHaveBeenCalled();
        expect(setShowSearch).toHaveBeenCalled();
    });
});
