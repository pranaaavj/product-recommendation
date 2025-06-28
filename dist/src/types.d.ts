interface FeatureValue {
    _id: string;
    name?: string;
}
interface Product {
    _id: string;
    name?: string;
    price: number;
    features?: Record<string, FeatureValue | string>;
    images?: string[];
    averageRating?: number;
    isActive?: boolean;
}
interface Interaction {
    productId: string;
    interactionType: 'order' | 'wishlist' | 'cart';
    price: number;
    features?: Record<string, FeatureValue | string>;
    userId?: string;
}
interface DataAdapter {
    fetchInteractions: (userId?: string) => Promise<Interaction[]>;
    fetchFeatureValues: (featureKey: string) => Promise<FeatureValue[]>;
    fetchCandidateProducts: (filters: {
        excludeIds: string[];
        featureFilters: Record<string, string[]>;
        limit: number;
    }) => Promise<Product[]>;
    fetchPopularProducts: (limit: number) => Promise<Product[]>;
}
interface Config {
    modelPath?: string;
    enableLogging?: boolean;
    features?: string[];
}
interface Recommendation {
    product: Product;
    score: number;
    reason?: string;
}
interface Mappings {
    featureMappings: Record<string, Record<string, number>>;
}
interface UserPreferences {
    features: Record<string, Record<string, number>>;
}
export { FeatureValue, Product, Interaction, DataAdapter, Config, Recommendation, Mappings, UserPreferences, };
