import { ConfigService } from '../src/server/services/config';
import * as fs from 'fs';
import * as path from 'path';

// Mock the file system to avoid actually writing files during tests
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  writeFileSync: jest.fn(),
  readFileSync: jest.fn(),
  existsSync: jest.fn(),
}));

describe('ConfigService', () => {
  let configService: ConfigService;
  const mockConfigPath = path.join(process.cwd(), 'config.json');
  const mockFs = jest.mocked(fs);

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Set up default mock implementations
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readFileSync.mockReturnValue(JSON.stringify({
      models: [
        {
          id: 'test-model',
          name: 'Test Model',
          pathOrUrl: 'http://localhost:3000',
          type: 'remote-endpoint',
          status: 'loaded',
          adapter: 'mock'
        }
      ]
    }));
    
    configService = new ConfigService();
  });

  test('should load config from file', () => {
    const models = configService.getModels();
    expect(models).toHaveLength(1);
    expect(models[0].id).toBe('test-model');
  });

  test('should add a new model', () => {
    const newModel = {
      id: 'new-model',
      name: 'New Model',
      pathOrUrl: 'http://localhost:4000',
      type: 'remote-endpoint',
      status: 'loaded',
      adapter: 'mock'
    };
    
    configService.addModel(newModel);
    const models = configService.getModels();
    
    expect(models).toContainEqual(newModel);
  });

  test('should not add duplicate models', () => {
    const duplicateModel = {
      id: 'test-model', // Same ID as existing model
      name: 'Duplicate Model',
      pathOrUrl: 'http://localhost:5000',
      type: 'remote-endpoint',
      status: 'loaded',
      adapter: 'mock'
    };
    
    configService.addModel(duplicateModel);
    const models = configService.getModels();
    
    // Should still have only the original model
    expect(models).toHaveLength(1);
    expect(models[0].name).toBe('Test Model');
  });

  test('should remove a model', () => {
    configService.removeModel('test-model');
    const models = configService.getModels();
    
    expect(models).toHaveLength(0);
  });

  test('should handle config file not existing', () => {
    mockFs.existsSync.mockReturnValue(false);
    mockFs.writeFileSync.mockImplementation(() => {}); // Mock write to avoid errors
    
    const newConfigService = new ConfigService();
    const models = newConfigService.getModels();
    
    // Should return default config when file doesn't exist
    expect(models).toBeDefined();
  });
});