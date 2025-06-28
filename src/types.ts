// Represents a single feature value (e.g., category ID, brand ID, author ID)
interface FeatureValue {
  _id: string;
  name?: string; // Optional for display purposes
}

// Represents a product with dynamic features
interface Product {
  _id: string;
  name?: string;
  price: number;
  features?: Record<string, FeatureValue | string>;
  images?: string[];
  averageRating?: number;
  isActive?: boolean;
}

// Represents a user interaction with a product
interface Interaction {
  productId: string;
  interactionType: 'order' | 'wishlist' | 'cart';
  price: number;
  features?: Record<string, FeatureValue | string>;
  userId?: string;
}

// Defines the data adapter for fetching data
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

// Configuration options for the recommendation engine
interface Config {
  modelPath?: string;
  enableLogging?: boolean;
  features?: string[];
}

// Represents a recommendation output
interface Recommendation {
  product: Product;
  score: number;
  reason?: string;
}

// Mappings for feature values
interface Mappings {
  featureMappings: Record<string, Record<string, number>>;
}

// Tracks user preferences for features
interface UserPreferences {
  features: Record<string, Record<string, number>>;
}

export {
  FeatureValue,
  Product,
  Interaction,
  DataAdapter,
  Config,
  Recommendation,
  Mappings,
  UserPreferences,
};
