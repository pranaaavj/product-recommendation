import { Interaction, Mappings, Config } from '../types.js';
import { getMappingValue } from './data-adapter.js';

const INTERACTION_WEIGHTS: Record<string, number> = {
  order: 3.0,
  wishlist: 2.0,
  cart: 1.5,
};

export function preprocessUserData(
  userInteractions: Interaction[],
  mappings: Mappings,
  config: Config
): number[][] {
  if (!userInteractions || userInteractions.length === 0) {
    if (config.enableLogging)
      console.warn('No user interactions provided for preprocessing');
    return [];
  }

  const features = config.features || [];
  if (config.enableLogging && features.length === 0) {
    console.warn(
      'No features specified in config; using only interactionWeight and price'
    );
  }

  const normalizePrice = (price: number): number => {
    const minPrice = 100;
    const maxPrice = 10000;
    return Math.min(Math.max((price - minPrice) / (maxPrice - minPrice), 0), 1);
  };

  return userInteractions.map((interaction) => {
    const featureValues = features.map((featureKey) => {
      const featureId =
        typeof interaction.features?.[featureKey] === 'string'
          ? interaction.features?.[featureKey]
          : interaction.features?.[featureKey]?._id;
      const mapping = mappings.featureMappings[featureKey] || {};
      return getMappingValue(mapping, featureId as string | undefined) / 100;
    });

    const interactionWeight =
      INTERACTION_WEIGHTS[interaction.interactionType] || 1.0;
    const priceNormal = normalizePrice(interaction.price || 0);

    return [...featureValues, interactionWeight / 3, priceNormal];
  });
}
