import { Config, DataAdapter, Recommendation } from './types';
export default function initRecommendationEngine(dataAdapter: DataAdapter, config?: Config): {
    generateRecommendations: (userId: string, limit?: number) => Promise<Recommendation[]>;
    trainRecommendationModel: () => Promise<boolean>;
};
