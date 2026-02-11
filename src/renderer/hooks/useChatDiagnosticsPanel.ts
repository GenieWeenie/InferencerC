import React from 'react';

interface UseChatDiagnosticsPanelParams {
    onOpenSettings: () => void;
    onOpenModels: () => void;
    onInsertStarterPrompt: () => void;
}

export const useChatDiagnosticsPanel = ({
    onOpenSettings,
    onOpenModels,
    onInsertStarterPrompt,
}: UseChatDiagnosticsPanelParams) => {
    const [showDiagnosticsPanel, setShowDiagnosticsPanel] = React.useState(false);
    const [diagnosticsPanelPosition, setDiagnosticsPanelPosition] = React.useState<{ left: number; top: number }>({ left: 12, top: 12 });

    const diagnosticsPanelRef = React.useRef<HTMLDivElement | null>(null);
    const diagnosticsButtonRef = React.useRef<HTMLButtonElement | null>(null);
    const diagnosticsPopoverRef = React.useRef<HTMLDivElement | null>(null);

    React.useEffect(() => {
        if (!showDiagnosticsPanel) return;

        const handlePointerDown = (event: MouseEvent) => {
            const target = event.target as Node | null;
            if (diagnosticsPanelRef.current && target && !diagnosticsPanelRef.current.contains(target)) {
                setShowDiagnosticsPanel(false);
            }
        };

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowDiagnosticsPanel(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleEscape);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showDiagnosticsPanel]);

    const updateDiagnosticsPanelPosition = React.useCallback(() => {
        const trigger = diagnosticsButtonRef.current;
        if (!trigger) return;

        const triggerRect = trigger.getBoundingClientRect();
        const panelWidth = 288;
        const panelHeight = diagnosticsPopoverRef.current?.offsetHeight || 320;
        const margin = 12;
        const left = Math.min(
            Math.max(margin, triggerRect.right - panelWidth),
            window.innerWidth - panelWidth - margin
        );
        const topBelow = triggerRect.bottom + 8;
        const topAbove = triggerRect.top - panelHeight - 8;
        const top = topBelow + panelHeight + margin <= window.innerHeight
            ? topBelow
            : Math.max(margin, topAbove);

        setDiagnosticsPanelPosition({ left, top });
    }, []);

    React.useEffect(() => {
        if (!showDiagnosticsPanel) return;

        const raf = window.requestAnimationFrame(updateDiagnosticsPanelPosition);
        window.addEventListener('resize', updateDiagnosticsPanelPosition);
        window.addEventListener('scroll', updateDiagnosticsPanelPosition, true);
        return () => {
            window.cancelAnimationFrame(raf);
            window.removeEventListener('resize', updateDiagnosticsPanelPosition);
            window.removeEventListener('scroll', updateDiagnosticsPanelPosition, true);
        };
    }, [showDiagnosticsPanel, updateDiagnosticsPanelPosition]);

    const handleToggleDiagnosticsPanel = React.useCallback(() => {
        setShowDiagnosticsPanel((prev) => !prev);
    }, []);

    const handleCloseDiagnosticsPanel = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
    }, []);

    const handleDiagnosticsOpenSettings = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
        onOpenSettings();
    }, [onOpenSettings]);

    const handleDiagnosticsOpenModels = React.useCallback(() => {
        setShowDiagnosticsPanel(false);
        onOpenModels();
    }, [onOpenModels]);

    const handleDiagnosticsInsertStarterPrompt = React.useCallback(() => {
        onInsertStarterPrompt();
        setShowDiagnosticsPanel(false);
    }, [onInsertStarterPrompt]);

    return {
        showDiagnosticsPanel,
        diagnosticsPanelPosition,
        diagnosticsPanelRef,
        diagnosticsButtonRef,
        diagnosticsPopoverRef,
        handleToggleDiagnosticsPanel,
        handleCloseDiagnosticsPanel,
        handleDiagnosticsOpenSettings,
        handleDiagnosticsOpenModels,
        handleDiagnosticsInsertStarterPrompt,
    };
};
