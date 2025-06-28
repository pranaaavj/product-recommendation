import { FeatureValue, Mappings, Config, DataAdapter } from '../types.js';

export function createLookupMapping(
  items: FeatureValue[]
): Record<string, number> {
  const mapping: Record<string, number> = {};
  items.forEach((item, index) => {
    mapping[item._id.toString()] = index + 1;
  });
  return mapping;
}

export function getMappingValue(
  mapping: Record<string, number>,
  key: string | undefined,
  fallback: number = 0
): number {
  if (!key) return fallback;
  const stringKey = key.toString();
  return mapping[stringKey] !== undefined ? mapping[stringKey] : fallback;
}

export async function fetchMappings(
  dataAdapter: DataAdapter,
  config: Config
): Promise<Mappings> {
  try {
    const featureMappings: Record<string, Record<string, number>> = {};
    const features = config.features || [];

    for (const featureKey of features) {
      const featureValues = await dataAdapter.fetchFeatureValues(featureKey);
      featureMappings[featureKey] = createLookupMapping(featureValues);
    }

    if (config.enableLogging) {
      console.log(`Fetched mappings for features: ${features.join(', ')}`);
    }

    return { featureMappings };
  } catch (error) {
    if (config.enableLogging) {
      console.error('Error fetching mappings:', error);
    }
    throw error;
  }
}
