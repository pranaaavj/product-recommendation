import { Recommendation, Config, DataAdapter } from '../types';
export declare function generateRecommendations(userId: string, limit: number | undefined, config: Config, dataAdapter: DataAdapter): Promise<Recommendation[]>;
