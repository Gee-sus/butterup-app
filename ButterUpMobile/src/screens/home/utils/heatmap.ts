import { MAIN_STORES } from "./constants";
import { normalizeStoreName, getBrandDisplayName } from "./helpers";

export const organizeHeatmapData = (items: any[]) => {
  return items
    .map((row) => {
      const prices: { [store: string]: number | null } = {};
      const timestamps: { [store: string]: string | null } = {};

      MAIN_STORES.forEach((store) => {
        prices[store] = null;
        timestamps[store] = null;
      });

      row.stores?.forEach((entry: any) => {
        const storeName = normalizeStoreName(entry.store);
        if (storeName && MAIN_STORES.includes(storeName)) {
          prices[storeName] = entry.price ?? null;
          timestamps[storeName] = entry.recorded_at || null;
        }
      });

      const validPrices = Object.values(prices).filter(
        (value): value is number => value !== null && value !== undefined,
      );

      const brandSource = {
        ...row,
        brand: row.brand || row.brand_name || row.product_brand,
        name_with_brand:
          row.name_with_brand ||
          row.product_name ||
          row.product_display_name ||
          row.name,
        name:
          row.name ||
          row.product_name ||
          row.product_display_name ||
          row.brand_display_name,
      };

      const rawBrandName = getBrandDisplayName(brandSource).trim();
      const brandName = rawBrandName.length > 0 ? rawBrandName : "Unknown Butter";

      const brandImageCandidates = [
        row.brand_image_url,
        row.image_url,
        row.product_image_url,
        row.brand_logo,
        row.brand_logo_url,
      ];

      const brandImage =
        brandImageCandidates.find(
          (value) => typeof value === "string" && value.trim().length > 0,
        ) || null;

      return {
        brandName,
        brandImage,
        prices,
        timestamps,
        lowestPrice:
          row.cheapest_price ??
          (validPrices.length > 0
            ? Math.min(...validPrices)
            : Number.POSITIVE_INFINITY),
        hasAnyPrice: validPrices.length > 0,
      };
    })
    .filter((row) => row.hasAnyPrice);
};

export const getAvailableStores = (items: any[]) => {
  const presentStores = new Set<string>();

  items.forEach((row) => {
    row.stores?.forEach((entry: any) => {
      const storeName = normalizeStoreName(entry.store);
      if (storeName && MAIN_STORES.includes(storeName)) {
        presentStores.add(storeName);
      }
    });
  });

  const orderedStores: string[] = [];

  MAIN_STORES.forEach((store) => {
    if (presentStores.has(store)) {
      orderedStores.push(store);
    }
  });

  MAIN_STORES.forEach((store) => {
    if (!orderedStores.includes(store)) {
      orderedStores.push(store);
    }
  });

  return orderedStores;
};
