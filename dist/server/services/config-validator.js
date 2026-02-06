"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigValidator = void 0;
/**
 * Configuration validation service
 * Provides methods to validate configuration objects
 */
class ConfigValidator {
    /**
     * Validates a model configuration
     * @param model The model to validate
     * @returns Validation result with success flag and errors
     */
    static validateModel(model) {
        const errors = [];
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
    static validateConfig(config) {
        const errors = [];
        // Validate models array
        if (!config.models || !Array.isArray(config.models)) {
            errors.push('Configuration must include a "models" array');
        }
        else {
            // Validate each model
            config.models.forEach((model, index) => {
                const modelValidation = this.validateModel(model);
                if (!modelValidation.success) {
                    errors.push(`Model at index ${index} is invalid: ${modelValidation.errors.join(', ')}`);
                }
            });
        }
        // Validate optional defaultModel
        if (config.defaultModel !== undefined && typeof config.defaultModel !== 'string') {
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
    static sanitizeModel(model) {
        const sanitized = {};
        // Only copy valid properties
        if (model.id && typeof model.id === 'string') {
            sanitized.id = model.id;
        }
        if (model.name && typeof model.name === 'string') {
            sanitized.name = model.name;
        }
        if (model.pathOrUrl && typeof model.pathOrUrl === 'string') {
            sanitized.pathOrUrl = model.pathOrUrl;
        }
        if (model.type && ['local-folder', 'remote-endpoint'].includes(model.type)) {
            sanitized.type = model.type;
        }
        if (model.status && ['loaded', 'unloaded', 'loading', 'error'].includes(model.status)) {
            sanitized.status = model.status;
        }
        if (model.adapter && ['mock', 'lm-studio', 'llama-cpp'].includes(model.adapter)) {
            sanitized.adapter = model.adapter;
        }
        if (typeof model.contextLength === 'number' && model.contextLength > 0) {
            sanitized.contextLength = model.contextLength;
        }
        return sanitized;
    }
}
exports.ConfigValidator = ConfigValidator;
//# sourceMappingURL=config-validator.js.map