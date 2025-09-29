/**
 * Normalizes product data and groups by canonical product (brand + size + type)
 * @param {Array} items - Array of product objects
 * @returns {Array} Array of grouped products with canonical info
 */
export const groupByCanonicalProduct = (items) => {
  if (!items || !Array.isArray(items)) return [];

  const groups = new Map();

  items.forEach(item => {
    // Normalize the product to canonical form
    const canonical = normalizeProduct(item);
    
    // Create a unique key for grouping
    const key = `${canonical.brand}_${canonical.size_g}_${canonical.type}`;
    
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        sample: item, // Use the full item as sample, not just canonical
        items: []
      });
    }
    
    // Add this item to the group
    groups.get(key).items.push(item);
  });

  return Array.from(groups.values());
};

/**
 * Normalizes a product to canonical form {brand, size_g, type}
 * @param {Object} product - Product object
 * @returns {Object} Normalized product with brand, size_g, type
 */
const normalizeProduct = (product) => {
  if (!product) return { brand: 'Unknown', size_g: 0, type: 'Unknown' };

  // Extract brand
  let brand = product.brand || product.brandName || 'Unknown';
  
  // Extract size - try size_g first, then parse from name
  let size_g = product.size_g || product.size || product.weight || 0;
  if (!size_g && product.name) {
    const sizeMatch = product.name.match(/(\d+)\s*g/i);
    if (sizeMatch) {
      size_g = parseInt(sizeMatch[1]);
    }
  }
  
  // Extract type (salted/unsalted)
  let type = product.type || product.variant || 'Salted';
  if (!type || type === 'Unknown') {
    if (product.name) {
      const typeMatch = product.name.match(/unsalted|lightly\s*salted|salted/i);
      if (typeMatch) {
        type = typeMatch[0].toLowerCase();
        if (type.includes('unsalt')) {
          type = 'Unsalted';
        } else if (type.includes('lightly')) {
          type = 'Lightly Salted';
        } else {
          type = 'Salted';
        }
      } else {
        type = 'Salted'; // Default fallback
      }
    } else {
      type = 'Salted'; // Default fallback
    }
  }

  return {
    brand: brand.trim(),
    size_g: parseInt(size_g) || 0,
    type: type.trim()
  };
};
