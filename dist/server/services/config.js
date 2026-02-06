"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_validator_1 = require("./config-validator");
/** Path to the configuration file */
const CONFIG_PATH = path_1.default.join(process.cwd(), 'config.json');
/** Default configuration used when no config file exists */
const DEFAULT_CONFIG = {
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
/**
 * Service class for managing application configuration
 * Handles loading, saving, and manipulation of model configurations
 */
class ConfigService {
    /** Current configuration object */
    config;
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
    loadConfig() {
        if (!fs_1.default.existsSync(CONFIG_PATH)) {
            try {
                this.saveConfig(DEFAULT_CONFIG);
                return DEFAULT_CONFIG;
            }
            catch (err) {
                console.error("Failed to save default config", err);
                return DEFAULT_CONFIG;
            }
        }
        try {
            const data = fs_1.default.readFileSync(CONFIG_PATH, 'utf-8');
            return JSON.parse(data);
        }
        catch (err) {
            console.error("Failed to load config, using default", err);
            return DEFAULT_CONFIG;
        }
    }
    /**
     * Saves the configuration to the config file
     * @param config The configuration to save
     * @throws Error if saving fails
     */
    saveConfig(config) {
        try {
            fs_1.default.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        }
        catch (error) {
            console.error("Failed to save config", error);
            throw error;
        }
    }
    /**
     * Gets the list of configured models
     * @returns Array of configured models
     */
    getModels() {
        try {
            return this.config.models;
        }
        catch (error) {
            console.error("Error retrieving models", error);
            return [];
        }
    }
    /**
     * Adds a new model to the configuration
     * @param model The model to add
     * @throws Error if the model is invalid or saving fails
     */
    addModel(model) {
        try {
            // Validate model before adding
            const validationResult = config_validator_1.ConfigValidator.validateModel(model);
            if (!validationResult.success) {
                throw new Error(`Invalid model configuration: ${validationResult.errors.join(', ')}`);
            }
            // Avoid duplicates
            if (!this.config.models.find(m => m.id === model.id)) {
                this.config.models.push(model);
                this.saveConfig(this.config);
            }
        }
        catch (error) {
            console.error("Error adding model", error);
            throw error;
        }
    }
    /**
     * Removes a model from the configuration by ID
     * @param id The ID of the model to remove
     * @throws Error if saving fails
     */
    removeModel(id) {
        try {
            this.config.models = this.config.models.filter(m => m.id !== id);
            this.saveConfig(this.config);
        }
        catch (error) {
            console.error("Error removing model", error);
            throw error;
        }
    }
}
exports.ConfigService = ConfigService;
//# sourceMappingURL=config.js.map