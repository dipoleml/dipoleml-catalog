/**
 * Core configuration management for GitGud
 * Platform-agnostic functions for reading and writing configuration
 */

const {
    readConfig: readConfigFromPaths,
    writeConfig: writeConfigToPaths
} = require('../paths');

// Valid configuration keys and their validation rules
const CONFIG_SCHEMA = {
    frequency: {
        type: 'number',
        min: 1,
        max: 100,
        description: 'Requests between tasks'
    },
    daily_skips: {
        type: 'number',
        min: 0,
        max: 10,
        description: 'Max skips per day'
    },
    difficulty: {
        type: 'enum',
        values: ['easy', 'medium', 'hard', 'adaptive'],
        description: 'Task difficulty'
    },
    enabled: {
        type: 'boolean',
        description: 'Plugin active'
    }
};

/**
 * Get configuration
 * @returns {Object} - Configuration object
 */
function getConfig() {
    return readConfigFromPaths();
}

/**
 * Set a configuration value
 * @param {string} key - Configuration key
 * @param {any} value - Value to set
 * @returns {Object} - Result object with success and message
 */
function setConfig(key, value) {
    // Validate key
    if (!CONFIG_SCHEMA[key]) {
        return {
            success: false,
            error: `Unknown setting '${key}'`,
            validKeys: Object.keys(CONFIG_SCHEMA)
        };
    }

    const schema = CONFIG_SCHEMA[key];
    const config = getConfig();

    // Validate and convert value based on type
    switch (schema.type) {
        case 'number':
            const num = parseInt(value);
            if (isNaN(num)) {
                return {
                    success: false,
                    error: `${key} must be a number`
                };
            }
            if (schema.min !== undefined && num < schema.min) {
                return {
                    success: false,
                    error: `${key} must be at least ${schema.min}`
                };
            }
            if (schema.max !== undefined && num > schema.max) {
                return {
                    success: false,
                    error: `${key} must be at most ${schema.max}`
                };
            }
            config[key] = num;
            break;

        case 'enum':
            if (!schema.values.includes(value)) {
                return {
                    success: false,
                    error: `${key} must be one of: ${schema.values.join(', ')}`
                };
            }
            config[key] = value;
            break;

        case 'boolean':
            if (value !== 'true' && value !== 'false' && typeof value !== 'boolean') {
                return {
                    success: false,
                    error: `${key} must be: true or false`
                };
            }
            config[key] = typeof value === 'boolean' ? value : value === 'true';
            break;
    }

    // Save configuration
    writeConfigToPaths(config);

    return {
        success: true,
        key,
        value: config[key],
        message: `${key} set to: ${config[key]}`
    };
}

/**
 * Validate entire configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} - Validation result
 */
function validateConfig(config) {
    const errors = [];

    for (const [key, value] of Object.entries(config)) {
        if (!CONFIG_SCHEMA[key]) {
            errors.push(`Unknown setting: ${key}`);
            continue;
        }

        const schema = CONFIG_SCHEMA[key];

        switch (schema.type) {
            case 'number':
                if (typeof value !== 'number') {
                    errors.push(`${key} must be a number`);
                } else if (schema.min !== undefined && value < schema.min) {
                    errors.push(`${key} must be at least ${schema.min}`);
                } else if (schema.max !== undefined && value > schema.max) {
                    errors.push(`${key} must be at most ${schema.max}`);
                }
                break;

            case 'enum':
                if (!schema.values.includes(value)) {
                    errors.push(`${key} must be one of: ${schema.values.join(', ')}`);
                }
                break;

            case 'boolean':
                if (typeof value !== 'boolean') {
                    errors.push(`${key} must be a boolean`);
                }
                break;
        }
    }

    return {
        valid: errors.length === 0,
        errors
    };
}

/**
 * Get configuration schema
 * @returns {Object} - Configuration schema
 */
function getConfigSchema() {
    return CONFIG_SCHEMA;
}

/**
 * Reset configuration to defaults
 * @returns {Object} - Default configuration
 */
function resetConfig() {
    const defaultConfig = {
        frequency: 10,
        daily_skips: 3,
        difficulty: 'adaptive',
        enabled: true
    };

    writeConfigToPaths(defaultConfig);
    return defaultConfig;
}

module.exports = {
    getConfig,
    setConfig,
    validateConfig,
    getConfigSchema,
    resetConfig
};