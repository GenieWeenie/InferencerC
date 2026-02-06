import { StatsService } from '../src/server/services/stats';

// Mock the child_process exec function
jest.mock('child_process', () => ({
  exec: jest.fn((command, callback) => {
    // Simulate nvidia-smi output
    if (command.includes('nvidia-smi')) {
      callback(null, { stdout: '50, 2048, 8192, GeForce RTX 3080\n' });
    }
  }),
  promisify: jest.fn((fn) => {
    return (...args) => {
      return new Promise((resolve, reject) => {
        fn(...args, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });
    };
  })
}));

// Mock the os module
jest.mock('os', () => ({
  totalmem: jest.fn(() => 17179869184), // 16GB in bytes
  freemem: jest.fn(() => 8589934592),  // 8GB in bytes
  cpus: jest.fn(() => [
    { times: { user: 100000, nice: 0, sys: 10000, idle: 200000, irq: 0 } },
    { times: { user: 120000, nice: 0, sys: 12000, idle: 180000, irq: 0 } }
  ])
}));

describe('StatsService', () => {
  let statsService: StatsService;

  beforeEach(() => {
    statsService = new StatsService();
  });

  test('should return system stats', async () => {
    const stats = await statsService.getStats();

    expect(stats).toHaveProperty('cpuUsage');
    expect(stats).toHaveProperty('ramUsed');
    expect(stats).toHaveProperty('ramTotal');
    expect(stats).toHaveProperty('gpuUsage');
    expect(stats).toHaveProperty('gpuMemUsed');
    expect(stats).toHaveProperty('gpuMemTotal');
    expect(stats).toHaveProperty('gpuName');
  });

  test('should have reasonable CPU usage values', async () => {
    const stats = await statsService.getStats();

    expect(typeof stats.cpuUsage).toBe('number');
    expect(stats.cpuUsage).toBeGreaterThanOrEqual(0);
    expect(stats.cpuUsage).toBeLessThanOrEqual(100);
  });

  test('should have reasonable RAM values', async () => {
    const stats = await statsService.getStats();

    expect(typeof stats.ramUsed).toBe('number');
    expect(typeof stats.ramTotal).toBe('number');
    expect(stats.ramUsed).toBeGreaterThan(0);
    expect(stats.ramTotal).toBeGreaterThan(0);
    expect(stats.ramUsed).toBeLessThanOrEqual(stats.ramTotal);
  });

  test('should have reasonable GPU values', async () => {
    const stats = await statsService.getStats();

    expect(typeof stats.gpuUsage).toBe('number');
    expect(typeof stats.gpuMemUsed).toBe('number');
    expect(typeof stats.gpuMemTotal).toBe('number');
    expect(stats.gpuName).toBe('GeForce RTX 3080');
  });
});