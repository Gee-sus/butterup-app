import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { productApi } from '../services/api';
import { tokens } from '../theme/tokens';
import LocationIndicator from '../components/LocationIndicator';
import SwipeableProductCard from '../components/SwipeableProductCard';
import { normalizeStoreName, MAIN_STORES } from '../utils/stores';

const STORES = MAIN_STORES;

interface StorePrice {
  store: string;
  price: number | null;
  recorded_at?: string | null;
}

interface QuickCompareRow {
  id?: string | number;
  name?: string;
  brand?: string;
  brand_name?: string;
  brand_display_name?: string;
  name_with_brand?: string;
  package_size?: string;
  weight?: string;
  product_size?: string;
  stores?: StorePrice[];
  [key: string]: any;
}

interface GridStoreCell {
  price: number | null;
  annualCost: number | null;
  isBest: boolean;
}

interface GridRow {
  key: string;
  brandName: string;
  packageSize: string | null;
  storeCells: Record<string, GridStoreCell>;
  bestPrice: number | null;
  imageUrl?: string | null;
  originalRow: QuickCompareRow;
}

// normalizeStoreName is now imported from utils/stores

const formatAnnualCost = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '—';
  return `$${Math.round(value)}/yr`;
};

// Prefer the first non-empty, non-"Unknown" label
const preferLabel = (...values: Array<string | undefined | null>) => {
  for (const v of values) {
    const s = (v ?? '').toString().trim();
    if (!s) continue;
    const lower = s.toLowerCase();
    if (lower === 'unknown' || lower === 'unknown butter') continue;
    return s;
  }
  return undefined;
};

const getBrandDisplayName = (row: QuickCompareRow) => {
  // Get the most complete name available
  const fullName = preferLabel(row.name_with_brand, row.name);
  const brand = preferLabel(row.brand_display_name, row.brand_name, row.brand);
  
  // If we have a full name, use it; otherwise combine brand + name
  let displayName = fullName || brand || 'Butter';
  
  // Don't append size if it's already in the name
  const size = preferLabel(row.package_size, row.weight, row.product_size);
  if (size && !displayName.includes(size)) {
    displayName = `${displayName} ${size}`;
  }
  
  return displayName;
};

