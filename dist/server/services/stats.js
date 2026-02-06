"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StatsService = void 0;
const os_1 = __importDefault(require("os"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const cache_1 = require("./cache");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * Service class for collecting system statistics
 * Provides methods to gather CPU, RAM, and GPU usage information
 */
class StatsService {
    /** Stores the previous CPU usage values for comparison */
    lastCpuUsage = { idle: 0, total: 0 };
    /** Cache key for storing system stats */
    STATS_CACHE_KEY = 'system-stats';
    /** Time-to-live for cached stats in milliseconds */
    CACHE_TTL_MS = 2000; // Cache stats for 2 seconds to reduce system load
    /**
     * Creates a new StatsService instance
     * Initializes the CPU usage tracking
     */
    constructor() {
        this.lastCpuUsage = this.getCPUTime();
    }
    /**
     * Gets the cumulative CPU time across all cores
     * @returns Object containing idle and total CPU time
     */
    getCPUTime() {
        let idle = 0;
        let total = 0;
        const cpus = os_1.default.cpus();
        for (const cpu of cpus) {
            for (const type in cpu.times) {
                total += cpu.times[type];
            }
            idle += cpu.times.idle;
        }
        return { idle, total };
    }
    /**
     * Retrieves GPU statistics using nvidia-smi
     * @returns Promise resolving to GPU stats or default values if unavailable
     */
    async getGPUStats() {
        try {
            // Query utilization and memory
            const { stdout } = await execAsync('nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total,name --format=csv,noheader,nounits');
            const [usage, memUsed, memTotal, name] = stdout.trim().split(', ');
            return {
                usage: parseInt(usage) || 0,
                memUsed: parseInt(memUsed) || 0,
                memTotal: parseInt(memTotal) || 0,
                name: name || 'Nvidia GPU'
            };
        }
        catch (e) {
            return { usage: 0, memUsed: 0, memTotal: 0, name: 'No GPU detected' };
        }
    }
    /**
     * Gets the current system statistics
     * Uses caching to reduce system load
     * @returns Promise resolving to SystemStats object
     */
    async getStats() {
        // Check if we have cached stats that are still valid
        const cachedStats = cache_1.cacheService.get(this.STATS_CACHE_KEY);
        if (cachedStats) {
            return cachedStats;
        }
        // CPU Calculation
        const start = this.lastCpuUsage;
        const end = this.getCPUTime();
        this.lastCpuUsage = end;
        const idleDiff = end.idle - start.idle;
        const totalDiff = end.total - start.total;
        const cpuUsage = totalDiff > 0 ? (1 - idleDiff / totalDiff) * 100 : 0;
        // RAM
        const ramTotal = os_1.default.totalmem();
        const ramFree = os_1.default.freemem();
        const ramUsed = ramTotal - ramFree;
        // GPU
        const gpu = await this.getGPUStats();
        const stats = {
            cpuUsage: Math.round(cpuUsage),
            ramUsed: Math.round(ramUsed / (1024 * 1024)), // MB
            ramTotal: Math.round(ramTotal / (1024 * 1024)), // MB
            gpuUsage: gpu.usage,
            gpuMemUsed: gpu.memUsed,
            gpuMemTotal: gpu.memTotal,
            gpuName: gpu.name
        };
        // Cache the stats for a short period to reduce system load
        cache_1.cacheService.set(this.STATS_CACHE_KEY, stats, this.CACHE_TTL_MS);
        return stats;
    }
}
exports.StatsService = StatsService;
//# sourceMappingURL=stats.js.map