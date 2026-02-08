# Performance Benchmark Quick Start Guide

## Overview

This guide provides quick instructions for running performance benchmarks to verify all acceptance criteria for the long conversation optimization feature.

## Prerequisites

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open the application in your browser (typically http://localhost:5173)

3. Open DevTools Console (F12 or Cmd+Opt+I)

---

## Quick Benchmark Methods

### Method 1: Automated Benchmarks (Quick Check)

Run automated benchmarks directly from DevTools Console:

```javascript
// Run all automated benchmarks
const results = await window.performanceBenchmark.runAutomatedBenchmarks();

// View results in a table
console.table(results.results);

// Check summary
console.log(`Passed: ${results.summary.passed}/${results.summary.totalTests}`);
```

### Method 2: Manual Benchmarks (Comprehensive)

Follow the detailed manual verification procedures in `PERFORMANCE_BENCHMARKS.md`.

---

## Individual Test Procedures

### Test 1: Scroll Performance (1000 Messages)
**Target:** FPS ≥ 55

```javascript
// Generate test session
const session1000 = window.performanceBenchmark.generateBenchmarkSession(1000);

// Load it in the UI (use the app's session loader)

// Measure FPS while scrolling
const fps = await window.performanceBenchmark.measureFPS(3000);
console.log(`Scroll FPS: ${fps} (target: ≥55) - ${fps >= 55 ? 'PASS ✅' : 'FAIL ❌'}`);
```

**Visual Verification:**
- Watch the Performance Monitor Overlay (bottom-right corner)
- Scroll rapidly through the conversation
- FPS should stay green (≥55)

---

### Test 2: Memory Usage (10,000 Messages)
**Target:** < 2GB (2048 MB)

```javascript
// Generate large test session
const session10000 = window.performanceBenchmark.generateBenchmarkSession(10000);

// Load it in the UI

// Wait for stabilization
await window.performanceBenchmark.wait(30000);

// Check memory
const memory = window.performanceBenchmark.measureMemory();
console.log(`Memory: ${memory}MB (target: <2048MB) - ${memory < 2048 ? 'PASS ✅' : 'FAIL ❌'}`);
```

**Visual Verification:**
- Check Performance Monitor Overlay for memory reading
- Open Task Manager / Activity Monitor to verify total process memory
- Memory should be blue or green in overlay (< 500MB)

---

### Test 3: Load Time (5000 Messages)
**Target:** < 2 seconds

```javascript
// Generate and save session
const session5000 = window.performanceBenchmark.generateBenchmarkSession(5000);
// ... save session to history using the app ...

// Measure load time
const start = performance.now();
// ... load the session via UI ...
const loadTime = performance.now() - start;
console.log(`Load time: ${loadTime}ms (target: <2000ms) - ${loadTime < 2000 ? 'PASS ✅' : 'FAIL ❌'}`);
```

**Note:** This test requires using the app's session saving and loading functionality.

---

### Test 4: Search Performance (5000 Messages)
**Target:** < 500ms

```javascript
// Load 5000 message conversation first

// Search timing is logged automatically in the console
// Look for: [Search Performance] logs

// Or measure manually:
const start = performance.now();
// ... type search term in UI ...
const searchTime = performance.now() - start;
console.log(`Search time: ${searchTime}ms (target: <500ms) - ${searchTime < 500 ? 'PASS ✅' : 'FAIL ❌'}`);
```

**Recommended Search Terms:**
- "function" (common term, many results)
- "error" (moderate results)
- "the" (very common, stress test)

---

### Test 5: Input Lag (1000 Messages)
**Target:** No visible lag

```javascript
// Load 1000 message conversation

// Type this rapidly in the input field:
// "The quick brown fox jumps over the lazy dog"

// Monitor FPS during typing
const fps = await window.performanceBenchmark.measureFPS(2000);
console.log(`FPS during typing: ${fps} (target: ≥55) - ${fps >= 55 ? 'PASS ✅' : 'FAIL ❌'}`);
```

**Visual Verification:**
- Characters should appear instantly (no delay)
- No dropped characters
- FPS overlay should stay green during typing

---

## Viewing Real-Time Metrics

The Performance Monitor Overlay (bottom-right corner) shows:
- **FPS** (Green: ≥55, Amber: 30-54, Red: <30)
- **Memory** (MB)
- **Message Count** (Color-coded by conversation size)
- **Latency** (API response time)

---

## Acceptance Criteria Checklist

After running all tests, verify:

- [ ] ✅ Scroll FPS ≥ 55 with 1000+ messages
- [ ] ✅ Memory < 2GB with 10,000 messages
- [ ] ✅ Initial load < 2s for large conversations
- [ ] ✅ Search < 500ms in 5000+ messages
- [ ] ✅ No input lag when typing

---

## Recording Results

1. Run each test procedure
2. Record actual results in `PERFORMANCE_BENCHMARKS.md`
3. Fill in the "Actual Results" sections
4. Mark PASS or FAIL for each criterion
5. Add reviewer sign-off

---

## Troubleshooting

### "window.performanceBenchmark is not defined"
- Ensure you're in the renderer process (main app window), not Node.js
- Refresh the page and try again
- Check that the app is running in development mode

### FPS appears lower than expected
- Close other tabs/applications to free up resources
- Ensure hardware acceleration is enabled in browser settings
- Try with a smaller conversation first (500 messages)

### Memory measurements not showing
- `performance.memory` is only available in Chromium-based browsers
- Use Task Manager / Activity Monitor as fallback
- Check DevTools Memory profiler for heap snapshots

---

## Next Steps

1. Run all benchmark tests
2. Document results in `PERFORMANCE_BENCHMARKS.md`
3. Verify acceptance criteria are met
4. Run regression tests (ensure existing features still work)
5. Final sign-off and QA acceptance

---

**For detailed procedures and documentation, see:** `PERFORMANCE_BENCHMARKS.md`
**For automated utilities source code, see:** `src/renderer/lib/performanceBenchmark.ts`
