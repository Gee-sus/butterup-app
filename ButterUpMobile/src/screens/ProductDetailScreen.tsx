import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  Image,
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  PanResponder,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {RouteProp, useNavigation, useRoute} from '@react-navigation/native';

import {productApi} from '../services/api';
// Local design tokens (copied here for readability in this file)
const tokens = {
  radius: { sm: 4, md: 8, lg: 12, xl: 16 },
  spacing: { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, pad: 16 },
  text: { title: 20, h2: 16, body: 14, tiny: 12 },
  colors: {
    bg: '#f8fafc',
    card: '#ffffff',
    ink: '#1f2937',
    ink2: '#6b7280',
    line: '#e2e8f0',
    pill: '#f59e0b',
    accent: '#3b82f6',
    success: '#059669',
    error: '#dc2626',
  },
};
import LocationIndicator from '../components/LocationIndicator';
import {useLocation} from '../contexts/LocationContext';
import {useApp} from '../contexts/AppContext';
import type {RootStackParamList} from '../navigation/RootNavigator';
// removed unused imports

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

// removed unused normalizeChain helper

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `$${Number(value).toFixed(2)}`;
};

const formatTimeAgo = (iso?: string | null) => {
  if (!iso) return '—';
  const updated = new Date(iso);
  if (Number.isNaN(updated.getTime())) return '—';
  const now = new Date();
  const diffMs = now.getTime() - updated.getTime();
  const diffMin = Math.floor(diffMs / (1000 * 60));
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d ago`;
};

const getScoreColor = (score?: number | null) => {
  const s = Number(score ?? 0);
  if (Number.isNaN(s)) return tokens.colors.ink2;
  if (s >= 8.5) return tokens.colors.success;
  if (s >= 7.0) return tokens.colors.pill;
  return tokens.colors.error;
};

const renderStars = (score?: number | null) => {
  const s = Math.max(0, Math.min(10, Number(score ?? 0)));
  const fiveStar = s / 2; // map 0-10 to 0-5
  const full = Math.floor(fiveStar);
  const half = fiveStar - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const nodes: any[] = [];
  for (let i = 0; i < full; i++) nodes.push(<Ionicons key={`fs-${i}`} name="star" size={14} color={tokens.colors.pill} />);
  if (half) nodes.push(<Ionicons key="fs-half" name="star-half" size={14} color={tokens.colors.pill} />);
  for (let i = 0; i < empty; i++) nodes.push(<Ionicons key={`fs-e-${i}`} name="star-outline" size={14} color={tokens.colors.pill} />);
  return <View style={styles.starRow}>{nodes}</View>;
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
  const {addToList, showSnackbar, list} = useApp();
  const {nearbyStores, locationLabel, nearbyStoreChains} = useLocation();
  const insets = useSafeAreaInsets();

  const initialProduct: Record<string, any> = route.params?.product ?? {};

  const [detail, setDetail] = useState<ProductDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [servingsPerWeek, setServingsPerWeek] = useState<number>(7);
  const [rateVisible, setRateVisible] = useState<boolean>(false);
  const [nutriVisible, setNutriVisible] = useState<boolean>(false);
  const [tempRating, setTempRating] = useState<number>(8);
  const [servingG, setServingG] = useState<number>(25);
  const addAnim = useRef(new Animated.Value(0)).current; // 0 = idle, 1 = added

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

  // Is this product already in the user's list?
  const isInList = useMemo(() => {
    if (!detail || !detail.id) return false;
    return list.some((item: any) => item.id === detail.id);
  }, [list, detail?.id]);

  // Minimal three-supermarket pricing (Woolworths, Pak'nSave, New World)
  const simpleChainPrices = useMemo(() => {
    const desired = ["Woolworths", "Pak'nSave", 'New World'];
    const result: { label: string; value: number }[] = [];
    for (let i = 0; i < desired.length; i += 1) {
      const chain = desired[i];
      let minPrice: number | null = null;
      for (let j = 0; j < prices.length; j += 1) {
        const p = prices[j];
        const chainName = (p.chain || '').trim();
        const storeName = (p.store || '').trim();
        // Normalize common aliases
        const normalized = chainName.toLowerCase();
        let matches = false;
        if (chain === "Pak'nSave") {
          matches = normalized === "pak'nsave" || normalized === 'paknsave' || storeName.toLowerCase().includes("pak'nsave") || storeName.toLowerCase().includes('paknsave');
        } else if (chain === 'Woolworths') {
          matches = normalized === 'woolworths' || normalized === 'countdown' || storeName.toLowerCase().includes('woolworths') || storeName.toLowerCase().includes('countdown');
        } else if (chain === 'New World') {
          matches = normalized === 'new world' || normalized === 'new_world' || storeName.toLowerCase().includes('new world');
        }
        if (matches) {
          const priceNum = typeof p.price === 'number' ? p.price : null;
          if (priceNum !== null) {
            if (minPrice === null || priceNum < minPrice) {
              minPrice = priceNum;
            }
          }
        }
      }
      if (minPrice !== null) {
        result.push({ label: chain, value: minPrice });
      }
    }
    return result;
  }, [prices]);

  let cheapestChain: { label: string; value: number } | null = null;
  for (let i = 0; i < simpleChainPrices.length; i += 1) {
    const s = simpleChainPrices[i];
    if (cheapestChain === null) {
      cheapestChain = s;
    } else if (s.value < (cheapestChain as any).value) {
      cheapestChain = s;
    }
  }

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

  // Curious facts (includes nutrition insights); auto-rotate every 2 minutes
  const curiousFacts = useMemo(() => {
    const facts: string[] = [];
    if (nutritionNotes?.fat_water_note) facts.push(nutritionNotes.fat_water_note);
    if (nutritionNotes?.healthy_swap_note) facts.push(nutritionNotes.healthy_swap_note);
    facts.push(
      'In France, high-fat cultured butter is prized for pastries like croissants—fat helps create flaky layers.',
    );
    facts.push(
      'Butter color can vary with a cow’s diet—beta-carotene in grass gives a natural golden hue.',
    );
    facts.push(
      'Clarified butter (ghee) removes milk solids, raising smoke point and changing flavor and shelf life.',
    );
    return facts;
  }, [nutritionNotes?.fat_water_note, nutritionNotes?.healthy_swap_note]);

  const [factIndex, setFactIndex] = useState(0);
  useEffect(() => {
    if (!curiousFacts.length) return;
    const id = setInterval(() => {
      setFactIndex((i) => (i + 1) % curiousFacts.length);
    }, 120000); // rotate every 2 minutes
    return () => clearInterval(id);
  }, [curiousFacts.length]);

  // Swipe to change curious facts
  const factsPan = React.useMemo(() =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8,
      onPanResponderRelease: (_, g) => {
        if (!curiousFacts.length) return;
        if (g.dx <= -24) {
          // next
          setFactIndex((i) => (i + 1) % curiousFacts.length);
        } else if (g.dx >= 24) {
          // prev
          setFactIndex((i) => (i - 1 + curiousFacts.length) % curiousFacts.length);
        }
      },
    })
  , [curiousFacts.length]);

  // Simple community comments preview (could be sourced from API later)
  const communityComments: {id: string; user: string; text: string}[] = [
    { id: 'c1', user: 'Amelia', text: 'Perfect for croissants, flaky and rich.' },
    { id: 'c2', user: 'Noah', text: 'Melts evenly on toast, nice clean taste.' },
  ];

  // Serving-size based calories and exercise equivalents
  const per100 = calorieInfo?.per_100g ?? 720;
  const caloriesForServing = Math.round(per100 * (servingG / 100));
  const METS = { briskWalk: 4.3, running: 9.8, rowing: 7.0, swimming: 6.0 } as const;
  const weightKg = 70;
  const minutesFor = (kcal: number, met: number) => {
    if (!kcal || !met) return 0;
    const mins = Math.round((kcal * 200) / (met * weightKg));
    return mins < 1 ? 1 : mins;
  };
  const walkMin = minutesFor(caloriesForServing, METS.briskWalk);
  const runMin = minutesFor(caloriesForServing, METS.running);
  const rowMin = minutesFor(caloriesForServing, METS.rowing);
  const swimMin = minutesFor(caloriesForServing, METS.swimming);
  const gramsGain = Math.max(0, Math.round((caloriesForServing / 7700) * 1000));

  const overallScore = preferValue<number>(
    detail?.rating_breakdown?.blended_overall ?? undefined,
    detail?.blended_score ?? undefined,
    initialProduct?.overall_score,
  );

  // Simple product name: always "Brand Name" using backend brand+name. Ignore unknown display names.
  const productName = useMemo(() => {
    // Prefer backend brand unless empty. Treat 'Unknown' (case-insensitive) as empty.
    const rawBrand = preferValue<string>(
      detail?.brand,
      initialProduct?.brand,
    ) || '';

    const brand = rawBrand && rawBrand.trim().toLowerCase() !== 'unknown'
      ? rawBrand
      : '';

    const name = preferValue<string>(
      detail?.name,
      initialProduct?.name,
    ) || '';

    let title = '';
    if (brand && name) {
      title = `${brand} ${name}`;
    } else if (brand) {
      title = brand;
    } else if (name) {
      title = name;
    } else {
      title = 'Butter';
    }
    return title;
  }, [detail?.brand, detail?.name, initialProduct?.brand, initialProduct?.name]);

  // productBrand no longer needed since title includes brand

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

  // Brand is included in the title

  const handleAddToList = () => {
    if (!detail?.id) return;
    if (isInList) return;
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
    // animate add button tint
    Animated.sequence([
      Animated.timing(addAnim, { toValue: 1, duration: 220, useNativeDriver: false }),
      Animated.timing(addAnim, { toValue: 0, duration: 180, useNativeDriver: false }),
    ]).start();
  };

  const handlePriceHistory = () => {
    if (!detail?.id) {
      return;
    }
    navigation.navigate('PriceHistory', {productId: detail.id});
  };

  const renderPriceRow = (entry: PriceEntry, isBest: boolean) => (
    <View key={`${entry.store_id || entry.store}`} style={[styles.priceRow, isBest && styles.priceRowBest]}>
      <View style={styles.priceLeft}>
        <View style={[styles.storeAvatar, isBest && styles.storeAvatarBest]}>
          <Text style={styles.storeAvatarText}>{(entry.chain || entry.store || '?').charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.priceStore}>
          <Text style={styles.priceStoreName} numberOfLines={1}>{entry.store}</Text>
          <Text style={styles.priceStoreChain} numberOfLines={1}>
            {entry.chain || '—'} • {formatTimeAgo(entry.recorded_at)}
          </Text>
        </View>
      </View>
      <View style={styles.priceValueGroup}>
        <View style={styles.priceRightTop}>
          {isBest ? <Text style={styles.bestBadge}>Best</Text> : null}
          {entry.is_on_special && entry.special_price ? (
            <Text style={styles.priceSpecialBadge}>Special</Text>
          ) : null}
        </View>
        <Text style={styles.priceValue}>
          {formatPrice(entry.is_on_special ? entry.special_price || entry.price : entry.price)}
        </Text>
      </View>
    </View>
  );

  // Reserve enough space at the bottom so content never hides behind the sticky footer
  const footerReserveSpace = insets.bottom + (tokens.spacing.md + tokens.spacing.lg) + 72;

  return (
    <View style={{flex: 1, backgroundColor: tokens.colors.bg}}>
      <ScrollView contentContainerStyle={[styles.container, {paddingBottom: footerReserveSpace}]} scrollEnabled={!rateVisible && !nutriVisible}> 
      <View style={styles.hero}>
        <View style={styles.heroText}>
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
        <View style={styles.heroImageWrap}>
          <Image source={{uri: heroImage}} style={styles.heroImage} resizeMode="cover" />
          <Animated.View
            style={[
              styles.imageAddBtn,
              {
                backgroundColor: addAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [tokens.colors.pill, '#f59e0b'], // pill to same yellow for flash
                }) as any,
                transform: [
                  {
                    scale: addAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) as any,
                  },
                ],
              },
              isInList && { backgroundColor: tokens.colors.pill },
            ]}
          >
            <TouchableOpacity onPress={handleAddToList} activeOpacity={0.85}>
              <Ionicons name={isInList ? 'checkmark' : 'add'} size={20} color={'#ffffff'} />
            </TouchableOpacity>
          </Animated.View>
        </View>
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

      {/* Minimalist Pricing: three supermarkets only */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pricing</Text>
        {simpleChainPrices.length ? (
          <View style={styles.simplePriceList}>
            {simpleChainPrices.map((s) => {
              const isCheapest = !!(cheapestChain && s.label === cheapestChain.label);
              const rowStyle = [styles.simplePriceRow];
              if (isCheapest) rowStyle.push(styles.simplePriceRowCheapest);
              return (
                <View key={s.label} style={rowStyle}>
                  <Text style={styles.simplePriceLabel}>{s.label}</Text>
                  <Text style={styles.simplePriceValue}>{`$${s.value.toFixed(2)}`}</Text>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyBody}>Prices will appear once loaded</Text>
          </View>
        )}
      </View>

      {/* Ratings - Always show */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ratings</Text>
        <View style={styles.ratingsGroup}>
          <View style={styles.overallRow}>
            {renderStars(overallScore)}
            <Text style={styles.overallValue}>{overallScore !== undefined && overallScore !== null ? Number(overallScore).toFixed(1) : '—'}</Text>
          </View>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Overall</Text>
            <View style={styles.meter}>
              <View
                style={[
                  styles.meterFill,
                  {
                    width: `${Math.min(100, Math.max(0, (Number(overallScore ?? 0) / 10) * 100))}%`,
                    backgroundColor: getScoreColor(overallScore),
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
                    backgroundColor: getScoreColor(detail?.rating_breakdown?.system?.affordability),
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
                    backgroundColor: getScoreColor(detail?.rating_breakdown?.system?.fat_quality),
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
                    backgroundColor: getScoreColor(detail?.rating_breakdown?.system?.recipe_friendly),
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
          <TouchableOpacity style={styles.rateButton} activeOpacity={0.85} onPress={() => setRateVisible(true)}>
            <Text style={styles.rateButtonText}>Rate this butter</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Curious facts */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Curious facts</Text>
        <View {...factsPan.panHandlers}>
          <Text style={styles.bodyCopy}>
            {curiousFacts.length ? curiousFacts[factIndex] : 'Butter is a simple emulsion of fat and water—its balance shapes flavor and texture.'}
          </Text>
        </View>
        <Text style={styles.supportText}>{`Fact ${Math.min(curiousFacts.length, factIndex + 1)} of ${Math.max(1, curiousFacts.length)}`}</Text>
      </View>

    

      {/* Serving size & Calories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Serving size & Calories</Text>
        <View style={styles.compactRow}>
          <View style={styles.compactLeft}>
            <Text style={styles.metaLabel}>Serving</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setServingG(Math.max(5, servingG - 5))}>
                <Ionicons name="remove" size={16} color={tokens.colors.ink} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{servingG}g</Text>
              <TouchableOpacity style={styles.stepperBtn} onPress={() => setServingG(Math.min(200, servingG + 5))}>
                <Ionicons name="add" size={16} color={tokens.colors.ink} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.compactRight}>
            <Text style={styles.supportText}>Calories</Text>
            <Text style={styles.calorieValue}>{caloriesForServing} kcal</Text>
          </View>
        </View>
      </View>

      {/* Exercise equivalents */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Exercise equivalents</Text>
        <View style={styles.inlinePairs}>
          <Text style={styles.bodyCopy}>Brisk walk: {walkMin} min</Text>
          <Text style={styles.bodyCopy}>Running: {runMin} min</Text>
        </View>
        <View style={styles.inlinePairs}>
          <Text style={styles.bodyCopy}>Rowing: {rowMin} min</Text>
          <Text style={styles.bodyCopy}>Swimming: {swimMin} min</Text>
        </View>
      </View>

      {/* Potential weight gain */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Potential weight gain</Text>
        <Text style={styles.bodyCopy}>{`~${gramsGain} g (rough estimate)`}</Text>
        <Text style={styles.supportText}>Assumes 7,700 kcal ≈ 1 kg body fat</Text>
      </View>

      {/* Removed old weekly calories planner in favor of serving-size based info */}

      {/* Community highlights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What people are saying</Text>
        <View style={{gap: tokens.spacing.sm}}>
          {communityComments.map((c) => (
            <View key={c.id} style={styles.commentRow}>
              <View style={styles.commentAvatar}><Text style={styles.commentAvatarText}>{c.user.charAt(0)}</Text></View>
              <View style={{flex: 1}}>
                <Text style={styles.commentUser}>{c.user}</Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      

      </ScrollView>

      {/* Sticky safe-area footer actions */}
      <View style={[styles.footerBar, {paddingBottom: insets.bottom + tokens.spacing.sm}]}> 
        <View style={styles.footerActions}>
          <TouchableOpacity style={styles.secondaryButton} onPress={handlePriceHistory} activeOpacity={0.9}>
            <Text style={styles.secondaryButtonText}>View price history</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tertiaryButton} onPress={() => setNutriVisible(true)} activeOpacity={0.9}>
            <Ionicons name="nutrition-outline" size={16} color={tokens.colors.pill} />
            <Text style={styles.tertiaryButtonText}>Nutrients</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Rating Modal */}
      {rateVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Rate this butter</Text>
            <StarSwipePicker
              value={tempRating}
              onChange={setTempRating}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setRateVisible(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => setRateVisible(false)}><Text style={styles.modalConfirmText}>Submit</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Nutrition Info Modal */}
      {nutriVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>Nutrient info</Text>
            <Text style={styles.bodyCopy}>Per 100g: {Math.round(per100)} kcal</Text>
            <Text style={styles.supportText}>Serving size: {servingG}g • Calories for serving: {caloriesForServing} kcal</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalConfirm} onPress={() => setNutriVisible(false)}><Text style={styles.modalConfirmText}>Close</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
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
  heroImageWrap: {
    position: 'relative',
  },
  imageAddBtn: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.pill, // yellow, matches Popular Picks tint
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
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
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    gap: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  priceRowBest: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: tokens.colors.pill,
  },
  priceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: tokens.spacing.sm,
    minWidth: 0,
  },
  storeAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storeAvatarBest: {
    backgroundColor: tokens.colors.pill,
    borderColor: tokens.colors.pill,
  },
  storeAvatarText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  priceStore: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  priceStoreName: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    maxWidth: '100%',
  },
  priceStoreChain: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    maxWidth: '100%',
  },
  priceValueGroup: {
    alignItems: 'flex-end',
    gap: 6,
  },
  priceRightTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  priceValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  bestBadge: {
    backgroundColor: tokens.colors.pill,
    color: '#ffffff',
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    paddingHorizontal: tokens.spacing.xs,
    paddingVertical: 2,
    borderRadius: tokens.radius.sm,
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
  caloriePlanner: {
    marginTop: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },
  metaLabel: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  stepperBtn: {
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radius.md,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 6,
  },
  stepperValue: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '700',
  },
  impactCard: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    gap: 4,
  },
  commentRow: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    alignItems: 'flex-start',
  },
  commentAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commentAvatarText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  commentUser: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  commentText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  // removed unused actions style
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
    paddingHorizontal: tokens.spacing.pad,
    paddingTop: tokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 10,
  },
  footerActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    alignItems: 'stretch',
  },
  tertiaryButton: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  tertiaryButtonText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.pill,
  },
  modalOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.pad,
  },
  modalCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.md,
    width: '100%',
  },
  // removed unused starPicker style
  starSwipeBar: {
    alignSelf: 'stretch',
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.md,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  modalActions: {
    flexDirection: 'row',
    gap: tokens.spacing.sm,
    justifyContent: 'flex-end',
  },
  modalCancel: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  modalCancelText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink,
    fontWeight: '700',
  },
  modalConfirm: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.pill,
  },
  modalConfirmText: {
    fontSize: tokens.text.tiny,
    color: '#ffffff',
    fontWeight: '700',
  },
  ratingsGroup: {
    gap: tokens.spacing.sm,
  },
  overallRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacing.xs,
  },
  starRow: {
    flexDirection: 'row',
    gap: 2,
  },
  overallValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
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
  rateButton: {
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    backgroundColor: tokens.colors.card,
  },
  rateButtonText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  // removed unused primary button styles
  secondaryButton: {
    flexGrow: 1,
    borderWidth: 2,
    borderColor: tokens.colors.pill,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.pill,
  },
  simplePriceList: {
    gap: tokens.spacing.sm,
  },
  simplePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  simplePriceRowCheapest: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  simplePriceLabel: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '600',
  },
  simplePriceValue: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '700',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  },
  compactLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  compactRight: {
    alignItems: 'flex-end',
  },
  inlinePairs: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calorieValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
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

// Swipeable star picker with half-star precision (maps to 0-10 scale)
const StarSwipePicker: React.FC<{value: number; onChange: (v: number) => void}> = ({value, onChange}) => {
  const [width, setWidth] = useState<number>(0);
  const widthRef = React.useRef(0);
  useEffect(() => { widthRef.current = width; }, [width]);

  const computeFromX = (x: number) => {
    if (width <= 0) return 0;
    const clamped = Math.max(0, Math.min(width, x));
    const ratio = clamped / width; // 0..1 across 5 stars
    const stars = ratio * 5; // 0..5
    // snap to nearest 0.5 star
    const snapped = Math.round(stars * 2) / 2;
    return Math.max(0, Math.min(10, snapped * 2)); // return as 0..10
  };

  const pan = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onStartShouldSetPanResponderCapture: () => true,
    onMoveShouldSetPanResponderCapture: () => true,
    onPanResponderGrant: (evt) => {
      const x = evt.nativeEvent.locationX;
      onChange(computeFromX(x));
    },
    onPanResponderMove: (evt) => {
      const x = evt.nativeEvent.locationX;
      onChange(computeFromX(x));
    },
    onPanResponderRelease: (evt) => {
      const x = evt.nativeEvent.locationX;
      onChange(computeFromX(x));
    },
    onShouldBlockNativeResponder: () => true,
    onPanResponderTerminationRequest: () => false,
  });

  const stars = value / 2;
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;

  return (
    <View
      style={styles.starSwipeBar}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      {...pan.panHandlers}
    >
      <TouchableWithoutFeedback onPress={(e) => {
        const x = (e.nativeEvent as any).locationX ?? 0;
        onChange(computeFromX(x));
      }}>
        <View pointerEvents="none" style={styles.starRow}>
          {[...Array(full)].map((_, i) => (
            <Ionicons key={`s-f-${i}`} name="star" size={28} color={tokens.colors.pill} />
          ))}
          {half ? <Ionicons key="s-h" name="star-half" size={28} color={tokens.colors.pill} /> : null}
          {[...Array(empty)].map((_, i) => (
            <Ionicons key={`s-e-${i}`} name="star-outline" size={28} color={tokens.colors.pill} />
          ))}
        </View>
      </TouchableWithoutFeedback>
    </View>
  );
};
