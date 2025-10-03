import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

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
  image_url?: string;
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
  image_url?: string;
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
  const fullName = preferLabel(row.name_with_brand, row.name);
  const brand = preferLabel(row.brand_display_name, row.brand_name, row.brand);
  
  let displayName = fullName || brand || 'Butter';
  
  const size = preferLabel(row.package_size, row.weight, row.product_size);
  if (size && !displayName.includes(size)) {
    displayName = `${displayName} ${size}`;
  }
  
  return displayName;
};

const CATEGORY_CONFIG = {
  premium: {
    title: 'Premium Baking',
    subtitle: 'High-quality butters perfect for pastries and baking',
    icon: 'medal',
    color: '#8B5CF6',
    gradient: ['#8B5CF6', '#A78BFA'],
  },
  organic: {
    title: 'Organic & Grass-fed',
    subtitle: 'Natural, organic options from grass-fed cows',
    icon: 'leaf',
    color: '#10B981',
    gradient: ['#10B981', '#34D399'],
  },
  lowfat: {
    title: 'Low-fat & Light',
    subtitle: 'Reduced fat options for healthier choices',
    icon: 'fitness',
    color: '#F59E0B',
    gradient: ['#F59E0B', '#FBBF24'],
  },
  dairyfree: {
    title: 'Dairy-free & Plant-based',
    subtitle: 'Vegan alternatives and plant-based spreads',
    icon: 'flower',
    color: '#EF4444',
    gradient: ['#EF4444', '#F87171'],
  },
};

const matchesCategory = (row: GridRow, category: string) => {
  const text = `${row.brandName} ${row.packageSize || ''}`.toLowerCase();

  if (category === 'premium') {
    const premiumWords = ['unsalted', 'european', 'cultured', 'french', 'pastry', 'baking', 'lurpak', 'westgold'];
    return premiumWords.some((w) => text.includes(w));
  }
  if (category === 'organic') {
    const organicWords = ['organic', 'grass', 'pasture', 'lewis road'];
    return organicWords.some((w) => text.includes(w));
  }
  if (category === 'lowfat') {
    const lowfatWords = ['light', 'lite', 'reduced', 'lower fat', '50%'];
    return lowfatWords.some((w) => text.includes(w));
  }
  if (category === 'dairyfree') {
    const dairyFreeWords = ['plant', 'vegan', 'dairy-free', 'dairy free', 'margarine', 'vutter', 'nuttelex', 'olivani'];
    return dairyFreeWords.some((w) => text.includes(w));
  }
  return true;
};

export default function CategoryScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { category } = route.params;

  const [rows, setRows] = useState<QuickCompareRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await productApi.quickCompare();
      const data = Array.isArray(response?.data) ? response.data : [];
      setRows(data);
    } catch (err) {
      console.error('Failed to load category products', err);
      setError('Unable to load products right now.');
    } finally {
      setIsLoading(false);
    }
  };

  const gridRows: GridRow[] = useMemo(() => {
    return rows.map((row, index) => {
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
        const annualCost = price !== null ? price * 52 : null;
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
        image_url: row.image_url,
      };
    });
  }, [rows]);

  const filteredProducts = useMemo(() => {
    return gridRows.filter((row) => matchesCategory(row, category));
  }, [gridRows, category]);

  const renderProductCard = (product: GridRow) => {
    const bestStore = STORES.find((store) => product.storeCells[store].isBest);
    const bestPrice = bestStore ? product.storeCells[bestStore].price : null;

    return (
      <TouchableOpacity
        key={product.key}
        style={styles.productCard}
        onPress={() => navigation.navigate('ProductDetail', { product })}
        activeOpacity={0.85}
      >
        <View style={styles.productImageContainer}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image-outline" size={32} color={tokens.colors.ink2} />
            </View>
          )}
          
          {bestPrice && (
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>${bestPrice.toFixed(2)}</Text>
            </View>
          )}
        </View>

        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>
            {product.brandName}
          </Text>
          {product.packageSize && (
            <Text style={styles.productSize}>{product.packageSize}</Text>
          )}
          
          {bestStore && bestPrice && (
            <View style={styles.storeInfo}>
              <Ionicons name="storefront-outline" size={12} color={tokens.colors.ink2} />
              <Text style={styles.storeText}>{bestStore}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <TouchableOpacity style={styles.viewButton}>
            <Text style={styles.viewButtonText}>View Details</Text>
            <Ionicons name="arrow-forward" size={14} color={tokens.colors.bg} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={config.color} />
          <Text style={styles.loadingText}>Loading {config.title} products...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={tokens.colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadProducts}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={[styles.categoryIcon, { backgroundColor: config.color }]}>
              <Ionicons name={config.icon as any} size={32} color="#ffffff" />
            </View>
            <Text style={styles.categoryTitle}>{config.title}</Text>
            <Text style={styles.categorySubtitle}>{config.subtitle}</Text>
          </View>
        </View>

        {/* Location Indicator */}
        <View style={styles.locationContainer}>
          <LocationIndicator variant="compact" />
        </View>

        {/* Products Grid */}
        <View style={styles.productsContainer}>
          <View style={styles.productsHeader}>
            <Text style={styles.productsTitle}>
              {filteredProducts.length} Products Found
            </Text>
            <Text style={styles.productsSubtitle}>
              Tap any product to view detailed pricing across stores
            </Text>
          </View>

          {filteredProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {filteredProducts.map(renderProductCard)}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={64} color={tokens.colors.ink2} />
              <Text style={styles.emptyTitle}>No products found</Text>
              <Text style={styles.emptySubtitle}>
                We don't have any {config.title.toLowerCase()} products in our database yet.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: tokens.colors.pill,
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: tokens.spacing.pad,
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: tokens.spacing.pad,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    alignItems: 'center',
    marginTop: 20,
  },
  categoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  categoryTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: tokens.spacing.xs,
  },
  categorySubtitle: {
    fontSize: tokens.text.body,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  locationContainer: {
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.md,
    alignItems: 'center',
  },
  productsContainer: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.xl,
  },
  productsHeader: {
    marginBottom: tokens.spacing.lg,
    alignItems: 'center',
  },
  productsTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
  },
  productsSubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.md,
  },
  productCard: {
    width: '48%',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  productImageContainer: {
    position: 'relative',
    height: 140,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    backgroundColor: tokens.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  priceBadge: {
    position: 'absolute',
    top: tokens.spacing.sm,
    right: tokens.spacing.sm,
    backgroundColor: tokens.colors.success,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.sm,
    paddingVertical: 4,
  },
  priceBadgeText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: '#ffffff',
  },
  productInfo: {
    padding: tokens.spacing.md,
    flex: 1,
  },
  productName: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 4,
    lineHeight: 18,
  },
  productSize: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginBottom: tokens.spacing.xs,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeText: {
    fontSize: 11,
    color: tokens.colors.ink2,
  },
  cardFooter: {
    padding: tokens.spacing.md,
    paddingTop: 0,
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.pill,
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  viewButtonText: {
    fontSize: tokens.text.tiny,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.md,
  },
  loadingText: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  errorText: {
    fontSize: tokens.text.body,
    color: tokens.colors.error,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: tokens.colors.pill,
    borderRadius: tokens.radius.lg,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
  },
  retryButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: '#ffffff',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xl,
    gap: tokens.spacing.md,
  },
  emptyTitle: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptySubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    lineHeight: 20,
  },
});
