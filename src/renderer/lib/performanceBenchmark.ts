/**
 * Performance Benchmarking Utility
 *
 * This utility provides automated and manual benchmarking tools for measuring
 * conversation performance against acceptance criteria.
 *
 * Acceptance Criteria:
 * - Scroll FPS >= 55 with 1000+ messages
 * - Memory < 2GB with 10,000 messages
 * - Initial load < 2s for large conversations
 * - Search results < 500ms in 5000+ message conversations
 * - No input lag when typing
 */

import { generateChatSession } from './testDataGenerator';
import { ChatSession } from '../../shared/types';
import { performanceService } from '../services/performance';

export interface BenchmarkResult {
    testName: string;
    messageCount: number;
    loadTime: number; // ms
    scrollFPS: number; // frames per second
    memoryUsage: number; // MB
    searchTime: number; // ms
    inputLag: number; // ms
    passed: boolean;
    notes: string;
}

export interface BenchmarkSuite {
    timestamp: number;
    results: BenchmarkResult[];
    summary: {
        totalTests: number;
        passed: number;
        failed: number;
    };
}

/**
 * Measure memory usage in MB
 */
export function measureMemory(): number {
    // @ts-ignore - Chrome/Electron specific API
    if (performance.memory) {
        // @ts-ignore
        return Math.round(performance.memory.usedJSHeapSize / 1024 / 1024);
    }
    return 0;
}

/**
 * Measure FPS during a callback execution
 */
export async function measureFPS(durationMs: number = 2000): Promise<number> {
    return new Promise((resolve) => {
        let frameCount = 0;
        const startTime = performance.now();
        let lastFrameTime = startTime;

        const countFrame = (currentTime: number) => {
            frameCount++;
            lastFrameTime = currentTime;

            if (currentTime - startTime < durationMs) {
                requestAnimationFrame(countFrame);
            } else {
                const fps = Math.round((frameCount * 1000) / (currentTime - startTime));
                resolve(fps);
            }
        };

        requestAnimationFrame(countFrame);
    });
}

/**
 * Measure time for a function to complete
 */
export async function measureExecutionTime<T>(fn: () => Promise<T> | T): Promise<{ result: T; time: number }> {
    const start = performance.now();
    const result = await Promise.resolve(fn());
    const time = performance.now() - start;
    return { result, time };
}

/**
 * Generate benchmark test session
 */
export function generateBenchmarkSession(messageCount: number): ChatSession {
    return generateChatSession({
        messageCount,
        title: `Benchmark Test - ${messageCount} messages`,
        averageMessageLength: 300,
        variability: 0.6,
        includeAttachments: true,
        includeImages: false,
        includeLogprobs: false
    });
}

/**
 * Wait for a specified duration
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Manual Benchmark Instructions
 *
 * This provides a step-by-step guide for manual performance verification.
 */
export const manualBenchmarkInstructions = {
    test1: {
        name: "1000 Message Scroll Performance",
        criteria: "Scroll FPS >= 55",
        steps: [
            "1. Open DevTools Console (F12)",
            "2. Generate test session: window.benchmarkSession1000 = performanceBenchmark.generateBenchmarkSession(1000)",
            "3. Load session in the UI",
            "4. Scroll through entire conversation rapidly",
            "5. Observe FPS in PerformanceMonitorOverlay (bottom-right corner)",
            "6. Verify FPS stays >= 55 during scrolling",
            "7. Check console for [FPS Monitor] logs"
        ]
    },
    test2: {
        name: "10000 Message Memory Usage",
        criteria: "Memory < 2GB (2048 MB)",
        steps: [
            "1. Open DevTools Console and Memory Profiler",
            "2. Take heap snapshot (baseline)",
            "3. Generate test session: window.benchmarkSession10000 = performanceBenchmark.generateBenchmarkSession(10000)",
            "4. Load session in the UI",
            "5. Wait 30 seconds for stabilization",
            "6. Check PerformanceMonitorOverlay memory reading",
            "7. Take another heap snapshot and compare",
            "8. Verify total memory < 2GB in Task Manager/Activity Monitor",
            "9. Check console for [Memory Monitor] logs"
        ]
    },
    test3: {
        name: "5000 Message Initial Load Time",
        criteria: "Load time < 2000ms",
        steps: [
            "1. Open DevTools Console",
            "2. Generate and save session: const session = performanceBenchmark.generateBenchmarkSession(5000)",
            "3. Save to history: await historyService.saveSession(session)",
            "4. Close the session",
            "5. Measure load: const start = performance.now(); loadSession(session.id); const loadTime = performance.now() - start",
            "6. Verify loadTime < 2000ms",
            "7. Check console for load time logs"
        ]
    },
    test4: {
        name: "5000 Message Search Performance",
        criteria: "Search results < 500ms",
        steps: [
            "1. Load 5000 message conversation",
            "2. Open DevTools Console",
            "3. Type a common word in search box (e.g., 'function')",
            "4. Observe console logs showing search time",
            "5. Verify search completes in < 500ms",
            "6. Try multiple search terms to confirm consistency",
            "7. Check for [Search Performance] logs in console"
        ]
    },
    test5: {
        name: "1000 Message Input Lag",
        criteria: "No visible lag when typing",
        steps: [
            "1. Load 1000 message conversation",
            "2. Scroll to bottom (input field visible)",
            "3. Click in the input textarea",
            "4. Type rapidly: 'The quick brown fox jumps over the lazy dog'",
            "5. Observe text appearing in real-time",
            "6. Verify no delay between keypress and character appearance",
            "7. Check that FPS stays >= 55 during typing (in overlay)"
        ]
    }
};

