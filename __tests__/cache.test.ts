import { CacheService } from '../src/server/services/cache';

describe('CacheService', () => {
  let cache: CacheService;

  beforeEach(() => {
    cache = new CacheService();
  });

  afterEach(() => {
    cache.clear();
  });

  test('should store and retrieve values', () => {
    cache.set('test-key', 'test-value');
    const result = cache.get('test-key');
    expect(result).toBe('test-value');
  });

  test('should return undefined for non-existent keys', () => {
    const result = cache.get('non-existent-key');
    expect(result).toBeUndefined();
  });

  test('should expire entries after TTL', () => {
    jest.useFakeTimers();
    cache.set('expiring-key', 'expiring-value', 1000); // 1 second TTL
    
    // Advance time by 1.5 seconds
    jest.advanceTimersByTime(1500);
    
    const result = cache.get('expiring-key');
    expect(result).toBeUndefined();
    
    jest.useRealTimers();
  });

  test('should not expire entries before TTL', () => {
    jest.useFakeTimers();
    cache.set('non-expiring-key', 'non-expiring-value', 1000); // 1 second TTL
    
    // Advance time by 0.5 seconds
    jest.advanceTimersByTime(500);
    
    const result = cache.get('non-expiring-key');
    expect(result).toBe('non-expiring-value');
    
    jest.useRealTimers();
  });

  test('should delete specific keys', () => {
    cache.set('delete-test', 'delete-value');
    cache.delete('delete-test');
    const result = cache.get('delete-test');
    expect(result).toBeUndefined();
  });

  test('should return correct size', () => {
    cache.set('size-test-1', 'value1');
    cache.set('size-test-2', 'value2');
    expect(cache.size()).toBe(2);
  });

  test('should clear all entries', () => {
    cache.set('clear-test', 'value');
    expect(cache.size()).toBe(1);
    cache.clear();
    expect(cache.size()).toBe(0);
    expect(cache.get('clear-test')).toBeUndefined();
  });
});