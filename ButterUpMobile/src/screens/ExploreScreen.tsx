import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { productApi } from '../services/api';
import { tokens } from '../theme/tokens';
import LocationIndicator from '../components/LocationIndicator';

const STORES = ["Pak'nSave", 'Woolworths', 'New World'];

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
}

const normalizeStoreName = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const key = String(value).trim().toLowerCase();

  switch (key) {
    case "paknsave":
    case "pak'n save":
    case "pak n save":
    case "pak'nsave":
    case "pak n'save":
      return "Pak'nSave";
    case 'countdown':
    case 'woolworths':
      return 'Woolworths';
    case 'new world':
    case 'nw':
      return 'New World';
    default:
      return String(value).trim();
  }
};

const formatAnnualCost = (value: number | null) => {
  if (value === null || !Number.isFinite(value)) return '—';
  return `$${Math.round(value)}/yr`;
};

const getBrandDisplayName = (row: QuickCompareRow) => {
  return (
    row.brand_display_name ||
    row.brand_name ||
    row.brand ||
    row.name_with_brand ||
    row.name ||
    'Unknown Butter'
  );
};

export default function ExploreScreen() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const headerMargin = insets.top + tokens.spacing.md;
  const isLandscape = width > height;

  const [blocksPerWeek, setBlocksPerWeek] = useState<number>(1);
  const [rows, setRows] = useState<QuickCompareRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedInsightKey, setSelectedInsightKey] = useState<string | null>(null);

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
      }
    } catch (err) {
      console.error('Failed to load quick compare data', err);
      setError('Unable to load price comparison data right now.');
    } finally {
      setIsLoading(false);
    }
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
        if (!STORES.includes(storeName)) return;
        const price = entry.price ?? null;
        prices[storeName] = price !== null && Number.isFinite(price) ? Number(price) : null;
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
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Quick insight</Text>
        <Text style={styles.cardBody} numberOfLines={2}>
          {bestStore && bestPrice !== null
            ? `${bestStore} is currently lowest at $${bestPrice.toFixed(2)}.`
            : 'No single store is clearly cheapest right now.'}
        </Text>
        <View style={styles.insightRow}>
          {gridRows.slice(0, 5).map((row) => (
            <TouchableOpacity
              key={row.key}
              style={[
                styles.insightChip,
                row.key === insightRow.key && styles.insightChipActive,
              ]}
              onPress={() => setSelectedInsightKey(row.key)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.insightChipText,
                  row.key === insightRow.key && styles.insightChipTextActive,
                ]}
                numberOfLines={1}
              >
                {row.brandName}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderSmartSubstitutes = () => {
    if (!smartSubstitutes.length) {
      return null;
    }

    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart substitutes</Text>
        <Text style={styles.cardBody}>
          Swap these into your basket to pick up the better value block.
        </Text>
        <View style={styles.subsGrid}>
          {smartSubstitutes.map((row) => {
            const bestStore = STORES.find((store) => row.storeCells[store].isBest);
            const bestPrice = bestStore ? row.storeCells[bestStore].price : null;

            return (
              <View key={`sub-${row.key}`} style={styles.subCard}>
                <Text style={styles.subTitle} numberOfLines={2}>
                  {row.brandName}
                </Text>
                {row.packageSize && (
                  <Text style={styles.subMeta}>{row.packageSize}</Text>
                )}
                {bestStore && bestPrice !== null ? (
                  <Text style={styles.subBestPrice}>
                    {bestStore}: ${bestPrice.toFixed(2)}
                  </Text>
                ) : (
                  <Text style={styles.subMeta}>Best price coming soon</Text>
                )}
                <TouchableOpacity style={styles.subButton} activeOpacity={0.85}>
                  <Text style={styles.subButtonText}>See details</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderPortrait = () => (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={[styles.header, { marginTop: headerMargin }]}>
        <LocationIndicator variant="compact" containerStyle={styles.locationPill} />
        <Text style={styles.title}>Compare butter prices</Text>
        <Text style={styles.subtitle}>
          A clean snapshot of what the main supermarkets are charging right now.
        </Text>
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Supermarket grid</Text>
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
    backgroundColor: tokens.colors.card,
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
    color: tokens.colors.ink,
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
    backgroundColor: tokens.colors.accent,
    borderColor: tokens.colors.accent,
  },
  insightChipText: {
    fontSize: 11,
    color: tokens.colors.ink,
  },
  insightChipTextActive: {
    color: tokens.colors.bg,
    fontWeight: '600',
  },
  subsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  subCard: {
    flexBasis: '48%',
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
  },
  subTitle: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  subMeta: {
    fontSize: 11,
    color: tokens.colors.ink2,
  },
  subBestPrice: {
    fontSize: tokens.text.body,
    color: tokens.colors.success,
    fontWeight: '700',
  },
  subButton: {
    marginTop: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.accent,
    alignItems: 'center',
  },
  subButtonText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.bg,
    fontWeight: '700',
  },
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
});






