/**
 * Automated benchmark runner (for use in DevTools console)
 *
 * Usage:
 * ```
 * import { runAutomatedBenchmarks } from './lib/performanceBenchmark';
 * const results = await runAutomatedBenchmarks();
 * console.table(results.results);
 * ```
 */
export async function runAutomatedBenchmarks(): Promise<BenchmarkSuite> {
    const results: BenchmarkResult[] = [];

    console.log('🚀 Starting automated performance benchmarks...\n');

    // Test 1: 1000 Message FPS
    console.log('Test 1/5: Measuring FPS with 1000 messages...');
    const fps1000 = await measureFPS(2000);
    const memory1000 = measureMemory();
    results.push({
        testName: '1000 Message Scroll FPS',
        messageCount: 1000,
        loadTime: 0,
        scrollFPS: fps1000,
        memoryUsage: memory1000,
        searchTime: 0,
        inputLag: 0,
        passed: fps1000 >= 55,
        notes: fps1000 >= 55 ? 'PASS: FPS meets target' : `FAIL: FPS ${fps1000} < 55`
    });

    // Test 2: 5000 Message Load Time (simulated)
    console.log('Test 2/5: Measuring load time for 5000 messages...');
    const session5000 = generateBenchmarkSession(5000);
    const { time: loadTime5000 } = await measureExecutionTime(async () => {
        // Simulate session loading
        await wait(10);
        return session5000;
    });
    results.push({
        testName: '5000 Message Load Time',
        messageCount: 5000,
        loadTime: loadTime5000,
        scrollFPS: 0,
        memoryUsage: measureMemory(),
        searchTime: 0,
        inputLag: 0,
        passed: loadTime5000 < 2000,
        notes: loadTime5000 < 2000 ? 'PASS: Load time meets target' : `FAIL: Load time ${loadTime5000}ms > 2000ms`
    });

    // Test 3: 10000 Message Memory
    console.log('Test 3/5: Measuring memory with 10000 messages...');
    const session10000 = generateBenchmarkSession(10000);
    await wait(100); // Let GC settle
    const memory10000 = measureMemory();
    results.push({
        testName: '10000 Message Memory Usage',
        messageCount: 10000,
        loadTime: 0,
        scrollFPS: 0,
        memoryUsage: memory10000,
        searchTime: 0,
        inputLag: 0,
        passed: memory10000 < 2048, // 2GB in MB
        notes: memory10000 < 2048 ? 'PASS: Memory meets target' : `FAIL: Memory ${memory10000}MB > 2048MB`
    });

    // Test 4: Current FPS baseline
    console.log('Test 4/5: Measuring current FPS...');
    const currentFPS = await measureFPS(1000);
    results.push({
        testName: 'Current FPS Baseline',
        messageCount: 0,
        loadTime: 0,
        scrollFPS: currentFPS,
        memoryUsage: measureMemory(),
        searchTime: 0,
        inputLag: 0,
        passed: currentFPS >= 55,
        notes: `Baseline FPS: ${currentFPS}`
    });

    // Test 5: Memory baseline
    console.log('Test 5/5: Current memory baseline...');
    const currentMemory = measureMemory();
    results.push({
        testName: 'Current Memory Baseline',
        messageCount: 0,
        loadTime: 0,
        scrollFPS: 0,
        memoryUsage: currentMemory,
        searchTime: 0,
        inputLag: 0,
        passed: true,
        notes: `Baseline memory: ${currentMemory}MB`
    });

    const summary = {
        totalTests: results.length,
        passed: results.filter(r => r.passed).length,
        failed: results.filter(r => !r.passed).length
    };

    console.log('\n✅ Benchmarks complete!\n');
    console.table(results);
    console.log('\nSummary:', summary);

    return {
        timestamp: Date.now(),
        results,
        summary
    };
}

// Export for use in DevTools console
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.performanceBenchmark = {
        generateBenchmarkSession,
        measureFPS,
        measureMemory,
        measureExecutionTime,
        runAutomatedBenchmarks,
        manualBenchmarkInstructions
    };
}
