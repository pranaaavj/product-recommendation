"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLookupMapping = createLookupMapping;
exports.getMappingValue = getMappingValue;
exports.fetchMappings = fetchMappings;
function createLookupMapping(items) {
    const mapping = {};
    items.forEach((item, index) => {
        mapping[item._id.toString()] = index + 1;
    });
    return mapping;
}
function getMappingValue(mapping, key, fallback = 0) {
    if (!key)
        return fallback;
    const stringKey = key.toString();
    return mapping[stringKey] !== undefined ? mapping[stringKey] : fallback;
}
async function fetchMappings(dataAdapter, config) {
    try {
        const featureMappings = {};
        const features = config.features || [];
        for (const featureKey of features) {
            const featureValues = await dataAdapter.fetchFeatureValues(featureKey);
            featureMappings[featureKey] = createLookupMapping(featureValues);
        }
        if (config.enableLogging) {
            console.log(`Fetched mappings for features: ${features.join(', ')}`);
        }
        return { featureMappings };
    }
    catch (error) {
        if (config.enableLogging) {
            console.error('Error fetching mappings:', error);
        }
        throw error;
    }
}
//# sourceMappingURL=data-adapter.js.map