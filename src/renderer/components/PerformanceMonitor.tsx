import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Database, Zap } from 'lucide-react';
import { performanceService } from '../services/performance';
import { getBrowserPerformanceMemory } from '../lib/performanceMemory';

export const PerformanceMonitor: React.FC = () => {
    const [stats, setStats] = useState({
        fps: 0,
        memory: 0, // MB
        domNodes: 0,
        latency: 0
    });

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

                const memorySnapshot = getBrowserPerformanceMemory();
                const memory = memorySnapshot
                    ? Math.round(memorySnapshot.usedJSHeapSize / 1024 / 1024)
                    : 0;

                const domNodes = document.getElementsByTagName('*').length;

                setStats(prev => ({ ...prev, fps, memory, domNodes }));

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
                <Database size={12} className="text-slate-300" />
                <span>{stats.domNodes} Nodes</span>
            </div>
            <div className="flex items-center gap-1.5 border-l border-slate-700 pl-4">
                <Zap size={12} className={getLatencyColor(stats.latency)} />
                <span className={getLatencyColor(stats.latency)}>{stats.latency}ms</span>
            </div>
        </motion.div>
    );
};
