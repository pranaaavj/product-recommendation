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
exports.createAndTrainModel = createAndTrainModel;
exports.saveModel = saveModel;
exports.loadModel = loadModel;
exports.trainRecommendationModel = trainRecommendationModel;
const tf = __importStar(require("@tensorflow/tfjs-node"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const preprocessor_1 = require("./preprocessor");
const data_adapter_1 = require("./data-adapter");
const INTERACTION_WEIGHTS = {
    order: 3.0,
    wishlist: 2.0,
    cart: 1.5,
};
async function createAndTrainModel(trainingData, userInteractions, config) {
    try {
        if (!trainingData || trainingData.length === 0) {
            if (config.enableLogging)
                console.warn('No training data available for model');
            return null;
        }
        const inputShape = trainingData[0].length;
        const model = tf.sequential();
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu',
            inputShape: [inputShape],
        }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
        });
        if (config.enableLogging) {
            console.log('Model created:');
            model.summary();
        }
        const xs = tf.tensor2d(trainingData);
        const ys = tf.tensor2d(userInteractions.map((interaction) => [
            INTERACTION_WEIGHTS[interaction.interactionType] / 3,
        ]));
        await model.fit(xs, ys, {
            epochs: 10,
            batchSize: 32,
            shuffle: true,
            verbose: config.enableLogging ? 1 : 0,
        });
        xs.dispose();
        ys.dispose();
        return model;
    }
    catch (error) {
        if (config.enableLogging)
            console.error('Error in createAndTrainModel:', error);
        return null;
    }
}
async function saveModel(model, config) {
    try {
        if (!model)
            return;
        const modelDir = path.resolve(config.modelPath || './models/recommendation');
        const modelPath = path.join(modelDir, 'model.json');
        if (!fs.existsSync(modelDir)) {
            fs.mkdirSync(modelDir, { recursive: true });
        }
        await model.save(`file://${modelDir}`);
        if (config.enableLogging)
            console.log(`Model saved to ${modelPath}`);
    }
    catch (error) {
        if (config.enableLogging)
            console.error('Error saving model:', error);
    }
}
async function loadModel(config) {
    try {
        const modelDir = path.resolve(config.modelPath || './models/recommendation');
        const modelPath = path.join(modelDir, 'model.json');
        if (!fs.existsSync(modelPath)) {
            if (config.enableLogging)
                console.log('No saved model found at', modelPath);
            return null;
        }
        const model = await tf.loadLayersModel(`file://${modelPath}`);
        if (config.enableLogging)
            console.log('Model loaded successfully from', modelPath);
        return model;
    }
    catch (error) {
        if (config.enableLogging)
            console.error('Error loading model:', error);
        return null;
    }
}
async function trainRecommendationModel(config, dataAdapter) {
    try {
        if (config.enableLogging)
            console.log('Starting model training process...');
        const allInteractions = await dataAdapter.fetchInteractions();
        if (!allInteractions || allInteractions.length < 2) {
            if (config.enableLogging)
                console.warn('Insufficient interactions for global training (need at least 2, got', (allInteractions === null || allInteractions === void 0 ? void 0 : allInteractions.length) || 0, ')');
            return false;
        }
        const userIds = Array.from(new Set(allInteractions.map((i) => { var _a; return (_a = i.userId) === null || _a === void 0 ? void 0 : _a.toString(); }).filter(Boolean)));
        const userIdMapping = {};
        userIds.forEach((userId, index) => {
            userIdMapping[userId] = (index + 1) / userIds.length;
        });
        const mappings = await (0, data_adapter_1.fetchMappings)(dataAdapter, config);
        const baseFeatures = (0, preprocessor_1.preprocessUserData)(allInteractions, mappings, config);
        const features = baseFeatures.map((feature, index) => {
            const interaction = allInteractions[index];
            const userFeature = interaction.userId
                ? userIdMapping[interaction.userId] || 0
                : 0;
            return [...feature, userFeature];
        });
        if (config.enableLogging)
            console.log(`Prepared ${features.length} interactions for training`);
        const targets = allInteractions.map((interaction) => [
            INTERACTION_WEIGHTS[interaction.interactionType] / 3,
        ]);
        const model = tf.sequential();
        const inputShape = features[0].length;
        model.add(tf.layers.dense({
            units: 16,
            activation: 'relu',
            inputShape: [inputShape],
        }));
        model.add(tf.layers.dense({ units: 1, activation: 'sigmoid' }));
        model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
        });
        const xs = tf.tensor2d(features);
        const ys = tf.tensor2d(targets);
        await model.fit(xs, ys, {
            epochs: 10,
            batchSize: 32,
            validationSplit: allInteractions.length >= 5 ? 0.2 : 0, // Disable validation for small datasets
            shuffle: true,
            verbose: config.enableLogging ? 1 : 0,
        });
        xs.dispose();
        ys.dispose();
        await saveModel(model, config);
        if (config.enableLogging)
            console.log('Model training completed and model saved');
        return true;
    }
    catch (error) {
        if (config.enableLogging)
            console.error('Error training recommendation model:', error);
        return false;
    }
}
//# sourceMappingURL=model.js.map