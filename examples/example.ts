import recommendationEngine from '../src';
import { DataAdapter, Interaction, Product, FeatureValue } from '../src/types';

const mockDataAdapter: DataAdapter = {
  fetchInteractions: async (userId?: string): Promise<Interaction[]> => {
    if (userId === 'user123') {
      return [
        {
          productId: '1',
          interactionType: 'order',
          price: 5000,
          features: { category: 'c1', brand: 'b1' },
          userId,
        },
        {
          productId: '2',
          interactionType: 'wishlist',
          price: 4000,
          features: { category: 'c2', brand: 'b2' },
          userId,
        },
        {
          productId: '3',
          interactionType: 'cart',
          price: 6000,
          features: { category: 'c1', brand: 'b1' },
          userId,
        },
      ];
    }
    if (userId === 'newUser') {
      return []; // No interactions for new user
    }
    if (userId === 'missingFeatures') {
      return [
        {
          productId: '4',
          interactionType: 'order',
          price: 3000,
          features: {}, // Missing features
          userId,
        },
      ];
    }
    return [
      {
        productId: '2',
        interactionType: 'wishlist',
        price: 4000,
        features: { category: 'c2', brand: 'b2' },
        userId,
      },
    ];
  },
  fetchFeatureValues: async (featureKey: string): Promise<FeatureValue[]> => {
    if (featureKey === 'category') {
      return [
        { _id: 'c1', name: 'Action' },
        { _id: 'c2', name: 'RPG' },
        { _id: 'c3', name: 'Puzzle' },
      ];
    }
    if (featureKey === 'brand') {
      return [
        { _id: 'b1', name: 'EA' },
        { _id: 'b2', name: 'Square Enix' },
        { _id: 'b3', name: 'Ubisoft' },
      ];
    }
    return [];
  },
  fetchCandidateProducts: async ({ excludeIds }): Promise<Product[]> => {
    const allProducts: Product[] = [
      {
        _id: '3',
        price: 6000,
        name: 'New Item',
        features: { category: 'c1', brand: 'b3' },
        isActive: true,
      },
      {
        _id: '4',
        price: 4500,
        name: 'Another Item',
        features: { category: 'c2', brand: 'b2' },
        isActive: true,
      },
      {
        _id: '5',
        price: 3000,
        name: 'Popular Item',
        features: { category: 'c1', brand: 'b1' },
        isActive: true,
      },
      {
        _id: '6',
        price: 7000,
        name: 'Premium Item',
        features: { category: 'c3', brand: 'b3' },
        isActive: true,
      },
    ];
    return allProducts.filter((p) => !excludeIds.includes(p._id));
  },
  fetchPopularProducts: async (limit: number): Promise<Product[]> =>
    [
      {
        _id: '5',
        price: 3000,
        name: 'Popular Item',
        features: { category: 'c1', brand: 'b1' },
        isActive: true,
      },
      {
        _id: '6',
        price: 7000,
        name: 'Premium Item',
        features: { category: 'c3', brand: 'b3' },
        isActive: true,
      },
    ].slice(0, limit),
};

const engine = recommendationEngine(mockDataAdapter, {
  features: ['category', 'brand'],
  enableLogging: true,
  modelPath: './models/test-model', // Directory, not file
});

async function runTests() {
  console.log(
    '=== Test 1: Normal Case (user123 with multiple interactions) ==='
  );
  try {
    const recs = await engine.generateRecommendations('user123', 5);
    console.log('Recommendations:', JSON.stringify(recs, null, 2));
  } catch (error) {
    console.error('Test 1 Error:', error);
  }

  console.log('\n=== Test 2: New User (no interactions) ===');
  try {
    const recs = await engine.generateRecommendations('newUser', 5);
    console.log('Recommendations:', JSON.stringify(recs, null, 2));
  } catch (error) {
    console.error('Test 2 Error:', error);
  }

  console.log('\n=== Test 3: Limited Candidates (otherUser) ===');
  try {
    const recs = await engine.generateRecommendations('otherUser', 5);
    console.log('Recommendations:', JSON.stringify(recs, null, 2));
  } catch (error) {
    console.error('Test 3 Error:', error);
  }

  console.log('\n=== Test 4: Missing Features (missingFeatures user) ===');
  try {
    const recs = await engine.generateRecommendations('missingFeatures', 5);
    console.log('Recommendations:', JSON.stringify(recs, null, 2));
  } catch (error) {
    console.error('Test 4 Error:', error);
  }

  console.log('\n=== Test 5: Global Model Training ===');
  try {
    const trained = await engine.trainRecommendationModel();
    console.log('Model trained:', trained);
  } catch (error) {
    console.error('Test 5 Error:', error);
  }

  console.log('\n=== Test 6: Model Loading (user123 after training) ===');
  try {
    const recs = await engine.generateRecommendations('user123', 5);
    console.log('Recommendations:', JSON.stringify(recs, null, 2));
  } catch (error) {
    console.error('Test 6 Error:', error);
  }
}

runTests();
