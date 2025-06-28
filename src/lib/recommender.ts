import * as tf from '@tensorflow/tfjs-node';
import { Recommendation, Config, UserPreferences, DataAdapter } from '../types';
import { preprocessUserData } from './preprocessor';
import { loadModel, createAndTrainModel, saveModel } from './model';
import { getPopularProducts } from './fallback';
import { fetchMappings, getMappingValue } from './data-adapter';

const INTERACTION_WEIGHTS: Record<string, number> = {
  order: 3.0,
  wishlist: 2.0,
  cart: 1.5,
};

export async function generateRecommendations(
  userId: string,
  limit: number = 10,
  config: Config,
  dataAdapter: DataAdapter
): Promise<Recommendation[]> {
  try {
    const userInteractions = await dataAdapter.fetchInteractions(userId);
    if (!userInteractions || userInteractions.length === 0) {
      if (config.enableLogging)
        console.log('No interactions found, returning popular products');
      return await getPopularProducts(limit, dataAdapter);
    }

    const userPreferences: UserPreferences = { features: {} };
    const features = config.features || [];
    features.forEach((featureKey) => {
      userPreferences.features[featureKey] = {};
    });

    let hasValidFeatures = false;
    userInteractions.forEach((interaction) => {
      features.forEach((featureKey) => {
        const featureId =
          typeof interaction.features?.[featureKey] === 'string'
            ? interaction.features?.[featureKey]
            : interaction.features?.[featureKey]?._id?.toString();
        if (featureId) {
          userPreferences.features[featureKey][featureId] =
            (userPreferences.features[featureKey][featureId] || 0) + 1;
          hasValidFeatures = true;
        }
      });
    });

    if (!hasValidFeatures) {
      if (config.enableLogging)
        console.log(
          'No valid features in interactions, returning popular products'
        );
      return await getPopularProducts(limit, dataAdapter);
    }

    const mappings = await fetchMappings(dataAdapter, config);
    const userFeatures = preprocessUserData(userInteractions, mappings, config);

    let model = await loadModel(config);
    if (!model) {
      if (config.enableLogging)
        console.log('No saved model found. Training new model...');
      model = await createAndTrainModel(userFeatures, userInteractions, config);
      if (model) {
        await saveModel(model, config);
      } else {
        if (config.enableLogging)
          console.warn('Failed to train model. Returning popular products.');
        return await getPopularProducts(limit, dataAdapter);
      }
    }

    const interactedProductIds = new Set(
      userInteractions.map((i) => i.productId.toString())
    );
    const featureFilters: Record<string, string[]> = {};
    features.forEach((featureKey) => {
      featureFilters[featureKey] = Object.keys(
        userPreferences.features[featureKey]
      );
    });

    const candidateProducts = await dataAdapter.fetchCandidateProducts({
      excludeIds: Array.from(interactedProductIds),
      featureFilters,
      limit: 100,
    });

    if (candidateProducts.length === 0) {
      if (config.enableLogging)
        console.log('No candidate products found. Returning popular products.');
      return await getPopularProducts(limit, dataAdapter);
    }

    const candidateFeatures = candidateProducts.map((product) => {
      const featureValues = features.map((featureKey) => {
        const featureId =
          typeof product.features?.[featureKey] === 'string'
            ? product.features?.[featureKey]
            : product.features?.[featureKey]?._id;
        const mapping = mappings.featureMappings[featureKey] || {};
        return getMappingValue(mapping, featureId as string | undefined) / 100;
      });

      const totalWeight = userInteractions.reduce(
        (sum, i) => sum + (INTERACTION_WEIGHTS[i.interactionType] || 1.0),
        0
      );
      const avgInteractionWeight = totalWeight / userInteractions.length;

      const normalizePrice = (price: number): number => {
        const minPrice = 100;
        const maxPrice = 10000;
        return Math.min(
          Math.max((price - minPrice) / (maxPrice - minPrice), 0),
          1
        );
      };

      const priceNormal = normalizePrice(product.price || 0);

      return [...featureValues, avgInteractionWeight / 3, priceNormal];
    });

    let predictionValues: Float32Array | Int32Array | Uint8Array;
    try {
      const candidateTensor = tf.tensor2d(candidateFeatures);
      const predictions = model.predict(candidateTensor) as tf.Tensor;
      predictionValues = await predictions.data();
      candidateTensor.dispose();
      predictions.dispose();
    } catch (error) {
      if (config.enableLogging)
        console.error('Error during model prediction:', error);
      return await getPopularProducts(limit, dataAdapter);
    }

    const scoredProducts = candidateProducts.map((product, index) => {
      let score = predictionValues[index];

      features.forEach((featureKey, featureIndex) => {
        const featureId =
          typeof product.features?.[featureKey] === 'string'
            ? product.features?.[featureKey]
            : product.features?.[featureKey]?._id?.toString();
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
  } catch (error) {
    if (config.enableLogging)
      console.error('Error generating recommendations:', error);
    return await getPopularProducts(limit, dataAdapter);
  }
}
