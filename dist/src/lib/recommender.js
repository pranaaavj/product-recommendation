"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = generateRecommendations;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const preprocessor_1 = require("./preprocessor");
const model_1 = require("./model");
const fallback_1 = require("./fallback");
const data_adapter_1 = require("./data-adapter");
const INTERACTION_WEIGHTS = {
    order: 3.0,
    wishlist: 2.0,
    cart: 1.5,
};
async function generateRecommendations(userId, limit = 10, config, dataAdapter) {
    try {
        const userInteractions = await dataAdapter.fetchInteractions(userId);
        if (!userInteractions || userInteractions.length === 0) {
            if (config.enableLogging)
                console.log('No interactions found, returning popular products');
            return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
        }
        const userPreferences = { features: {} };
        const features = config.features || [];
        features.forEach((featureKey) => {
            userPreferences.features[featureKey] = {};
        });
        let hasValidFeatures = false;
        userInteractions.forEach((interaction) => {
            features.forEach((featureKey) => {
                var _a, _b, _c, _d, _e;
                const featureId = typeof ((_a = interaction.features) === null || _a === void 0 ? void 0 : _a[featureKey]) === 'string'
                    ? (_b = interaction.features) === null || _b === void 0 ? void 0 : _b[featureKey]
                    : (_e = (_d = (_c = interaction.features) === null || _c === void 0 ? void 0 : _c[featureKey]) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString();
                if (featureId) {
                    userPreferences.features[featureKey][featureId] =
                        (userPreferences.features[featureKey][featureId] || 0) + 1;
                    hasValidFeatures = true;
                }
            });
        });
        if (!hasValidFeatures) {
            if (config.enableLogging)
                console.log('No valid features in interactions, returning popular products');
            return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
        }
        const mappings = await (0, data_adapter_1.fetchMappings)(dataAdapter, config);
        const userFeatures = (0, preprocessor_1.preprocessUserData)(userInteractions, mappings, config);
        let model = await (0, model_1.loadModel)(config);
        if (!model) {
            if (config.enableLogging)
                console.log('No saved model found. Training new model...');
            model = await (0, model_1.createAndTrainModel)(userFeatures, userInteractions, config);
            if (model) {
                await (0, model_1.saveModel)(model, config);
            }
            else {
                if (config.enableLogging)
                    console.warn('Failed to train model. Returning popular products.');
                return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
            }
        }
        const interactedProductIds = new Set(userInteractions.map((i) => i.productId.toString()));
        const featureFilters = {};
        features.forEach((featureKey) => {
            featureFilters[featureKey] = Object.keys(userPreferences.features[featureKey]);
        });
        const candidateProducts = await dataAdapter.fetchCandidateProducts({
            excludeIds: Array.from(interactedProductIds),
            featureFilters,
            limit: 100,
        });
        if (candidateProducts.length === 0) {
            if (config.enableLogging)
                console.log('No candidate products found. Returning popular products.');
            return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
        }
        const candidateFeatures = candidateProducts.map((product) => {
            const featureValues = features.map((featureKey) => {
                var _a, _b, _c, _d;
                const featureId = typeof ((_a = product.features) === null || _a === void 0 ? void 0 : _a[featureKey]) === 'string'
                    ? (_b = product.features) === null || _b === void 0 ? void 0 : _b[featureKey]
                    : (_d = (_c = product.features) === null || _c === void 0 ? void 0 : _c[featureKey]) === null || _d === void 0 ? void 0 : _d._id;
                const mapping = mappings.featureMappings[featureKey] || {};
                return (0, data_adapter_1.getMappingValue)(mapping, featureId) / 100;
            });
            const totalWeight = userInteractions.reduce((sum, i) => sum + (INTERACTION_WEIGHTS[i.interactionType] || 1.0), 0);
            const avgInteractionWeight = totalWeight / userInteractions.length;
            const normalizePrice = (price) => {
                const minPrice = 100;
                const maxPrice = 10000;
                return Math.min(Math.max((price - minPrice) / (maxPrice - minPrice), 0), 1);
            };
            const priceNormal = normalizePrice(product.price || 0);
            return [...featureValues, avgInteractionWeight / 3, priceNormal];
        });
        let predictionValues;
        try {
            const candidateTensor = tf.tensor2d(candidateFeatures);
            const predictions = model.predict(candidateTensor);
            predictionValues = await predictions.data();
            candidateTensor.dispose();
            predictions.dispose();
        }
        catch (error) {
            if (config.enableLogging)
                console.error('Error during model prediction:', error);
            return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
        }
        const scoredProducts = candidateProducts.map((product, index) => {
            let score = predictionValues[index];
            features.forEach((featureKey, featureIndex) => {
                var _a, _b, _c, _d, _e;
                const featureId = typeof ((_a = product.features) === null || _a === void 0 ? void 0 : _a[featureKey]) === 'string'
                    ? (_b = product.features) === null || _b === void 0 ? void 0 : _b[featureKey]
                    : (_e = (_d = (_c = product.features) === null || _c === void 0 ? void 0 : _c[featureKey]) === null || _d === void 0 ? void 0 : _d._id) === null || _e === void 0 ? void 0 : _e.toString();
                if (featureId && userPreferences.features[featureKey][featureId]) {
                    const boostFactor = featureIndex === 0 ? 0.5 : 0.3;
                    score *=
                        1 +
                            (userPreferences.features[featureKey][featureId] /
                                userInteractions.length) *
                                boostFactor;
                }
            });
            return { product, score };
        });
        scoredProducts.sort((a, b) => b.score - a.score);
        return scoredProducts.slice(0, limit).map((item) => ({
            product: item.product,
            score: parseFloat(item.score.toFixed(4)),
        }));
    }
    catch (error) {
        if (config.enableLogging)
            console.error('Error generating recommendations:', error);
        return await (0, fallback_1.getPopularProducts)(limit, dataAdapter);
    }
}
//# sourceMappingURL=recommender.js.map