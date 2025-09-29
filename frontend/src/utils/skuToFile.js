/**
 * Maps product data to butter image filenames
 * @param {Object} product - Product object with brand, size_g, type properties
 * @returns {string|null} Filename for the butter image or null if no match
 */
export const skuToFile = (product) => {
  if (!product) return null;

  // Handle both full product objects and canonical objects
  const { brand, size_g, type } = product;

  // Normalize brand for comparison
  const normalizedBrand = brand?.toLowerCase();
  const normalizedType = type?.toLowerCase();
  
  console.log('Mapping product to image:', { brand, size_g, type, normalizedBrand, normalizedType });

  // Determine if salted or unsalted
  const isUnsalted = normalizedType === 'unsalted' || 
                     normalizedType?.includes('unsalt') ||
                     normalizedType === 'lightly salted';

  // Map products to their corresponding image files
  switch (normalizedBrand) {
    case 'anchor':
      if (size_g === 500) {
        // Check for spreadable vs block butter
        if (normalizedType?.includes('spreadable') || normalizedType?.includes('soft') || 
            normalizedType?.includes('whipped') || normalizedType?.includes('light')) {
          return 'anchor_spreadable_500g.png';
        } else if (isUnsalted) {
          return 'anchor_unsalted_500g.png';
        } else {
          return 'anchor_butter_500g.png';
        }
      }
      break;

    case 'mainland':
      if (size_g === 500) {
        // Check for spreadable vs block butter
        if (normalizedType?.includes('spreadable') || normalizedType?.includes('soft') || 
            normalizedType?.includes('whipped') || normalizedType?.includes('light')) {
          return 'mainland_spreadable_500g.png';
        } else if (isUnsalted) {
          return 'mainland_butter_500g_unsalted.png';
        } else {
          return 'mainland_butter_500g_salted.png';
        }
      }
      break;

    case 'lewis road creamery':
    case 'lewis road':
      if (size_g === 250) {
        // Check for cultured butter
        if (normalizedType?.includes('cultured')) {
          return isUnsalted
            ? 'lewis_road_cultured_250g_unsalted.png'
            : 'lewis_road_cultured_250g_salted.png';
        } else {
          return isUnsalted
            ? 'lewis_road_butter_250g_unsalted.png'
            : 'lewis_road_butter_250g_salted.png';
        }
      }
      break;

    case 'organic times':
      if (size_g === 250) {
        return 'organic_times_butter_250g.png';
      }
      break;

    case 'pams':
      if (size_g === 500) {
        return 'pams_butter_500g.png';
      }
      break;

    case 'petit normand':
      if (size_g === 200) {
        return isUnsalted
          ? 'petit_normand_butter_200g_unsalted.png'
          : 'petit_normand_butter_200g_salted.png';
      }
      break;

    // New brands added
    case 'westgold':
      if (size_g === 500) {
        // Check for spreadable vs block butter
        if (normalizedType?.includes('spreadable') || normalizedType?.includes('soft') || 
            normalizedType?.includes('whipped') || normalizedType?.includes('light')) {
          return 'westgold_spreadable_500g.png';
        } else if (isUnsalted) {
          return 'westgold_butter_500g_unsalted.png';
        } else {
          return 'westgold_butter_500g_salted.png';
        }
      }
      break;

    case 'nzmp':
      if (size_g === 500) {
        if (normalizedType?.includes('organic')) {
          return 'nzmp_organic_500g.png';
        } else if (isUnsalted) {
          return 'nzmp_butter_500g_unsalted.png';
        } else {
          return 'nzmp_butter_500g_salted.png';
        }
      }
      break;

    case 'pāmu':
    case 'pamu':
      if (size_g === 500) {
        if (normalizedType?.includes('organic')) {
          return 'pamu_organic_500g.png';
        } else if (isUnsalted) {
          return 'pamu_grassfed_500g_unsalted.png';
        } else {
          return 'pamu_grassfed_500g_salted.png';
        }
      }
      break;

    // Dairy-free alternatives
    case 'nuttelex':
      if (size_g === 500) {
        if (normalizedType?.includes('coconut')) {
          return 'nuttelex_coconut_500g.png';
        } else {
          return 'nuttelex_original_500g.png';
        }
      }
      break;

    case 'olivani':
      if (size_g === 500) {
        return 'olivani_original_500g.png';
      }
      break;

    case 'vutter':
      if (size_g === 265) {
        return 'vutter_original_265g.png';
      }
      break;

    case 'lupark':
      if (size_g === 200) {
        return 'lupark_salted_200g.png';
      }
      break;

    case 'lurpak':
      if (size_g === 200) {
        return 'lurpak_salted_200g.png';
      }
      break;

    case 'rolling meadow':
      if (size_g === 500) {
        return 'rolling_meadow_salted_500g.png';
      }
      break;

    case 'market kitchen':
      if (size_g === 500) {
        return 'market_kitchen_salted_500g.png';
      }
      break;

    case 'woolworths':
      if (size_g === 500) {
        return 'woolworths_salted_500g.png';
      }
      break;

    default:
      break;
  }

  return null;
};

// Available image files for reference:
// Original brands:
// - anchor_butter_500g.png (block butter)
// - anchor_unsalted_500g.png (block butter)
// - anchor_spreadable_500g.png (spreadable butter)
// - mainland_butter_500g_salted.png (block butter)
// - mainland_butter_500g_unsalted.png (block butter)
// - mainland_spreadable_500g.png (spreadable butter)
// - lewis_road_butter_250g_salted.png (block butter)
// - lewis_road_butter_250g_unsalted.png (block butter)
// - lewis_road_cultured_250g_salted.png (block butter)
// - lewis_road_cultured_250g_unsalted.png (block butter)
// - organic_times_butter_250g.png (block butter)
// - pams_butter_500g.png (block butter)
// - petit_normand_butter_200g_salted.png (block butter)
// - petit_normand_butter_200g_unsalted.png (block butter)
// New brands:
// - westgold_butter_500g_salted.png (block butter)
// - westgold_butter_500g_unsalted.png (block butter)
// - westgold_spreadable_500g.png (spreadable butter)
// - nzmp_butter_500g_salted.png (block butter)
// - nzmp_butter_500g_unsalted.png (block butter)
// - nzmp_organic_500g.png (block butter)
// - pamu_grassfed_500g_salted.png (block butter)
// - pamu_grassfed_500g_unsalted.png (block butter)
// - pamu_organic_500g.png (block butter)
// - nuttelex_original_500g.png (dairy-free alternative)
// - nuttelex_coconut_500g.png (dairy-free alternative)
// - olivani_original_500g.png (dairy-free alternative)
// - vutter_original_500g.png (dairy-free alternative)
