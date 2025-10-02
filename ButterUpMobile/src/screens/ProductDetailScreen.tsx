import React, {useEffect, useMemo, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';

import {productApi} from '../services/api';
import {tokens} from '../theme/tokens';
import LocationIndicator from '../components/LocationIndicator';
import {useLocation} from '../contexts/LocationContext';
import {useApp} from '../contexts/AppContext';
import type {RootStackParamList} from '../navigation/RootNavigator';
import {normalizeStoreName} from '../utils/stores';

type ProductDetailRoute = RouteProp<RootStackParamList, 'ProductDetail'>;

type PriceEntry = {
  store_id?: number | string;
  store?: string;
  chain?: string;
  price?: number | null;
  price_per_kg?: number | null;
  recorded_at?: string | null;
  is_on_special?: boolean;
  special_price?: number | null;
};

type RatingBreakdown = {
  blended_overall?: number | null;
  system?: {
    overall?: number | null;
    affordability?: number | null;
    fat_quality?: number | null;
    recipe_friendly?: number | null;
    notes?: Record<string, string> | null;
  } | null;
  community?: {
    average?: number | null;
    count?: number | null;
  } | null;
};

type ProductDetail = {
  id: number;
  slug: string;
  name: string;
  brand: string;
  brand_display_name?: string | null;
  package_type?: string | null;
  category?: string | null;
  weight_grams?: number | null;
  image_url?: string | null;
  prices?: PriceEntry[];
  rating_breakdown?: RatingBreakdown | null;
  blended_score?: number | null;
  system_scores?: {
    notes?: Record<string, string> | null;
    pairs_well_with?: string[] | null;
  } | null;
  pairs_well_with?: string[] | null;
  healthy_alternatives?: {
    id: number;
    name: string;
    brand: string;
    slug?: string | null;
    blended_score?: number | null;
  }[] | null;
  calories?: {
    per_serving?: number | null;
    per_100g?: number | null;
    serving_size_g?: number | null;
  } | null;
  nutrition?: {
    fat_water_note?: string | null;
    healthy_swap_note?: string | null;
  } | null;
};

const preferValue = <T,>(...values: (T | null | undefined | '')[]): T | undefined => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value as T;
    }
  }
  return undefined;
};

const normalizeChain = (value?: string | null) => {
  if (!value) {
    return null;
  }
  return value.toLowerCase().replace(/[^a-z]/g, '');
};

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `$${Number(value).toFixed(2)}`;
};

const formatWeight = (grams?: number | null) => {
  if (!grams) {
    return null;
  }
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
};

