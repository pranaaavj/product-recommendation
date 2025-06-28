import * as tf from '@tensorflow/tfjs-node';
import * as path from 'path';
import * as fs from 'fs';
import { Interaction, Config, DataAdapter } from '../types';
import { preprocessUserData } from './preprocessor';
import { fetchMappings } from './data-adapter';

const INTERACTION_WEIGHTS: Record<string, number> = {
  order: 3.0,
  wishlist: 2.0,
  cart: 1.5,
};

export async function createAndTrainModel(
  trainingData: number[][],
  userInteractions: Interaction[],
  config: Config
): Promise<tf.LayersModel | null> {
  try {
    if (!trainingData || trainingData.length === 0) {
      if (config.enableLogging)
        console.warn('No training data available for model');
      return null;
    }

    const inputShape = trainingData[0].length;

    const model = tf.sequential();
    model.add(
      tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [inputShape],
      })
    );
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
    const ys = tf.tensor2d(
      userInteractions.map((interaction) => [
        INTERACTION_WEIGHTS[interaction.interactionType] / 3,
      ])
    );

    await model.fit(xs, ys, {
      epochs: 10,
      batchSize: 32,
      shuffle: true,
      verbose: config.enableLogging ? 1 : 0,
    });

    xs.dispose();
    ys.dispose();

    return model;
  } catch (error) {
    if (config.enableLogging)
      console.error('Error in createAndTrainModel:', error);
    return null;
  }
}

export async function saveModel(
  model: tf.LayersModel | null,
  config: Config
): Promise<void> {
  try {
    if (!model) return;

    const modelDir = path.resolve(
      config.modelPath || './models/recommendation'
    );
    const modelPath = path.join(modelDir, 'model.json');

    if (!fs.existsSync(modelDir)) {
      fs.mkdirSync(modelDir, { recursive: true });
    }

    await model.save(`file://${modelDir}`);
    if (config.enableLogging) console.log(`Model saved to ${modelPath}`);
  } catch (error) {
    if (config.enableLogging) console.error('Error saving model:', error);
  }
}

export async function loadModel(
  config: Config
): Promise<tf.LayersModel | null> {
  try {
    const modelDir = path.resolve(
      config.modelPath || './models/recommendation'
    );
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
  } catch (error) {
    if (config.enableLogging) console.error('Error loading model:', error);
    return null;
  }
}

export async function trainRecommendationModel(
  config: Config,
  dataAdapter: DataAdapter
): Promise<boolean> {
  try {
    if (config.enableLogging) console.log('Starting model training process...');

    const allInteractions = await dataAdapter.fetchInteractions();
    if (!allInteractions || allInteractions.length < 2) {
      if (config.enableLogging)
        console.warn(
          'Insufficient interactions for global training (need at least 2, got',
          allInteractions?.length || 0,
          ')'
        );
      return false;
    }

    const userIds = Array.from(
      new Set(allInteractions.map((i) => i.userId?.toString()).filter(Boolean))
    ) as string[];
    const userIdMapping: Record<string, number> = {};
    userIds.forEach((userId, index) => {
      userIdMapping[userId] = (index + 1) / userIds.length;
    });

    const mappings = await fetchMappings(dataAdapter, config);
    const baseFeatures = preprocessUserData(allInteractions, mappings, config);

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
    model.add(
      tf.layers.dense({
        units: 16,
        activation: 'relu',
        inputShape: [inputShape],
      })
    );
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
  } catch (error) {
    if (config.enableLogging)
      console.error('Error training recommendation model:', error);
    return false;
  }
}
