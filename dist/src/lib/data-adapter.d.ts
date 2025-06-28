import { FeatureValue, Mappings, Config, DataAdapter } from '../types.js';
export declare function createLookupMapping(items: FeatureValue[]): Record<string, number>;
export declare function getMappingValue(mapping: Record<string, number>, key: string | undefined, fallback?: number): number;
export declare function fetchMappings(dataAdapter: DataAdapter, config: Config): Promise<Mappings>;
