import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { cacheService } from './cache';

const execAsync = promisify(exec);

/**
 * Interface representing system statistics
 */
export interface SystemStats {
  /** CPU usage percentage */
  cpuUsage: number;
  /** Amount of RAM used in MB */
  ramUsed: number;
  /** Total amount of RAM in MB */
  ramTotal: number;
  /** GPU usage percentage */
  gpuUsage: number;
  /** Amount of GPU memory used in MB */
  gpuMemUsed: number;
  /** Total amount of GPU memory in MB */
  gpuMemTotal: number;
  /** Name of the GPU */
  gpuName: string;
}

/**
 * Service class for collecting system statistics
 * Provides methods to gather CPU, RAM, and GPU usage information
 */
export class StatsService {
  /** Stores the previous CPU usage values for comparison */
  private lastCpuUsage: { idle: number, total: number } = { idle: 0, total: 0 };
  /** Cache key for storing system stats */
  private readonly STATS_CACHE_KEY = 'system-stats';
  /** Time-to-live for cached stats in milliseconds */
  private readonly CACHE_TTL_MS = 2000; // Cache stats for 2 seconds to reduce system load

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
  private getCPUTime() {
    let idle = 0;
    let total = 0;
    const cpus = os.cpus();
    for (const cpu of cpus) {
      total += Object.values(cpu.times).reduce((sum, value) => sum + value, 0);
      idle += cpu.times.idle;
    }
    return { idle, total };
  }

  /**
   * Retrieves GPU statistics using nvidia-smi
   * @returns Promise resolving to GPU stats or default values if unavailable
   */
  private async getGPUStats() {
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
    } catch (e) {
      return { usage: 0, memUsed: 0, memTotal: 0, name: 'No GPU detected' };
    }
  }

  /**
   * Gets the current system statistics
   * Uses caching to reduce system load
   * @returns Promise resolving to SystemStats object
   */
  async getStats(): Promise<SystemStats> {
    // Check if we have cached stats that are still valid
    const cachedStats = cacheService.get<SystemStats>(this.STATS_CACHE_KEY);
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
    const ramTotal = os.totalmem();
    const ramFree = os.freemem();
    const ramUsed = ramTotal - ramFree;

    // GPU
    const gpu = await this.getGPUStats();

    const stats: SystemStats = {
      cpuUsage: Math.round(cpuUsage),
      ramUsed: Math.round(ramUsed / (1024 * 1024)), // MB
      ramTotal: Math.round(ramTotal / (1024 * 1024)), // MB
      gpuUsage: gpu.usage,
      gpuMemUsed: gpu.memUsed,
      gpuMemTotal: gpu.memTotal,
      gpuName: gpu.name
    };

    // Cache the stats for a short period to reduce system load
    cacheService.set(this.STATS_CACHE_KEY, stats, this.CACHE_TTL_MS);

    return stats;
  }
}
