/**
 * Interactive Tutorial Component
 *
 * Step-by-step onboarding flow
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronRight, ChevronLeft, SkipForward, CheckCircle } from 'lucide-react';
import {
    onboardingService,
    Tutorial,
    TutorialStep,
} from '../services/onboarding';
import { toast } from 'sonner';

interface InteractiveTutorialProps {
    tutorial: Tutorial;
    onComplete: () => void;
    onSkip: () => void;
}

export const InteractiveTutorial: React.FC<InteractiveTutorialProps> = ({
    tutorial,
    onComplete,
    onSkip,
}) => {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [highlightedElement, setHighlightedElement] = useState<HTMLElement | null>(null);
    const overlayRef = useRef<HTMLDivElement>(null);
    const currentStep = tutorial.steps[currentStepIndex];

    useEffect(() => {
        if (currentStep?.target) {
            const element = document.querySelector(currentStep.target) as HTMLElement;
            if (element) {
                setHighlightedElement(element);
                // Scroll element into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                setHighlightedElement(null);
            }
        } else {
            setHighlightedElement(null);
        }
    }, [currentStep]);

    const handleNext = () => {
        if (currentStepIndex < tutorial.steps.length - 1) {
            setCurrentStepIndex(currentStepIndex + 1);
        } else {
            handleComplete();
        }
    };

    const handlePrevious = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(currentStepIndex - 1);
        }
    };

    const handleSkip = () => {
        onboardingService.completeTutorial(tutorial.id);
        onSkip();
    };

    const handleComplete = () => {
        onboardingService.completeTutorial(tutorial.id);
        toast.success('Tutorial completed!');
        onComplete();
    };

    const handleAction = () => {
        if (currentStep?.action === 'click' && currentStep.actionTarget) {
            const element = document.querySelector(currentStep.actionTarget) as HTMLElement;
            if (element) {
                element.click();
                setTimeout(handleNext, 500);
            }
        } else if (currentStep?.action === 'type' && currentStep.actionTarget) {
            const element = document.querySelector(currentStep.actionTarget) as HTMLElement;
            if (element && element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
                element.focus();
                // User will type, then we wait for them to continue
            }
        } else {
            handleNext();
        }
    };

    if (!currentStep) {
        return null;
    }

    const progress = ((currentStepIndex + 1) / tutorial.steps.length) * 100;
    const position = currentStep.position || 'bottom';

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[9999] pointer-events-none"
                ref={overlayRef}
            >
                {/* Overlay */}
                {highlightedElement && (
                    <HighlightOverlay
                        target={highlightedElement}
                        onClick={() => handleAction()}
                    />
                )}

                {/* Tooltip */}
                <Tooltip
                    step={currentStep}
                    position={position}
                    progress={progress}
                    onNext={handleNext}
                    onPrevious={handlePrevious}
                    onSkip={handleSkip}
                    onComplete={handleComplete}
                    isFirst={currentStepIndex === 0}
                    isLast={currentStepIndex === tutorial.steps.length - 1}
                />
            </motion.div>
        </AnimatePresence>
    );
};

// Highlight Overlay Component
const HighlightOverlay: React.FC<{
    target: HTMLElement;
    onClick: () => void;
}> = ({ target, onClick }) => {
    const [rect, setRect] = useState<DOMRect | null>(null);

    useEffect(() => {
        const updateRect = () => {
            const newRect = target.getBoundingClientRect();
            setRect(newRect);
        };

        updateRect();
        window.addEventListener('scroll', updateRect, true);
        window.addEventListener('resize', updateRect);

        return () => {
            window.removeEventListener('scroll', updateRect, true);
            window.removeEventListener('resize', updateRect);
        };
    }, [target]);

    if (!rect) return null;

    return (
        <>
            {/* Top overlay */}
            <div
                className="absolute bg-black/60 pointer-events-auto"
                style={{
                    top: 0,
                    left: 0,
                    right: 0,
                    height: `${rect.top}px`,
                }}
                onClick={onClick}
            />
            {/* Left overlay */}
            <div
                className="absolute bg-black/60 pointer-events-auto"
                style={{
                    top: `${rect.top}px`,
                    left: 0,
                    width: `${rect.left}px`,
                    height: `${rect.height}px`,
                }}
                onClick={onClick}
            />
            {/* Right overlay */}
            <div
                className="absolute bg-black/60 pointer-events-auto"
                style={{
                    top: `${rect.top}px`,
                    left: `${rect.right}px`,
                    right: 0,
                    height: `${rect.height}px`,
                }}
                onClick={onClick}
            />
            {/* Bottom overlay */}
            <div
                className="absolute bg-black/60 pointer-events-auto"
                style={{
                    top: `${rect.bottom}px`,
                    left: 0,
                    right: 0,
                    bottom: 0,
                }}
                onClick={onClick}
            />
            {/* Highlight ring */}
            <div
                className="absolute pointer-events-none border-2 border-primary shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] rounded-lg z-10"
                style={{
                    top: `${rect.top - 4}px`,
                    left: `${rect.left - 4}px`,
                    width: `${rect.width + 8}px`,
                    height: `${rect.height + 8}px`,
                }}
            />
        </>
    );
};

// Tooltip Component
const Tooltip: React.FC<{
    step: TutorialStep;
    position: string;
    progress: number;
    onNext: () => void;
    onPrevious: () => void;
    onSkip: () => void;
    onComplete: () => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ step, position, progress, onNext, onPrevious, onSkip, onComplete, isFirst, isLast }) => {
    const getPositionClasses = () => {
        if (position === 'center') {
            return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
        }
        // For other positions, we'll position relative to highlighted element
        return 'fixed bottom-8 left-1/2 -translate-x-1/2';
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`fixed ${getPositionClasses()} z-[10000] pointer-events-auto w-full max-w-md px-4`}
        >
            <div className="bg-slate-900 border-2 border-primary rounded-lg shadow-2xl p-6">
                {/* Progress bar */}
                <div className="mb-4">
                    <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                        <span>Step {Math.round(progress / (100 / (progress / 10)))}</span>
                        <span>{Math.round(progress)}%</span>
                    </div>
                    <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className="h-full bg-primary"
                        />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-white mb-2">{step.title}</h3>

                {/* Description */}
                <p className="text-slate-300 mb-4">{step.description}</p>

                {/* Actions */}
                <div className="flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                        {!isFirst && (
                            <button
                                onClick={onPrevious}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-2"
                            >
                                <ChevronLeft size={16} />
                                Previous
                            </button>
                        )}
                        {step.skipable && (
                            <button
                                onClick={onSkip}
                                className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded transition-colors flex items-center gap-2"
                            >
                                <SkipForward size={16} />
                                Skip
                            </button>
                        )}
                    </div>
                    <button
                        onClick={isLast ? onComplete : onNext}
                        className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded transition-colors flex items-center gap-2"
                    >
                        {isLast ? (
                            <>
                                <CheckCircle size={16} />
                                Complete
                            </>
                        ) : (
                            <>
                                Next
                                <ChevronRight size={16} />
                            </>
                        )}
                    </button>
                </div>
            </div>
        </motion.div>
    );
};
