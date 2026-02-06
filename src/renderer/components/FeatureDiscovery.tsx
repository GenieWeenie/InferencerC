/**
 * Feature Discovery Component
 *
 * Highlight new features as they're added
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, ChevronRight } from 'lucide-react';
import {
    onboardingService,
    FeatureDiscovery,
} from '../services/onboarding';
import { toast } from 'sonner';

interface FeatureDiscoveryProps {
    feature: FeatureDiscovery;
    onDismiss: () => void;
    onShow: () => void;
}

export const FeatureDiscoveryBanner: React.FC<FeatureDiscoveryProps> = ({
    feature,
    onDismiss,
    onShow,
}) => {
    const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

    useEffect(() => {
        if (feature.target) {
            const element = document.querySelector(feature.target) as HTMLElement;
            if (element) {
                setTargetElement(element);
                // Scroll into view
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }, [feature.target]);

    const handleDismiss = () => {
        onboardingService.dismissFeatureDiscovery(feature.id);
        onDismiss();
    };

    const handleShow = () => {
        onboardingService.markFeatureShown(feature.id);
        if (targetElement) {
            targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            // Add a highlight animation
            targetElement.classList.add('animate-pulse');
            setTimeout(() => {
                targetElement.classList.remove('animate-pulse');
            }, 2000);
        }
        onShow();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="fixed top-4 right-4 z-[9998] max-w-sm"
            >
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg shadow-2xl border border-purple-400/30 p-4">
                    <div className="flex items-start gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h4 className="font-bold text-white text-sm">New Feature!</h4>
                                <button
                                    onClick={handleDismiss}
                                    className="text-white/80 hover:text-white transition-colors"
                                    aria-label="Dismiss"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                            <p className="text-white/90 text-xs mb-2">{feature.description}</p>
                            {feature.version && (
                                <p className="text-white/70 text-[10px] mb-2">Added in v{feature.version}</p>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={handleShow}
                                    className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded text-xs font-medium transition-colors flex items-center gap-1"
                                >
                                    Show Me
                                    <ChevronRight size={12} />
                                </button>
                                <button
                                    onClick={handleDismiss}
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white/80 rounded text-xs transition-colors"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

// Feature Discovery Manager Component
export const FeatureDiscoveryManager: React.FC = () => {
    const [features, setFeatures] = useState<FeatureDiscovery[]>([]);
    const [currentFeature, setCurrentFeature] = useState<FeatureDiscovery | null>(null);

    useEffect(() => {
        const unshown = onboardingService.getUnshownFeatures();
        setFeatures(unshown);
        if (unshown.length > 0) {
            setCurrentFeature(unshown[0]);
        }
    }, []);

    const handleDismiss = () => {
        if (currentFeature) {
            const remaining = features.filter(f => f.id !== currentFeature.id);
            setFeatures(remaining);
            setCurrentFeature(remaining[0] || null);
        }
    };

    const handleShow = () => {
        if (currentFeature) {
            const remaining = features.filter(f => f.id !== currentFeature.id);
            setFeatures(remaining);
            setCurrentFeature(remaining[0] || null);
        }
    };

    if (!currentFeature) {
        return null;
    }

    return (
        <FeatureDiscoveryBanner
            feature={currentFeature}
            onDismiss={handleDismiss}
            onShow={handleShow}
        />
    );
};
