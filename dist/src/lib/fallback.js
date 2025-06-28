"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPopularProducts = getPopularProducts;
async function getPopularProducts(limit, dataAdapter) {
    try {
        const popularProducts = await dataAdapter.fetchPopularProducts(limit * 2);
        return popularProducts.slice(0, limit).map((product) => ({
            product,
            score: 1.0, // Default score for popular products
            reason: 'Popular Choice',
        }));
    }
    catch (error) {
        console.error('Error fetching popular products:', error);
        return [];
    }
}
//# sourceMappingURL=fallback.js.map