/**
 * Contextual Help Tooltip Component
 *
 * Context-sensitive help tooltips
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, X } from 'lucide-react';
import {
    contextualHelpService,
    HelpTooltip,
} from '../services/contextualHelp';

interface ContextualHelpTooltipProps {
    tooltip: HelpTooltip;
    target: HTMLElement;
}

export const ContextualHelpTooltip: React.FC<ContextualHelpTooltipProps> = ({
    tooltip,
    target,
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        const updatePosition = () => {
            const rect = target.getBoundingClientRect();
            const tooltipRect = tooltipRef.current?.getBoundingClientRect();
            if (!tooltipRect) return;

            let top = 0;
            let left = 0;

            switch (tooltip.position) {
                case 'top':
                    top = rect.top - tooltipRect.height - 8;
                    left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                    break;
                case 'bottom':
                    top = rect.bottom + 8;
                    left = rect.left + rect.width / 2 - tooltipRect.width / 2;
                    break;
                case 'left':
                    top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                    left = rect.left - tooltipRect.width - 8;
                    break;
                case 'right':
                    top = rect.top + rect.height / 2 - tooltipRect.height / 2;
                    left = rect.right + 8;
                    break;
                default:
                    top = rect.bottom + 8;
                    left = rect.left + rect.width / 2 - tooltipRect.width / 2;
            }

            // Keep within viewport
            const padding = 8;
            if (top < padding) top = padding;
            if (left < padding) left = padding;
            // Prevent tooltip from overlapping input area at bottom
            const inputAreaHeight = 200; // Approximate height of input area
            if (top + tooltipRect.height > window.innerHeight - inputAreaHeight) {
                top = rect.top - tooltipRect.height - 8; // Position above instead
            }
            if (left + tooltipRect.width > window.innerWidth - padding) {
                left = window.innerWidth - tooltipRect.width - padding;
            }
            if (left < padding) {
                left = padding;
            }

            setPosition({ top, left });
        };

        const handleShow = () => {
            if (tooltip.trigger === 'always') {
                setIsVisible(true);
                updatePosition();
            } else if (tooltip.trigger === 'hover') {
                const delay = tooltip.delay || 500;
                timeoutRef.current = setTimeout(() => {
                    setIsVisible(true);
                    updatePosition();
                }, delay);
            } else if (tooltip.trigger === 'click') {
                const handleClick = () => {
                    setIsVisible(!isVisible);
                    updatePosition();
                };
                target.addEventListener('click', handleClick);
                return () => target.removeEventListener('click', handleClick);
            } else if (tooltip.trigger === 'focus') {
                const handleFocus = () => {
                    setIsVisible(true);
                    updatePosition();
                };
                const handleBlur = () => {
                    if (!tooltip.persistent) {
                        setIsVisible(false);
                    }
                };
                target.addEventListener('focus', handleFocus);
                target.addEventListener('blur', handleBlur);
                return () => {
                    target.removeEventListener('focus', handleFocus);
                    target.removeEventListener('blur', handleBlur);
                };
            }
        };

        const handleHide = () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (!tooltip.persistent) {
                setIsVisible(false);
            }
        };

        if (tooltip.trigger === 'hover') {
            target.addEventListener('mouseenter', handleShow);
            target.addEventListener('mouseleave', handleHide);
            return () => {
                target.removeEventListener('mouseenter', handleShow);
                target.removeEventListener('mouseleave', handleHide);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                }
            };
        } else {
            handleShow();
        }

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [tooltip, target]);

    if (!isVisible && tooltip.trigger !== 'always') {
        return null;
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    ref={tooltipRef}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="fixed z-[9997] pointer-events-none"
                    style={{ top: `${position.top}px`, left: `${position.left}px` }}
                >
                    <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-3 max-w-xs pointer-events-auto">
                        <div className="flex items-start gap-2">
                            <HelpCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="font-semibold text-white text-sm mb-1">{tooltip.title}</div>
                                <p className="text-slate-300 text-xs">{tooltip.content}</p>
                            </div>
                            {tooltip.persistent && (
                                <button
                                    onClick={() => setIsVisible(false)}
                                    className="text-slate-400 hover:text-white transition-colors"
                                    aria-label="Close"
                                >
                                    <X size={12} />
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Arrow */}
                    <div
                        className={`absolute w-0 h-0 border-4 ${
                            tooltip.position === 'top'
                                ? 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent'
                                : tooltip.position === 'bottom'
                                ? 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent'
                                : tooltip.position === 'left'
                                ? 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent'
                                : 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent'
                        }`}
                    />
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// Contextual Help Manager Component
export const ContextualHelpManager: React.FC = () => {
    const [tooltips, setTooltips] = useState<Array<{ tooltip: HelpTooltip; element: HTMLElement }>>([]);

    useEffect(() => {
        if (!contextualHelpService.isHelpEnabled()) {
            return;
        }

        const allTooltips = contextualHelpService.getAllTooltips();
        const mounted: Array<{ tooltip: HelpTooltip; element: HTMLElement }> = [];

        allTooltips.forEach(tooltip => {
            if (tooltip.target) {
                const elements = document.querySelectorAll(tooltip.target);
                elements.forEach(element => {
                    if (element instanceof HTMLElement) {
                        mounted.push({ tooltip, element });
                    }
                });
            }
        });

        setTooltips(mounted);

        // Watch for new elements
        const observer = new MutationObserver(() => {
            const updated: Array<{ tooltip: HelpTooltip; element: HTMLElement }> = [];
            allTooltips.forEach(tooltip => {
                if (tooltip.target) {
                    const elements = document.querySelectorAll(tooltip.target);
                    elements.forEach(element => {
                        if (element instanceof HTMLElement) {
                            updated.push({ tooltip, element });
                        }
                    });
                }
            });
            setTooltips(updated);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });

        return () => observer.disconnect();
    }, []);

    return (
        <>
            {tooltips.map(({ tooltip, element }, index) => (
                <ContextualHelpTooltip
                    key={`${tooltip.id}-${index}`}
                    tooltip={tooltip}
                    target={element}
                />
            ))}
        </>
    );
};
