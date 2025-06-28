import { generateRecommendations } from './lib/recommender';
import { trainRecommendationModel } from './lib/model';
import { Config, DataAdapter, Recommendation } from './types';

export default function initRecommendationEngine(
  dataAdapter: DataAdapter,
  config: Config = { enableLogging: false, features: [] }
): {
  generateRecommendations: (
    userId: string,
    limit?: number
  ) => Promise<Recommendation[]>;
  trainRecommendationModel: () => Promise<boolean>;
} {
  return {
    generateRecommendations: (userId: string, limit: number = 10) =>
      generateRecommendations(userId, limit, config, dataAdapter),
    trainRecommendationModel: () =>
      trainRecommendationModel(config, dataAdapter),
  };
}
