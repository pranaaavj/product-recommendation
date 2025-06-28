"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preprocessUserData = preprocessUserData;
const data_adapter_js_1 = require("./data-adapter.js");
const INTERACTION_WEIGHTS = {
    order: 3.0,
    wishlist: 2.0,
    cart: 1.5,
};
function preprocessUserData(userInteractions, mappings, config) {
    if (!userInteractions || userInteractions.length === 0) {
        if (config.enableLogging)
            console.warn('No user interactions provided for preprocessing');
        return [];
    }
    const features = config.features || [];
    if (config.enableLogging && features.length === 0) {
        console.warn('No features specified in config; using only interactionWeight and price');
    }
    const normalizePrice = (price) => {
        const minPrice = 100;
        const maxPrice = 10000;
        return Math.min(Math.max((price - minPrice) / (maxPrice - minPrice), 0), 1);
    };
    return userInteractions.map((interaction) => {
        const featureValues = features.map((featureKey) => {
            var _a, _b, _c, _d;
            const featureId = typeof ((_a = interaction.features) === null || _a === void 0 ? void 0 : _a[featureKey]) === 'string'
                ? (_b = interaction.features) === null || _b === void 0 ? void 0 : _b[featureKey]
                : (_d = (_c = interaction.features) === null || _c === void 0 ? void 0 : _c[featureKey]) === null || _d === void 0 ? void 0 : _d._id;
            const mapping = mappings.featureMappings[featureKey] || {};
            return (0, data_adapter_js_1.getMappingValue)(mapping, featureId) / 100;
        });
        const interactionWeight = INTERACTION_WEIGHTS[interaction.interactionType] || 1.0;
        const priceNormal = normalizePrice(interaction.price || 0);
        return [...featureValues, interactionWeight / 3, priceNormal];
    });
}
//# sourceMappingURL=preprocessor.js.map