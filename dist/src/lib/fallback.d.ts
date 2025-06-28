import { Recommendation, DataAdapter } from '../types.js';
export declare function getPopularProducts(limit: number, dataAdapter: DataAdapter): Promise<Recommendation[]>;
