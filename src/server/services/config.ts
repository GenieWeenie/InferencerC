import fs from 'fs';
import path from 'path';
import { Model } from '../../shared/types';
import { ConfigValidator } from './config-validator';

/** Path to the configuration file */
const CONFIG_PATH = path.join(process.cwd(), 'config.json');

/**
 * Interface representing the application configuration
 */
export interface AppConfig {
  /** List of configured models */
  models: Model[];
  /** Optional default model ID */
  defaultModel?: string;
}

/** Default configuration used when no config file exists */
const DEFAULT_CONFIG: AppConfig = {
  models: [
    {
      id: 'local-lmstudio',
      name: 'LM Studio (Localhost:1234)',
      pathOrUrl: 'http://localhost:1234',
      type: 'remote-endpoint',
      status: 'loaded',
      adapter: 'lm-studio'
    }
  ]
};

const parseConfig = (raw: string): AppConfig | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    const validation = ConfigValidator.validateConfig(parsed);
    if (!validation.success || typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const config = parsed as { models?: unknown[]; defaultModel?: unknown };
    const models = Array.isArray(config.models)
      ? config.models.map((model) => ConfigValidator.sanitizeModel(model)).filter((model): model is Model => {
          return Boolean(
            model.id &&
            model.name &&
            model.pathOrUrl &&
            model.type &&
            model.status &&
            model.adapter
          );
        })
      : [];
    if (models.length === 0) {
      return null;
    }
    return {
      models,
      defaultModel: typeof config.defaultModel === 'string' ? config.defaultModel : undefined,
    };
  } catch {
    return null;
  }
};

/**
 * Service class for managing application configuration
 * Handles loading, saving, and manipulation of model configurations
 */
export class ConfigService {
  /** Current configuration object */
  private config: AppConfig;

  /**
   * Creates a new ConfigService instance
   * Loads the configuration from file or creates a default one
   */
  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Loads the configuration from the config file
   * Creates a default config if the file doesn't exist
   * @returns The loaded or default configuration
   */
  private loadConfig(): AppConfig {
    if (!fs.existsSync(CONFIG_PATH)) {
      try {
        this.saveConfig(DEFAULT_CONFIG);
        return DEFAULT_CONFIG;
      } catch (err) {
        console.error("Failed to save default config", err);
        return DEFAULT_CONFIG;
      }
    }
    try {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
      return parseConfig(data) || DEFAULT_CONFIG;
    } catch (err) {
      console.error("Failed to load config, using default", err);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * Saves the configuration to the config file
   * @param config The configuration to save
   * @throws Error if saving fails
   */
  private saveConfig(config: AppConfig) {
    try {
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Failed to save config", error);
      throw error;
    }
  }

  /**
   * Gets the list of configured models
   * @returns Array of configured models
   */
  getModels(): Model[] {
    try {
      return this.config.models;
    } catch (error) {
      console.error("Error retrieving models", error);
      return [];
    }
  }

  /**
   * Adds a new model to the configuration
   * @param model The model to add
   * @throws Error if the model is invalid or saving fails
   */
  addModel(model: Model) {
    try {
      // Validate model before adding
      const validationResult = ConfigValidator.validateModel(model);
      if (!validationResult.success) {
        throw new Error(`Invalid model configuration: ${validationResult.errors.join(', ')}`);
      }

      // Avoid duplicates
      if (!this.config.models.find(m => m.id === model.id)) {
        this.config.models.push(model);
        this.saveConfig(this.config);
      }
    } catch (error) {
      console.error("Error adding model", error);
      throw error;
    }
  }

  /**
   * Removes a model from the configuration by ID
   * @param id The ID of the model to remove
   * @throws Error if saving fails
   */
  removeModel(id: string) {
    try {
      this.config.models = this.config.models.filter(m => m.id !== id);
      this.saveConfig(this.config);
    } catch (error) {
      console.error("Error removing model", error);
      throw error;
    }
  }
}
