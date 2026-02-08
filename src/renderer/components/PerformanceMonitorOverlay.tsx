import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, MessageSquare, Zap } from 'lucide-react';
import { performanceService } from '../services/performance';

interface PerformanceMonitorOverlayProps {
    messageCount?: number;
}

export const PerformanceMonitorOverlay: React.FC<PerformanceMonitorOverlayProps> = ({ messageCount = 0 }) => {
    const [stats, setStats] = useState({
        fps: 0,
        memory: 0, // MB
        messages: messageCount,
        latency: 0
    });

    useEffect(() => {
        // Update message count when prop changes
        setStats(prev => ({ ...prev, messages: messageCount }));
    }, [messageCount]);

    useEffect(() => {
        // Subscribe to performance events
        const unsubscribe = performanceService.subscribe((metric) => {
            if (metric.type === 'latency') {
                setStats(prev => ({ ...prev, latency: metric.value }));
            }
        });
        return () => { unsubscribe(); };
    }, []);

    useEffect(() => {
        let frameCount = 0;
        let lastTime = performance.now();
        let animationFrameId: number;

        const updateStats = () => {
            const now = performance.now();
            frameCount++;

            if (now - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (now - lastTime));

                // Memory (Chrome/Electron only)
                // @ts-ignore
                const memory = performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1024 / 1024) : 0;

                setStats(prev => ({ ...prev, fps, memory }));

                frameCount = 0;
                lastTime = now;
            }

            animationFrameId = requestAnimationFrame(updateStats);
        };

        animationFrameId = requestAnimationFrame(updateStats);
        return () => cancelAnimationFrame(animationFrameId);
    }, []);

    // Color logic
    const getFpsColor = (fps: number) => {
        if (fps >= 55) return 'text-emerald-400';
        if (fps >= 30) return 'text-amber-400';
        return 'text-red-400';
    };

    const getMemoryColor = (mb: number) => {
        if (mb < 100) return 'text-emerald-400';
        if (mb < 300) return 'text-blue-400';
        if (mb < 500) return 'text-amber-400';
        return 'text-red-400';
    };

    const getLatencyColor = (ms: number) => {
        if (ms === 0) return 'text-slate-500';
        if (ms < 200) return 'text-emerald-400';
        if (ms < 500) return 'text-blue-400';
        if (ms < 1000) return 'text-amber-400';
        return 'text-red-400';
    };

    const getMessageCountColor = (count: number) => {
        if (count < 100) return 'text-emerald-400';
        if (count < 500) return 'text-blue-400';
        if (count < 1000) return 'text-amber-400';
        return 'text-red-400';
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-12 right-4 bg-slate-900/90 border border-slate-700/50 rounded-lg p-3 text-[10px] font-mono text-slate-400 backdrop-blur-md z-[200] flex gap-4 shadow-xl pointer-events-none select-none"
        >
            <div className="flex items-center gap-1.5">
                <Activity size={12} className={getFpsColor(stats.fps)} />
                <span className={getFpsColor(stats.fps)}>{stats.fps} FPS</span>
            </div>
            <div className="flex items-center gap-1.5">
                <Cpu size={12} className={getMemoryColor(stats.memory)} />
                <span className={getMemoryColor(stats.memory)}>{stats.memory || 'N/A'} MB</span>
            </div>
            <div className="flex items-center gap-1.5">
                <MessageSquare size={12} className={getMessageCountColor(stats.messages)} />
                <span className={getMessageCountColor(stats.messages)}>{stats.messages} Messages</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
                <Zap size={12} className={getLatencyColor(stats.latency)} />
                <span className={getLatencyColor(stats.latency)}>{stats.latency}ms</span>
            </div>
        </motion.div>
    );
};
