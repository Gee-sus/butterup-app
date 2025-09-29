/**
 * Normalize a string (lowercase, replace spaces with underscores)
 * @param {string} s - String to normalize
 * @returns {string} Normalized string
 */
export const norm = (s) => {
  if (!s) return '';
  return s.toLowerCase().replace(/\s+/g, '_');
};

/**
 * Capitalize words in a string
 * @param {string} s - String to capitalize
 * @returns {string} String with capitalized words
 */
export const capitalizeWords = (s) => {
  if (!s) return '';
  return s.replace(/\b\w/g, l => l.toUpperCase());
};

/**
 * Parse a slug into product components
 * @param {string} key - Slug like "anchor_500_salted"
 * @returns {Object} Object with brand, size_g, type, name properties
 */
export const parseSlug = (key) => {
  if (!key) return null;
  
  const parts = key.split('_');
  if (parts.length < 3) return null;
  
  // Extract size_g (should be the second part)
  const sizeMatch = parts[1].match(/(\d+)/);
  const size_g = sizeMatch ? parseInt(sizeMatch[1]) : null;
  
  // Determine if unsalted
  const isUnsalted = parts.includes('unsalted') || 
                     key.includes('unsalt') ||
                     key.includes('lightly_salted');
  
  const type = isUnsalted ? 'Unsalted' : 'Salted';
  
  // Extract brand (everything before size, capitalize words)
  const brandPart = parts[0];
  const brand = capitalizeWords(brandPart);
  
  // Generate name
  const name = `${brand} Butter ${size_g}g`;
  
  return {
    brand,
    size_g,
    type,
    name
  };
};

/**
 * Generate a slug from product data
 * @param {Object} product - Product object with brand, size_g, type properties
 * @returns {string} Slug in format brand_size_g_type
 */
export const slugFromProduct = (product) => {
  if (!product) return null;

  const { brand, size_g, type } = product;
  
  if (!brand || !size_g || !type) return null;

  // Normalize brand (replace spaces with underscores, lowercase)
  const normalizedBrand = brand.toLowerCase().replace(/\s+/g, '_');
  
  // Normalize type (replace spaces with underscores, lowercase)
  const normalizedType = type.toLowerCase().replace(/\s+/g, '_');
  
  // Determine if unsalted
  const isUnsalted = normalizedType === 'unsalted' || 
                     normalizedType.includes('unsalt') ||
                     normalizedType === 'lightly_salted';
  
  const saltStatus = isUnsalted ? 'unsalted' : 'salted';
  
  return `${normalizedBrand}_${size_g}_${saltStatus}`;
};