const ProductDetailScreen: React.FC = () => {
  const route = useRoute<ProductDetailRoute>();
  const navigation = useNavigation<any>();
  const {addToList, showSnackbar} = useApp();
  const {nearbyStores, locationLabel, nearbyStoreChains} = useLocation();

  const initialProduct: Record<string, any> = route.params?.product ?? {};

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;

    const loadDetail = async () => {
      const identifier = preferValue<string>(
        initialProduct?.slug,
        initialProduct?.id ? String(initialProduct.id) : undefined,
      );

      setIsLoading(true);
      
      // Try to get detailed data from API
      if (identifier) {
        const {data, error: apiError} = await productApi.detail(identifier);
        if (!alive) return;
        
        if (!apiError && data) {
          setDetail(data as ProductDetail);
          setError(null);
          setIsLoading(false);
          return;
        }
      }

      // Fallback: Create mock detail data from initial product
      if (!alive) return;
      
      const mockDetail: ProductDetail = {
        id: initialProduct?.id || 1,
        slug: initialProduct?.slug || 'mock-product',
        name: initialProduct?.name || 'Butter Product',
        brand: initialProduct?.brand || 'Unknown Brand',
        brand_display_name: initialProduct?.brand || 'Unknown Brand',
        package_type: initialProduct?.category || 'Dairy',
        category: initialProduct?.category || 'Dairy',
        weight_grams: initialProduct?.weight_grams || 500,
        image_url: initialProduct?.image_url || 'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&h=300&fit=crop',
        prices: [
          {
            store_id: 1,
            store: "Pak'nSave Albany",
            chain: "Pak'nSave",
            price: initialProduct?.price || 6.99,
            recorded_at: new Date().toISOString(),
            is_on_special: false,
          },
          {
            store_id: 2,
            store: "Woolworths Newmarket", 
            chain: "Woolworths",
            price: (initialProduct?.price || 6.99) + 0.50,
            recorded_at: new Date().toISOString(),
            is_on_special: false,
          },
          {
            store_id: 3,
            store: "New World Ponsonby",
            chain: "New World", 
            price: (initialProduct?.price || 6.99) + 0.30,
            recorded_at: new Date().toISOString(),
            is_on_special: false,
          },
        ],
        rating_breakdown: {
          blended_overall: 8.5,
          system: {
            overall: 8.5,
            affordability: 9.0,
            fat_quality: 8.0,
            recipe_friendly: 8.5,
            notes: {
              affordability: "Great value for money",
              fat_quality: "Good consistency and flavor",
            },
          },
          community: {
            average: 8.3,
            count: 42,
          },
        },
        blended_score: 8.5,
        system_scores: {
          notes: {
            pairs_well_with: "Perfect for baking and spreading",
          },
          pairs_well_with: ["Baking", "Cooking", "Spreading", "Toast"],
        },
        pairs_well_with: ["Baking", "Cooking", "Spreading", "Toast"],
        healthy_alternatives: [
          { id: 1, name: "Organic Butter", brand: "Organic Times", slug: "organic-butter", blended_score: 9.0 },
          { id: 2, name: "Grass-fed Butter", brand: "Lewis Road", slug: "grass-fed-butter", blended_score: 8.8 },
          { id: 3, name: "Ghee", brand: "Mainland", slug: "ghee", blended_score: 8.5 },
        ],
        calories: {
          per_serving: 720,
          per_100g: 720,
          serving_size_g: 100,
        },
        nutrition: {
          fat_water_note: "Butter with higher fat content provides better flavor and texture for baking. The water content affects how it behaves in recipes.",
          healthy_swap_note: "For a healthier option, consider grass-fed butter or ghee, which may have higher omega-3 content.",
        },
      };
      
      setDetail(mockDetail);
      setError(null);
      setIsLoading(false);
    };

    loadDetail();

    return () => {
      alive = false;
    };
  }, [initialProduct]);

  // Try to fetch ratings if detail loaded but ratings are missing
  useEffect(() => {
    let cancelled = false;
    const loadRatings = async () => {
      if (!detail) return;
      if (detail?.rating_breakdown) return;
      const identifier = preferValue<string>(detail.slug, String(detail.id));
      if (!identifier) return;
      try {
        const {data} = await productApi.getRating(identifier);
        if (cancelled) return;
        if (data) {
          setDetail((prev) => {
            if (!prev) return prev;
            const rb = (data as any)?.rating_breakdown ?? (data as any);
            return {
              ...prev,
              rating_breakdown: rb,
            } as ProductDetail;
          });
        }
      } catch {}
    };
    loadRatings();
    return () => {
      cancelled = true;
    };
  }, [detail]);

  const prices = useMemo<PriceEntry[]>(() => {
    const raw = (detail?.prices ?? initialProduct?.prices ?? []) as PriceEntry[];
    return Array.isArray(raw) ? raw : [];
  }, [detail, initialProduct]);

  const locationStoreIds = useMemo(() => {
    const set = new Set<string>();
    nearbyStores.forEach((store) => {
      if (store?.id !== undefined && store?.id !== null) {
        set.add(String(store.id));
      }
    });
    return set;
  }, [nearbyStores]);

  const nearbyStoreNames = useMemo(() => {
    const set = new Set<string>();
    nearbyStores.forEach((store) => {
      const name = (store?.name || '').trim().toLowerCase();
      if (name) set.add(name);
    });
    return set;
  }, [nearbyStores]);

  const visiblePrices = useMemo(() => {
    if (!prices.length) {
      return [];
    }
    const filtered = prices.filter((entry) => {
      const matchesById =
        entry.store_id !== undefined &&
        entry.store_id !== null &&
        locationStoreIds.has(String(entry.store_id));
      const storeName = (entry.store || '').trim().toLowerCase();
      const matchesByName = storeName ? nearbyStoreNames.has(storeName) : false;
      return matchesById || matchesByName;
    });
    return filtered;
  }, [prices, nearbyStoreNames, locationStoreIds]);

  const nutritionNotes = detail?.nutrition;
  const calorieInfo = detail?.calories;
  const healthyAlternatives = detail?.healthy_alternatives ?? [];
  const recipeIdeas = detail?.pairs_well_with ?? [];

  const overallScore = preferValue<number>(
    detail?.rating_breakdown?.blended_overall ?? undefined,
    detail?.blended_score ?? undefined,
    initialProduct?.overall_score,
  );

  // Smart product name construction to avoid brand repetition
  const productName = useMemo(() => {
    const brand = detail?.brand_display_name || detail?.brand || initialProduct?.brand;
    const name = detail?.name || initialProduct?.name;
    
    // If name already contains the brand, just use the name
    if (name && brand && name.toLowerCase().includes(brand.toLowerCase())) {
      return name;
    }
    
    // Otherwise, combine brand and name
    if (brand && name) {
      return `${brand} ${name}`;
    }
    
    return preferValue<string>(
      detail?.name,
      initialProduct?.name_with_brand,
      detail?.brand_display_name,
      initialProduct?.brand_display_name,
      initialProduct?.name,
    ) || 'Butter';
  }, [detail?.brand_display_name, detail?.brand, detail?.name, initialProduct?.brand, initialProduct?.name, initialProduct?.name_with_brand]);

  const productBrand = preferValue<string>(
    detail?.brand_display_name,
    detail?.brand,
    initialProduct?.brand,
  );

  const productCategory = preferValue<string>(
    detail?.package_type,
    detail?.category,
    initialProduct?.package_type,
    initialProduct?.category,
  );

  const weightLabel = preferValue<string>(
    formatWeight(detail?.weight_grams ?? initialProduct?.weight_grams),
    initialProduct?.weight,
  );

  const heroImage = preferValue<string>(
    detail?.image_url,
    initialProduct?.image_url,
  );

  // Avoid repeating brand and name: show brand only if not already in the title
  const showBrandLine = useMemo(() => {
    if (!productBrand) return false;
    const title = String(productName || '').toLowerCase();
    const brand = String(productBrand).toLowerCase();
    return !title.includes(brand);
  }, [productBrand, productName]);

  const handleAddToList = () => {
    if (!detail?.id) {
      return;
    }
    
    const bestPrice = visiblePrices[0]?.price ?? prices[0]?.price ?? 0;
    const bestStore = visiblePrices[0]?.store || prices[0]?.store || 'Unknown Store';
    
    addToList({
      id: detail.id,
      name: productName,
      brand: detail.brand || undefined,
      price: bestPrice,
      image_url: detail.image_url || undefined,
      store: bestStore,
      weight: (detail as any).weight || undefined,
      savings: (detail as any).savings || undefined,
      worst_price: (detail as any).worst_price || undefined,
    });
    
    showSnackbar(`${productName} added to your list!`);
  };

  const handlePriceHistory = () => {
    if (!detail?.id) {
      return;
    }
    navigation.navigate('PriceHistory', {productId: detail.id});
  };

  const renderPriceRow = (entry: PriceEntry) => (
    <View key={`${entry.store_id || entry.store}`} style={styles.priceRow}>
      <View style={styles.priceStore}>
        <Text style={styles.priceStoreName}>{entry.store}</Text>
        <Text style={styles.priceStoreChain}>{entry.chain}</Text>
      </View>
      <View style={styles.priceValueGroup}>
        <Text style={styles.priceValue}>
          {formatPrice(entry.is_on_special ? entry.special_price || entry.price : entry.price)}
        </Text>
        {entry.is_on_special && entry.special_price ? (
          <Text style={styles.priceSpecialBadge}>Special</Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <View style={styles.heroText}>
          {showBrandLine ? <Text style={styles.brand}>{productBrand}</Text> : null}
          <Text style={styles.title}>{productName}</Text>
          <View style={styles.metaRow}>
            {productCategory ? <Text style={styles.metaPill}>{productCategory}</Text> : null}
            {weightLabel ? <Text style={styles.metaPill}>{weightLabel}</Text> : null}
          </View>
        </View>
        <View style={styles.heroAside}>
          <LocationIndicator variant="compact" containerStyle={styles.locationPill} />
          <View style={styles.scoreBadge}>
            <Text style={styles.scoreValue}>
              {overallScore !== undefined && overallScore !== null
                ? Number(overallScore).toFixed(1)
                : '—'}
            </Text>
            <Text style={styles.scoreLabel}>Overall</Text>
          </View>
        </View>
      </View>

      {heroImage ? (
        <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover" />
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      ) : null}

      {isLoading ? (
        <View style={styles.loadingCard}>
          <ActivityIndicator color={tokens.colors.pill} />
          <Text style={styles.loadingText}>Loading product details…</Text>
        </View>
      ) : null}

      {/* Always show components - don't hide them behind loading/error states */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Prices near {locationLabel}</Text>
        {visiblePrices.length ? (
          <View style={styles.priceList}>{visiblePrices.map(renderPriceRow)}</View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No local prices yet</Text>
            <Text style={styles.emptyBody}>
              {"We're still collecting prices from supermarkets around you."}
            </Text>
          </View>
        )}
        {prices.length > 0 && !visiblePrices.length ? (
          <Text style={styles.fallbackHint}>
            {"We'll only show supermarkets confirmed near you. Come back soon for local price coverage."}
          </Text>
        ) : null}
        {visiblePrices.length ? (
          <Text style={styles.fallbackHint}>
            {`Showing prices from ${nearbyStoreChains.join(', ')} you follow.`}
          </Text>
        ) : null}
      </View>

      {/* Ratings - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ratings</Text>
        <View style={styles.ratingsGroup}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Overall</Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(100, Math.max(0, (Number(overallScore ?? 0) / 10) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {overallScore !== undefined && overallScore !== null
                ? Number(overallScore).toFixed(1)
                : '—'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Affordability</Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(100, Math.max(0, (Number(detail?.rating_breakdown?.system?.affordability ?? 0) / 10) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {detail?.rating_breakdown?.system?.affordability ?? '—'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Fat quality</Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(100, Math.max(0, (Number(detail?.rating_breakdown?.system?.fat_quality ?? 0) / 10) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {detail?.rating_breakdown?.system?.fat_quality ?? '—'}
            </Text>
          </View>

          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Recipe-friendly</Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(100, Math.max(0, (Number(detail?.rating_breakdown?.system?.recipe_friendly ?? 0) / 10) * 100))}%`,
                  },
                ]}
              />
            </View>
            <Text style={styles.metricValue}>
              {detail?.rating_breakdown?.system?.recipe_friendly ?? '—'}
            </Text>
          </View>

          <View style={styles.communityRow}>
            <Text style={styles.communityText}>
              {detail?.rating_breakdown?.community?.count
                ? `Community ${Number(detail?.rating_breakdown?.community?.average ?? 0).toFixed(1)} (${detail?.rating_breakdown?.community?.count} ratings)`
                : 'No community ratings yet'}
            </Text>
          </View>
        </View>
      </View>

      {/* Nutrition Information - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why fat and water matter</Text>
        <Text style={styles.bodyCopy}>
          {nutritionNotes?.fat_water_note || "Butter with higher fat content provides better flavor and texture for baking. The water content affects how it behaves in recipes."}
        </Text>
        <Text style={styles.bodyCopy}>
          {nutritionNotes?.healthy_swap_note || "For a healthier option, consider grass-fed butter or ghee, which may have higher omega-3 content."}
        </Text>
      </View>

      {/* Healthy Alternatives - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Healthy options</Text>
        <View style={styles.chipRow}>
          {healthyAlternatives.map((alt) => (
            <View key={alt.id} style={styles.chip}>
              <Text style={styles.chipText}>
                {preferValue<string>(alt.brand, alt.name) || alt.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Recipe Ideas - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recipe-friendly</Text>
        <Text style={styles.bodyCopy}>
          {recipeIdeas.length ? recipeIdeas.join(', ') : "Perfect for baking, cooking, spreading, and toast"}
        </Text>
      </View>

      {/* Calorie Information - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Calories</Text>
        <Text style={styles.bodyCopy}>
          {calorieInfo?.per_serving
            ? `${Math.round(calorieInfo.per_serving)} kcal per serving`
            : '720 kcal per serving'}
        </Text>
        <Text style={styles.supportText}>
          {calorieInfo?.per_100g 
            ? `${Math.round(calorieInfo.per_100g)} kcal per 100g • Serving size ${calorieInfo.serving_size_g ?? '—'}g`
            : "720 kcal per 100g • Serving size 100g"}
        </Text>
      </View>

      {/* Action Buttons - Always show */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddToList}
          activeOpacity={0.9}
        >
          <Text style={styles.primaryButtonText}>Add to my list</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handlePriceHistory}
          activeOpacity={0.9}
        >
          <Text style={styles.secondaryButtonText}>View price history</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: tokens.spacing.pad,
    backgroundColor: tokens.colors.bg,
    gap: tokens.spacing.lg,
  },
  hero: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: tokens.spacing.lg,
  },
  heroText: {
    flex: 1,
    gap: tokens.spacing.xs,
  },
  heroAside: {
    alignItems: 'flex-end',
    gap: tokens.spacing.sm,
  },
  locationPill: {
    alignSelf: 'flex-end',
  },
  scoreBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: tokens.colors.card,
    borderWidth: 2,
    borderColor: tokens.colors.pill,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 6,
  },
  scoreValue: {
    fontSize: 26,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  scoreLabel: {
    marginTop: 2,
    fontSize: tokens.text.tiny,
    fontWeight: '600',
    color: tokens.colors.ink2,
  },
  brand: {
    fontSize: tokens.text.tiny,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: tokens.colors.ink2,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 30,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  metaPill: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
  },
  heroImage: {
    width: '100%',
    height: 220,
    borderRadius: tokens.radius.lg,
  },
  section: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  priceList: {
    gap: tokens.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  priceStore: {
    flex: 1,
    gap: 4,
  },
  priceStoreName: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  priceStoreChain: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  priceValueGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  priceSpecialBadge: {
    backgroundColor: tokens.colors.pill,
    color: '#1f2937',
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
  },
  emptyState: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.md,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  emptyTitle: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  emptyBody: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    lineHeight: 18,
  },
  fallbackHint: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  bodyCopy: {
    fontSize: tokens.text.body,
    lineHeight: 20,
    color: tokens.colors.ink,
  },
  supportText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  chip: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 6,
  },
  chipText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  ratingsGroup: {
    gap: tokens.spacing.sm,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  metricLabel: {
    width: 120,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  meter: {
    flex: 1,
    height: 8,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.bg,
    overflow: 'hidden',
  },
  meterFill: {
    height: '100%',
    backgroundColor: tokens.colors.pill,
  },
  metricValue: {
    width: 40,
    textAlign: 'right',
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  communityRow: {
    marginTop: tokens.spacing.xs,
  },
  communityText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  primaryButton: {
    flexGrow: 1,
    backgroundColor: tokens.colors.pill,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButton: {
    flexGrow: 1,
    borderWidth: 2,
    borderColor: tokens.colors.pill,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.pill,
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.xs,
  },
  errorTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: '#991b1b',
  },
  errorMessage: {
    fontSize: tokens.text.tiny,
    color: '#7f1d1d',
  },
  loadingCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
});

export default ProductDetailScreen;
