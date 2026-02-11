import { Model } from '../../shared/types';

type ModelLike = Partial<Model> & Record<string, unknown>;
type ConfigLike = {
  models?: unknown;
  defaultModel?: unknown;
};

const MODEL_TYPES: Model['type'][] = ['local-folder', 'remote-endpoint'];
const MODEL_STATUSES: Model['status'][] = ['loaded', 'unloaded', 'loading', 'error'];
const MODEL_ADAPTERS: Model['adapter'][] = ['mock', 'lm-studio', 'llama-cpp'];

const asModelLike = (value: unknown): ModelLike => {
  if (value && typeof value === 'object') {
    return value as ModelLike;
  }
  return {};
};

/**
 * Configuration validation service
 * Provides methods to validate configuration objects
 */
export class ConfigValidator {
  /**
   * Validates a model configuration
   * @param model The model to validate
   * @returns Validation result with success flag and errors
   */
  static validateModel(model: Model): { success: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!model.id || typeof model.id !== 'string' || model.id.trim() === '') {
      errors.push('Model ID is required and must be a non-empty string');
    }

    if (!model.name || typeof model.name !== 'string' || model.name.trim() === '') {
      errors.push('Model name is required and must be a non-empty string');
    }

    if (!model.pathOrUrl || typeof model.pathOrUrl !== 'string' || model.pathOrUrl.trim() === '') {
      errors.push('Model pathOrUrl is required and must be a non-empty string');
    }

    // Validate type
    if (!model.type || !['local-folder', 'remote-endpoint'].includes(model.type)) {
      errors.push('Model type must be either "local-folder" or "remote-endpoint"');
    }

    // Validate status
    if (!model.status || !['loaded', 'unloaded', 'loading', 'error'].includes(model.status)) {
      errors.push('Model status must be one of: loaded, unloaded, loading, error');
    }

    // Validate adapter
    if (!model.adapter || !['mock', 'lm-studio', 'llama-cpp'].includes(model.adapter)) {
      errors.push('Model adapter must be one of: mock, lm-studio, llama-cpp');
    }

    // Validate contextLength if provided
    if (model.contextLength !== undefined && (typeof model.contextLength !== 'number' || model.contextLength <= 0)) {
      errors.push('Model contextLength must be a positive number if provided');
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Validates an entire configuration object
   * @param config The configuration to validate
   * @returns Validation result with success flag and errors
   */
  static validateConfig(config: unknown): { success: boolean; errors: string[] } {
    const configLike = (config && typeof config === 'object') ? (config as ConfigLike) : {};
    const errors: string[] = [];

    // Validate models array
    if (!configLike.models || !Array.isArray(configLike.models)) {
      errors.push('Configuration must include a "models" array');
    } else {
      // Validate each model
      configLike.models.forEach((model, index: number) => {
        const modelValidation = this.validateModel(asModelLike(model) as Model);
        if (!modelValidation.success) {
          errors.push(`Model at index ${index} is invalid: ${modelValidation.errors.join(', ')}`);
        }
      });
    }

    // Validate optional defaultModel
    if (configLike.defaultModel !== undefined && typeof configLike.defaultModel !== 'string') {
      errors.push('Configuration defaultModel must be a string if provided');
    }

    return {
      success: errors.length === 0,
      errors
    };
  }

  /**
   * Sanitizes a model configuration by removing invalid properties
   * @param model The model to sanitize
   * @returns Sanitized model
   */
  static sanitizeModel(model: unknown): Partial<Model> {
    const modelLike = asModelLike(model);
    const sanitized: Partial<Model> = {};

    // Only copy valid properties
    if (modelLike.id && typeof modelLike.id === 'string') {
      sanitized.id = modelLike.id;
    }

    if (modelLike.name && typeof modelLike.name === 'string') {
      sanitized.name = modelLike.name;
    }

    if (modelLike.pathOrUrl && typeof modelLike.pathOrUrl === 'string') {
      sanitized.pathOrUrl = modelLike.pathOrUrl;
    }

    if (typeof modelLike.type === 'string' && MODEL_TYPES.includes(modelLike.type as Model['type'])) {
      sanitized.type = modelLike.type as Model['type'];
    }

    if (typeof modelLike.status === 'string' && MODEL_STATUSES.includes(modelLike.status as Model['status'])) {
      sanitized.status = modelLike.status as Model['status'];
    }

    if (typeof modelLike.adapter === 'string' && MODEL_ADAPTERS.includes(modelLike.adapter as Model['adapter'])) {
      sanitized.adapter = modelLike.adapter as Model['adapter'];
    }

    if (typeof modelLike.contextLength === 'number' && modelLike.contextLength > 0) {
      sanitized.contextLength = modelLike.contextLength;
    }

    return sanitized;
  }
}
