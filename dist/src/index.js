"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = initRecommendationEngine;
const recommender_1 = require("./lib/recommender");
const model_1 = require("./lib/model");
function initRecommendationEngine(dataAdapter, config = { enableLogging: false, features: [] }) {
    return {
        generateRecommendations: (userId, limit = 10) => (0, recommender_1.generateRecommendations)(userId, limit, config, dataAdapter),
        trainRecommendationModel: () => (0, model_1.trainRecommendationModel)(config, dataAdapter),
    };
}
//# sourceMappingURL=index.js.map