export default function ExploreScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const headerMargin = insets.top + tokens.spacing.md;
  const isLandscape = width > height;

  const [blocksPerWeek, setBlocksPerWeek] = useState<number>(1);
  const [rows, setRows] = useState<QuickCompareRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsightKey, setSelectedInsightKey] = useState<string | null>(null);
  const [swipeProducts, setSwipeProducts] = useState<any[]>([]);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [currentStoreRank, setCurrentStoreRank] = useState<number>(0);

  useEffect(() => {
    loadQuickCompare();
  }, []);

  const loadQuickCompare = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productApi.quickCompare();
      const data = Array.isArray(response?.data) ? response.data : [];
      setRows(data);
      if (data.length > 0) {
        const defaultKey = String(data[0].id ?? data[0].brand_display_name ?? data[0].name ?? 0);
        setSelectedInsightKey(defaultKey);
        loadSwipeProducts(data, 0);
      }
    } catch (err) {
      console.error('Failed to load quick compare data', err);
      setError('Unable to load price comparison data right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSwipeProducts = (data: QuickCompareRow[], storeRank: number) => {
    // Find cheapest store for each product
    const rankedStores = STORES.map(store => {
      const totalPrice = data.reduce((sum, row) => {
        const storeEntry = row.stores?.find(s => normalizeStoreName(s.store) === store);
        return sum + (storeEntry?.price || 0);
      }, 0);
      return { store, totalPrice };
    }).sort((a, b) => a.totalPrice - b.totalPrice);

    if (storeRank >= rankedStores.length) return;

    const targetStore = rankedStores[storeRank].store;
    
    // Get top 4 products from this store
    const products = data
      .map(row => {
        const storeEntry = row.stores?.find(s => normalizeStoreName(s.store) === targetStore);
        if (!storeEntry || !storeEntry.price) return null;
        
        const name = getBrandDisplayName(row);
        const brand = preferLabel(row.brand, row.brand_name, row.brand_display_name);
        
        // Only show brand separately if it's not already in the name
        const showBrand = brand && !name.toLowerCase().includes(brand.toLowerCase());

        return {
          id: row.id || name,
          name,
          brand: showBrand ? brand : undefined,
          image_url: row.image_url || row.brand_image_url,
          price: storeEntry.price,
          store: targetStore,
          rating: (row as any).blended_score || (row as any).rating || 8.5,
        };
      })
      .filter(p => p !== null)
      // Deterministic ordering: cheapest first, then name
      .sort((a: any, b: any) => {
        const priceDiff = (a.price ?? Infinity) - (b.price ?? Infinity);
        if (priceDiff !== 0) return priceDiff;
        return String(a.name).localeCompare(String(b.name));
      })
      .slice(0, 4);

    setSwipeProducts(products);
    setCurrentCardIndex(0);
    setCurrentStoreRank(storeRank);
  };

  const handleSwipeLeft = () => {
    // Skip card - move to next
    setCurrentCardIndex(prev => prev + 1);
  };

  const handleSwipeRight = () => {
    // View more - navigate to product detail
    const product = swipeProducts[currentCardIndex];
    if (product && !product.isShowMore) {
      navigation.navigate('ProductDetail', { product });
    } else {
      // Show more - load next store's products
      loadSwipeProducts(rows, currentStoreRank + 1);
    }
    setCurrentCardIndex(prev => prev + 1);
  };

  const adjustBlocksPerWeek = (delta: number) => {
    setBlocksPerWeek((prev) => {
      const next = Math.max(0.25, Math.min(14, prev + delta));
      return Math.round(next * 100) / 100;
    });
  };

  const gridRows: GridRow[] = useMemo(() => {
    return rows.slice(0, 10).map((row, index) => {
      const brandName = getBrandDisplayName(row).trim() || 'Unknown Butter';
      const key = String(row.id ?? `${brandName}-${index}`);
      const packageSize =
        row.package_size || row.weight || row.product_size || row.size || null;

      const storeCells: Record<string, GridStoreCell> = {};
      const prices: Record<string, number | null> = {};

      STORES.forEach((store) => {
        prices[store] = null;
      });

      row.stores?.forEach((entry) => {
        const storeName = normalizeStoreName(entry.store);
        if (!storeName) return;
        if (!STORES.includes(storeName as any)) return;
        const price = entry.price ?? null;
        prices[storeName as keyof typeof prices] = price !== null && Number.isFinite(price) ? Number(price) : null;
      });

      const availablePrices = Object.values(prices).filter(
        (value): value is number => value !== null && Number.isFinite(value),
      );
      const bestPrice =
        availablePrices.length > 0 ? Math.min(...availablePrices) : null;

      STORES.forEach((store) => {
        const price = prices[store];
        const annualCost = price !== null ? price * blocksPerWeek * 52 : null;
        const isBest = bestPrice !== null && price === bestPrice;

        storeCells[store] = {
          price,
          annualCost,
          isBest,
        };
      });

      return {
        key,
        brandName,
        packageSize,
        storeCells,
        bestPrice,
        imageUrl: row.image_url,
        originalRow: row, // Keep reference to original row data
      };
    });
  }, [rows, blocksPerWeek]);

  const insightRow = useMemo(() => {
    if (!selectedInsightKey && gridRows.length > 0) {
      return gridRows[0];
    }
    return gridRows.find((row) => row.key === selectedInsightKey) || gridRows[0];
  }, [gridRows, selectedInsightKey]);

  const smartSubstitutes = useMemo(() => {
    if (!gridRows.length) return [];

    const decorated = gridRows.map((row) => {
      const storeValues = Object.values(row.storeCells)
        .map((cell) => cell.price)
        .filter((price): price is number => price !== null);

      if (storeValues.length < 2) {
        return {
          row,
          delta: 0,
        };
      }

      const max = Math.max(...storeValues);
      const min = Math.min(...storeValues);

      return {
        row,
        delta: max - min,
      };
    });

    return decorated
      .filter((entry) => entry.delta > 0)
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 3)
      .map((entry) => entry.row);
  }, [gridRows]);

  // Beautiful category tiles for different butter types
  const CATEGORY_TILES = [
    { 
      key: 'premium', 
      title: 'Premium Baking', 
      subtitle: 'Artisan & gourmet butter for special occasions', 
      icon: 'medal',
      gradient: ['#8B5CF6', '#A855F7'],
      bgColor: 'rgba(139, 92, 246, 0.08)',
      borderColor: 'rgba(139, 92, 246, 0.20)'
    },
    { 
      key: 'fat-loss', 
      title: 'Light & Low-Fat', 
      subtitle: 'Healthier options with reduced fat content', 
      icon: 'fitness',
      gradient: ['#10B981', '#059669'],
      bgColor: 'rgba(16, 185, 129, 0.08)',
      borderColor: 'rgba(16, 185, 129, 0.20)'
    },
    { 
      key: 'european', 
      title: 'European Style', 
      subtitle: 'Traditional European butter varieties', 
      icon: 'globe',
      gradient: ['#F59E0B', '#D97706'],
      bgColor: 'rgba(245, 158, 11, 0.08)',
      borderColor: 'rgba(245, 158, 11, 0.20)'
    },
    { 
      key: 'other', 
      title: 'Other Varieties', 
      subtitle: 'Explore more butter options', 
      icon: 'options',
      gradient: ['#6366F1', '#4F46E5'],
      bgColor: 'rgba(99, 102, 241, 0.08)',
      borderColor: 'rgba(99, 102, 241, 0.20)'
    },
  ];

  const renderPriceGrid = (layout: "portrait" | "landscape" = "portrait") => {
    if (isLoading) {
      return (
        <View style={styles.loadingState}>
          <ActivityIndicator color={tokens.colors.accent} />
          <Text style={styles.loadingLabel}>Loading price comparison...</Text>
        </View>
      );
    }

    if (error) {
      return <Text style={styles.errorText}>{error}</Text>;
    }

    if (!gridRows.length) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No price data yet</Text>
          <Text style={styles.emptySubtitle}>
            Check back soon while we gather the latest supermarket prices.
          </Text>
        </View>
      );
    }

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.gridScrollContent}
      >
        <View style={styles.gridTable}>
          <View style={[styles.gridRow, styles.gridHeaderRow]}>
            <View style={[styles.gridCell, styles.gridProductCell]}>
              <Text style={styles.gridHeaderText}>Product</Text>
            </View>
            {STORES.map((store) => (
              <View key={store} style={styles.gridCell}>
                <Text style={styles.gridHeaderText}>{store}</Text>
              </View>
            ))}
          </View>
          {gridRows.map((row) => (
            <View key={row.key} style={styles.gridRow}>
              <View style={[styles.gridCell, styles.gridProductCell]}>
                <Text style={styles.gridProductName} numberOfLines={2}>
                  {row.brandName}
                </Text>
                {row.packageSize && (
                  <Text style={styles.gridMetaText}>{row.packageSize}</Text>
                )}
              </View>
              {STORES.map((store) => {
                const cell = row.storeCells[store];
                return (
                  <View
                    key={`${row.key}-${store}`}
                    style={[
                      styles.gridCell,
                      cell.isBest && styles.gridCellBest,
                    ]}
                  >
                    {cell.price !== null ? (
                      <>
                        <Text
                          style={[
                            styles.gridPriceText,
                            cell.isBest && styles.gridPriceBest,
                          ]}
                        >
                          ${cell.price.toFixed(2)}
                        </Text>
                        <Text style={styles.gridAnnualText}>
                          {formatAnnualCost(cell.annualCost)}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.gridUnavailableText}>—</Text>
                    )}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  const renderInsightsCard = () => {
    if (!gridRows.length || !insightRow) {
      return null;
    }

    const bestStore = STORES.find((store) => insightRow.storeCells[store].isBest);
    const bestPrice = bestStore ? insightRow.storeCells[bestStore].price : null;

    return (
      <View style={styles.swipeCardsContainer}>
        <Text style={styles.cardTitle}>Quick Insight - Swipe to Explore</Text>
        <Text style={styles.cardBody}>
          {bestStore && bestPrice !== null
            ? `Products from ${bestStore} - currently the cheapest overall`
            : 'Swipe right to view details, left to skip'}
        </Text>
        
        <View style={styles.cardStack}>
          {swipeProducts.length > 0 && currentCardIndex < swipeProducts.length ? (
            <SwipeableProductCard
              key={`card-${currentCardIndex}-${swipeProducts[currentCardIndex]?.id}`}
              product={swipeProducts[currentCardIndex]}
              onSwipeLeft={handleSwipeLeft}
              onSwipeRight={handleSwipeRight}
              isLastCard={false}
            />
          ) : currentCardIndex >= swipeProducts.length && swipeProducts.length > 0 ? (
            <SwipeableProductCard
              key={`show-more-${currentStoreRank}`}
              product={{
                id: 'show-more',
                name: 'Show More',
                isShowMore: true,
              } as any}
              onSwipeLeft={() => loadSwipeProducts(rows, 0)}
              onSwipeRight={handleSwipeRight}
              isLastCard={true}
            />
          ) : null}
        </View>
      </View>
    );
  };

  const renderSmartSubstitutes = () => {
    return (
      <View style={styles.categoryTilesCard}>
        <View style={styles.categoryTilesHeader}>
          <Text style={styles.categoryTilesTitle}>Explore Butter Categories</Text>
          <Text style={styles.categoryTilesSubtitle}>
            Find the perfect butter for your needs
          </Text>
        </View>

        <View style={styles.categoryTilesGrid}>
          {CATEGORY_TILES.map((tile) => (
            <TouchableOpacity
              key={tile.key}
              style={[
                styles.categoryTile,
                { 
                  backgroundColor: tile.bgColor,
                  borderColor: tile.borderColor,
                }
              ]}
              onPress={() => {
                // Navigate to category screen
                const parent = (navigation as any).getParent?.();
                if (parent?.navigate) {
                  parent.navigate('Category', { category: tile.key });
                } else {
                  navigation.navigate('Category', { category: tile.key });
                }
              }}
              activeOpacity={0.85}
            >
              <View style={[styles.categoryTileIcon, { backgroundColor: tile.gradient[0] }]}>
                <Ionicons name={tile.icon as any} size={20} color="#ffffff" />
              </View>
              
              <View style={styles.categoryTileContent}>
                <Text style={styles.categoryTileTitle}>{tile.title}</Text>
                <Text style={styles.categoryTileSubtitle} numberOfLines={2}>
                  {tile.subtitle}
                </Text>
              </View>
              
              <View style={styles.categoryTileFooter}>
                <Text style={[styles.categoryTileAction, { color: tile.gradient[0] }]}>
                  Explore
                </Text>
                <Ionicons 
                  name="chevron-forward" 
                  size={16} 
                  color={tile.gradient[0]} 
                />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderPortrait = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { marginTop: headerMargin }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Compare butter prices</Text>
          <LocationIndicator
            variant="compact"
            containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
          />
        </View>
        <Text style={styles.subtitle}>
          A clean snapshot of what the main supermarkets are charging right now.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Supermarket Grid</Text>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepperButton, styles.stepperButtonLeft]}
              onPress={() => adjustBlocksPerWeek(-0.25)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>–</Text>
            </TouchableOpacity>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperValueText}>{blocksPerWeek}</Text>
              <Text style={styles.stepperLabel}>blocks / week</Text>
            </View>
            <TouchableOpacity
              style={[styles.stepperButton, styles.stepperButtonRight]}
              onPress={() => adjustBlocksPerWeek(0.25)}
              activeOpacity={0.7}
            >
              <Text style={styles.stepperButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
        {renderPriceGrid()}
      </View>

      <View style={styles.section}>{renderInsightsCard()}</View>
      <View style={[styles.section, styles.lastSection]}>{renderSmartSubstitutes()}</View>
    </ScrollView>
  );

  const renderLandscape = () => (
    <View style={styles.landscapeWrapper}>
      <LocationIndicator variant="compact" containerStyle={[styles.locationPill, styles.locationPillLandscape]} />
      <View style={styles.landscapeHeader}>
        <View>
          <Text style={styles.landscapeTitle}>Compare prices</Text>
          <Text style={styles.landscapeSubtitle}>
            Rotate back for extra insights and substitutes.
          </Text>
        </View>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperButton, styles.stepperButtonLeft]}
            onPress={() => adjustBlocksPerWeek(-0.25)}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperButtonText}>–</Text>
          </TouchableOpacity>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperValueText}>{blocksPerWeek}</Text>
            <Text style={styles.stepperLabel}>blocks / week</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepperButton, styles.stepperButtonRight]}
            onPress={() => adjustBlocksPerWeek(0.25)}
            activeOpacity={0.7}
          >
            <Text style={styles.stepperButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
      <View style={styles.landscapeGrid}>{renderPriceGrid("landscape")}</View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {isLandscape ? renderLandscape() : renderPortrait()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scrollContent: {
    paddingBottom: tokens.spacing.xl,
  },
  header: {
    paddingHorizontal: tokens.spacing.pad,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationPill: {
    alignSelf: 'flex-end',
    marginBottom: tokens.spacing.md,
    shadowColor: 'rgba(15, 23, 42, 0.15)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  locationPillLandscape: {
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: tokens.text.title,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  subtitle: {
    marginTop: tokens.spacing.sm,
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    lineHeight: 18,
  },
  section: {
    paddingHorizontal: tokens.spacing.pad,
    paddingTop: tokens.spacing.xl,
  },
  lastSection: {
    paddingBottom: tokens.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: 'hidden',
  },
  stepperButton: {
    width: 36,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.pill,
  },
  stepperButtonLeft: {
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
  },
  stepperButtonRight: {
    borderLeftWidth: 1,
    borderLeftColor: tokens.colors.line,
  },
  stepperButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  stepperValue: {
    paddingHorizontal: tokens.spacing.sm,
    alignItems: 'center',
  },
  stepperValueText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  stepperLabel: {
    fontSize: 10,
    color: tokens.colors.ink2,
  },
  gridScrollContent: {
    paddingRight: tokens.spacing.pad,
  },
  gridTable: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
    overflow: 'hidden',
  },
  gridRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  gridHeaderRow: {
    backgroundColor: tokens.colors.bg,
  },
  gridCell: {
    width: 120,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gridProductCell: {
    width: 160,
    alignItems: 'flex-start',
  },
  gridHeaderText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  gridProductName: {
    fontSize: tokens.text.tiny,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  gridMetaText: {
    marginTop: 4,
    fontSize: 10,
    color: tokens.colors.ink2,
  },
  gridPriceText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  gridPriceBest: {
    color: tokens.colors.success,
  },
  gridAnnualText: {
    marginTop: 4,
    fontSize: 11,
    color: tokens.colors.ink2,
  },
  gridUnavailableText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  gridCellBest: {
    backgroundColor: '#f0fdf4',
  },
  loadingState: {
    paddingVertical: tokens.spacing.xl,
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  loadingLabel: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
  },
  errorText: {
    fontSize: tokens.text.body,
    color: tokens.colors.error,
  },
  emptyState: {
    padding: tokens.spacing.lg,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  emptyTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptySubtitle: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  cardTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  cardBody: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    lineHeight: 16,
  },
  insightRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.xs,
  },
  insightChip: {
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  insightChipActive: {
    backgroundColor: tokens.colors.pill,
    borderColor: tokens.colors.pill,
  },
  insightChipText: {
    fontSize: 11,
    color: tokens.colors.ink,
  },
  insightChipTextActive: {
    color: '#ffffff',
    fontWeight: '600',
  },
  subsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  // removed old substitute product card styles since we now show only tiles
  landscapeWrapper: {
    flex: 1,
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.md,
  },
  landscapeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  landscapeTitle: {
    fontSize: tokens.text.title,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  landscapeSubtitle: {
    marginTop: 4,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  landscapeGrid: {
    flex: 1,
  },
  swipeCardsContainer: {
    marginBottom: tokens.spacing.xl,
  },
  cardStack: {
    height: 520,
    marginTop: tokens.spacing.md,
    position: 'relative',
    alignItems: 'center',
  },
  // Category Tiles Styles
  categoryTilesCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.xl,
    ...Platform.select({
      android: {
        elevation: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
    }),
  },
  categoryTilesHeader: {
    marginBottom: tokens.spacing.lg,
  },
  categoryTilesTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  categoryTilesSubtitle: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    lineHeight: 16,
  },
  categoryTilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: tokens.spacing.sm,
    ...Platform.select({
      android: {
        paddingHorizontal: 0,
      },
    }),
  },
  categoryTile: {
    width: '48%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: tokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    minHeight: 120,
    maxHeight: 130,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 6,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
      },
    }),
  },
  categoryTileIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 4,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
    }),
  },
  categoryTileContent: {
    flex: 1,
    marginBottom: tokens.spacing.xs,
    ...Platform.select({
      android: {
        paddingVertical: 1,
      },
    }),
  },
  categoryTileTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 3,
    lineHeight: 16,
  },
  categoryTileSubtitle: {
    fontSize: 10,
    color: '#6B7280',
    lineHeight: 12,
    fontWeight: '400',
  },
  categoryTileFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 4,
    ...Platform.select({
      android: {
        paddingTop: 4,
      },
    }),
  },
  categoryTileAction: {
    fontSize: 11,
    fontWeight: '600',
  },
});






































