import React, { useState, useEffect, useMemo } from "react";

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  Dimensions,
  Modal,
  ActivityIndicator,
} from "react-native";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useNavigation } from "@react-navigation/native";

import LocationIndicator from "../components/LocationIndicator";

import { useApp } from "../contexts/AppContext";

import { productApi } from "../services/api";

import { Ionicons } from "@expo/vector-icons";

import { tokens } from "../theme/tokens";

const BRAND_COLUMN_WIDTH = 120;
const STORE_COLUMN_WIDTH = 110;

// Safe navigation helper

const safeNavigate = (navigation: any, route: string, params?: any) => {
  if (navigation && navigation.navigate) {
    navigation.navigate(route, params);
  }
};

// Helper functions for runtime tests

const bestOf3 = (a: number, b: number, c: number) => Math.min(a, b, c);

const take3 = (arr: any[]) => arr.slice(0, 3);

const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];

const STORE_NAME_ALIASES: { [key: string]: string } = {
  paknsave: "Pak'nSave",

  "pak'n save": "Pak'nSave",

  "pak n save": "Pak'nSave",

  "pak'nsave": "Pak'nSave",

  "pak n'save": "Pak'nSave",

  countdown: "Woolworths",

  woolworths: "Woolworths",

  "new world": "New World",

  nw: "New World",
};

const normalizeStoreName = (value?: string | null) => {
  if (!value) {
    return null;
  }

  const trimmed = String(value).trim();

  const key = trimmed.toLowerCase();

  return STORE_NAME_ALIASES[key] || trimmed;
};

const extractPrice = (value: unknown): number | null => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = parseFloat(String(value));

  return Number.isFinite(parsed) ? parsed : null;
};

const getBrandDisplayName = (product: any) => {
  const name =
    product?.brand_display_name ||
    product?.brand ||
    product?.name_with_brand ||
    product?.name ||
    "";

  return typeof name === "string" ? name : String(name);
};

export default function HomeScreen() {
  const navigation = useNavigation();

  const { addToList, list, userProfile, loadUserProfile, showSnackbar } = useApp();

  const insets = useSafeAreaInsets();

  const [products, setProducts] = useState<any[]>([]);

  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);

  const [searchQuery, setSearchQuery] = useState("");

  const [isLoading, setIsLoading] = useState(true);

  const [quickCompareRows, setQuickCompareRows] = useState<any[]>([]);
  const [isQuickCompareLoading, setIsQuickCompareLoading] = useState(true);

  
  // Tooltip state

  const [tooltipVisible, setTooltipVisible] = useState(false);

  const [tooltipData, setTooltipData] = useState<{
    store: string;

    price: number;

    lastUpdated: string;

    product: string;
  } | null>(null);

  // Runtime tests (DEV only)

  const DEV = typeof __DEV__ !== "undefined" ? __DEV__ : false;

  useEffect(() => {
    if (DEV) {
      console.assert(bestOf3(6.99, 7.1, 7.05) === 6.99);

      console.assert(take3([1, 2, 3, 4]).length === 3);

      // Test safeNavigate

      safeNavigate(undefined, "Explore"); // Should not throw

      safeNavigate({ navigate: () => {} }, "Explore"); // Should invoke navigate
    }
  }, []);

  useEffect(() => {
    loadProducts();
    loadUserProfile();
    loadQuickCompare();
  }, []);

  useEffect(() => {
    // Filter products based on search query

    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name_with_brand
            ?.toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.store?.toLowerCase().includes(searchQuery.toLowerCase()),
      );

      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  const loadProducts = async () => {
    try {
      const response = await productApi.list();

      setProducts(response.data);

      setFilteredProducts(response.data);
    } catch (error) {
      console.error("Error loading products:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductPress = (product: any) => {
    safeNavigate(navigation, "ProductDetail", { product });
  };

  const handleAddToList = (product: any) => {
    const isAlreadyInList = list.some(item => item.id === product.id);
    if (isAlreadyInList) {
      return;
    }
    addToList({
      id: product.id,
      name: product.name_with_brand,
      brand: product.brand,
      price: product.price || 0,
      image_url: product.image_url,
      store: product.store || product.brand || 'Unknown Store',
      weight: product.weight,
      savings: product.savings,
      worst_price: product.worst_price,
    });
    showSnackbar(`${product.name_with_brand} added to your list!`);
  };

  const loadQuickCompare = async () => {
    setIsQuickCompareLoading(true);

    try {
      const response = await productApi.quickCompare();
      setQuickCompareRows(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Error loading quick compare data:", error);
      setQuickCompareRows([]);
    } finally {
      setIsQuickCompareLoading(false);
    }
  };

  const handleQuickCompareRefresh = () => {
    loadQuickCompare();
  };

  const handleViewAllPress = () => {
    safeNavigate(navigation, "ProductList");
  };

  // Function to organise up to 5 butter brands for the heatmap

  const organizeHeatmapData = (items: any[]) => {
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

  const getAvailableStores = (items: any[]) => {
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

  // Format timestamp

  const formatLastUpdated = (timestamp: string | null) => {
    if (!timestamp) return "Unknown";

    const now = new Date();

    const updated = new Date(timestamp);

    const diffHours = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return "Just now";

    if (diffHours < 24) return `${diffHours}h ago`;

    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // Get freshness status

  const getFreshnessStatus = (timestamp: string | null) => {
    if (!timestamp) return "Unknown";

    const now = new Date();

    const updated = new Date(timestamp);

    const diffHours = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return "Fresh";

    if (diffHours < 6) return "Recent";

    return "Stale";
  };

  // Get freshness color

  const getFreshnessColor = (timestamp: string | null) => {
    if (!timestamp) return tokens.colors.ink2;

    const now = new Date();

    const updated = new Date(timestamp);

    const diffHours = Math.floor(
      (now.getTime() - updated.getTime()) / (1000 * 60 * 60),
    );

    if (diffHours < 1) return tokens.colors.success; // Green

    if (diffHours < 6) return "#f59e0b"; // Orange

    return tokens.colors.error; // Red
  };

  // Handle price cell press

  const handlePriceCellPress = (
    store: string,
    price: number,
    product: string,
    timestamp: string,
  ) => {
    setTooltipData({
      store,

      price,

      lastUpdated: formatLastUpdated(timestamp),

      product,
    });

    setTooltipVisible(true);
  };

  const renderHorizontalProductItem = (item: any) => {
    const isInList = list.some(listItem => listItem.id === item.id);
    
    return (
      <TouchableOpacity
        style={styles.horizontalProductCard}
        onPress={() => handleProductPress(item)}
      >
        {item.image_url && (
          <Image
            source={{ uri: item.image_url }}
            style={styles.horizontalProductImage}
            resizeMode="cover"
          />
        )}

        <View style={styles.horizontalProductInfo}>
          <Text style={styles.horizontalProductName} numberOfLines={2}>
            {item.name_with_brand}
          </Text>

          <Text style={styles.horizontalProductPrice}>
            ${item.price.toFixed(2)}
          </Text>

          <Text style={styles.horizontalProductStore}>
            {item.brand || item.store}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.horizontalAddToCartButton,
            isInList && styles.horizontalAddToCartButtonAdded
          ]}
          onPress={() => handleAddToList(item)}
        >
          <Ionicons 
            name={isInList ? "checkmark" : "add"} 
            size={16} 
            color={isInList ? '#ffffff' : tokens.colors.pill} 
          />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderCompareRow = (
    brand: string,
    pns: number,
    ww: number,
    nw: number,
  ) => {
    const prices = [pns, ww, nw];

    const minPrice = Math.min(...prices);

    return (
      <View key={brand} style={styles.compareRow}>
        <Text style={styles.compareBrand}>{brand}</Text>

        <View style={styles.comparePrices}>
          <Text
            style={[
              styles.comparePrice,
              pns === minPrice && styles.lowestPrice,
            ]}
          >
            ${pns.toFixed(2)}
          </Text>

          <Text
            style={[styles.comparePrice, ww === minPrice && styles.lowestPrice]}
          >
            ${ww.toFixed(2)}
          </Text>

          <Text
            style={[styles.comparePrice, nw === minPrice && styles.lowestPrice]}
          >
            ${nw.toFixed(2)}
          </Text>
        </View>
      </View>
    );
  };

  // Test compare rows

  if (DEV) {
    const testRow = renderCompareRow("Test", 6.99, 7.29, 5.49);

    console.assert(testRow !== null);
  }

  const sortedProducts = useMemo(() => {
    return [...filteredProducts].sort((a, b) => {
      const priceA = extractPrice(a?.price);

      const priceB = extractPrice(b?.price);

      if (priceA === null && priceB === null) return 0;

      if (priceA === null) return 1;

      if (priceB === null) return -1;

      return priceA - priceB;
    });
  }, [filteredProducts]);

  const cheapestProduct = sortedProducts.length > 0 ? sortedProducts[0] : null;

  const topProducts = sortedProducts.slice(0, 6);

  if (DEV) {
    console.log("Filtered products count:", filteredProducts.length);

    console.log("Sorted products count:", sortedProducts.length);

    console.log("Top products count:", topProducts.length);

    console.log("First few top products:", topProducts.slice(0, 2));

    console.log("Cheapest product:", cheapestProduct);
  }

  // Render heatmap cell with touch handler

  const renderHeatmapCell = (
    price: number | null,

    productName: string,

    store: string,

    timestamp: string | null,

    allPrices: { [storeKey: string]: number | null },
  ) => {
    if (price === null || price === undefined) {
      return (
        <View style={styles.heatmapCell}>
          <Text style={[styles.heatmapCellText, styles.heatmapCellTextEmpty]}>
            --
          </Text>
        </View>
      );
    }

    const validPrices = Object.values(allPrices).filter(
      (p): p is number => p !== null && p !== undefined,
    );

    const isCheapest =
      validPrices.length > 0 && price === Math.min(...validPrices);

    return (
      <TouchableOpacity
        style={[styles.heatmapCell, isCheapest && styles.heatmapCellCheapest]}
        onPress={() =>
          handlePriceCellPress(store, price, productName, timestamp || "")
        }
      >
        <Text
          style={[
            styles.heatmapCellText,

            isCheapest && styles.heatmapCellTextCheapest,
          ]}
        >
          ${price.toFixed(2)}
        </Text>
      </TouchableOpacity>
    );
  };

  // Render tooltip modal

  const renderTooltip = () => (
    <Modal
      visible={tooltipVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setTooltipVisible(false)}
    >
      <TouchableOpacity
        style={styles.tooltipOverlay}
        activeOpacity={1}
        onPress={() => setTooltipVisible(false)}
      >
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTitle}>{tooltipData?.store}</Text>

          <Text style={styles.tooltipPrice}>
            ${tooltipData?.price.toFixed(2)}
          </Text>

          <Text style={styles.tooltipProduct}>{tooltipData?.product}</Text>

          <Text style={styles.tooltipTimestamp}>
            Updated: {tooltipData?.lastUpdated}
          </Text>

          <View style={styles.tooltipStatus}>
            <Text
              style={[
                styles.tooltipStatusText,

                { color: getFreshnessColor(tooltipData?.lastUpdated || null) },
              ]}
            >
              Status: {getFreshnessStatus(tooltipData?.lastUpdated || null)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // Render heatmap

  const renderHeatmap = () => {
    const heatmapData = organizeHeatmapData(quickCompareRows);
    const availableStores = getAvailableStores(quickCompareRows);

    if (DEV) {
      console.log("Quick compare rows:", quickCompareRows);
      console.log("Heatmap data:", heatmapData);
      console.log("Available stores:", availableStores);
    }

    const renderSkeleton = () => (
      <View style={styles.heatmapPlaceholder}>
        <View style={styles.heatmapSpinner}>
          <ActivityIndicator color={tokens.colors.accent} size="small" />
        </View>
        <Text style={styles.heatmapPlaceholderText}>
          Loading the latest quick compare data...
        </Text>
      </View>
    );

    const renderEmptyState = () => (
      <View style={styles.heatmapPlaceholder}>
        <Text style={styles.heatmapPlaceholderText}>
          No recent price snapshots yet.
        </Text>

        <TouchableOpacity
          style={styles.heatmapRefreshButton}
          onPress={handleQuickCompareRefresh}
          activeOpacity={0.85}
        >
          <Ionicons
            name="arrow-forward"
            size={16}
            color={tokens.colors.bg}
            style={styles.heatmapRefreshIcon}
          />
          <Text style={styles.heatmapRefreshText}>See more</Text>
        </TouchableOpacity>
      </View>
    );

    return (
      <View style={styles.quickCompareWrapper}>
        <View style={[styles.sectionHeader, styles.quickCompareHeader]}>
          <Text style={styles.sectionTitle}>Quick Compare</Text>

          {!isQuickCompareLoading && heatmapData.length > 0 && (
            <TouchableOpacity
              style={styles.heatmapRefreshButton}
              onPress={handleQuickCompareRefresh}
              activeOpacity={0.85}
            >
          <Ionicons
            name="arrow-forward"
            size={16}
            color={tokens.colors.bg}
            style={styles.heatmapRefreshIcon}
          />
          <Text style={styles.heatmapRefreshText}>See more</Text>
            </TouchableOpacity>
          )}
        </View>

        {isQuickCompareLoading && (
          <View style={styles.quickCompareCard}>{renderSkeleton()}</View>
        )}

        {!isQuickCompareLoading && heatmapData.length === 0 && (
          <View style={styles.quickCompareCard}>{renderEmptyState()}</View>
        )}

        {!isQuickCompareLoading && heatmapData.length > 0 && (
          <View style={styles.quickCompareCard}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.heatmapScrollContent}
            >
            <View
              style={[
                styles.heatmapContainer,
                {
                  width:
                    BRAND_COLUMN_WIDTH +
                    availableStores.length * STORE_COLUMN_WIDTH,
                },
              ]}
            >
              <View style={styles.heatmapRow}>
                <View style={styles.heatmapProductCell}>
                  <Text style={styles.heatmapHeaderText}>Product</Text>
                </View>

                {availableStores.map((store, index) => (
                  <View
                    key={`header-${store}-${index}`}
                    style={[
                      styles.heatmapHeaderCell,
                      index === availableStores.length - 1 &&
                        styles.heatmapCellContainerLast,
                    ]}
                  >
                    <Text style={styles.heatmapHeaderText}>{store}</Text>
                  </View>
                ))}
              </View>

              {heatmapData.map((item, index) => (
                <View key={`row-${(item.brandName || 'unknown').toString()}-${index}`} style={styles.heatmapRow}>
                  <View style={styles.heatmapProductCell}>
                    <View style={styles.brandImageContainer}>
                      {item.brandImage ? (
                        <Image
                          source={{ uri: item.brandImage }}
                          style={styles.brandImage}
                          resizeMode="contain"
                        />
                      ) : (
                        <View style={styles.brandImageFallback}>
                          <Text style={styles.brandImageFallbackText}>
                            {((item.brandName || 'Unknown Butter').charAt(0) || '?').toUpperCase()}
                          </Text>
                        </View>
                      )}

                      <Text
                        style={styles.heatmapProductLabel}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                        adjustsFontSizeToFit
                        minimumFontScale={0.85}
                      >
                        {item.brandName || 'Unknown Butter'}
                      </Text>
                    </View>
                  </View>

                  {availableStores.map((store, storeIndex) => (
                    <View
                      key={`cell-${(item.brandName || 'unknown').toString()}-${store}-${storeIndex}`}
                      style={[
                        styles.heatmapCellContainer,
                        storeIndex === availableStores.length - 1 &&
                          styles.heatmapCellContainerLast,
                      ]}
                    >
                      {renderHeatmapCell(
                        item.prices[store],
                        item.brandName,
                        store,
                        item.timestamps[store],
                        item.prices,
                      )}
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header */}

      <View
        style={[
          styles.stickyHeader,
          { marginTop: insets.top + tokens.spacing.md },
        ]}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>
            Hello {userProfile?.name || "User"} !
          </Text>
        </View>

        <LocationIndicator variant="compact" />
      </View>

      {/* Sticky Search Bar */}

      <View style={styles.stickySearchContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons
            name="search"
            size={18}
            color={tokens.colors.ink2}
            style={styles.searchIcon}
          />

          <TextInput
            style={styles.searchInput}
            placeholder="Search your butter..."
            placeholderTextColor={tokens.colors.ink2}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={styles.searchClearBtn}
              accessibilityLabel="Clear search"
              activeOpacity={0.7}
            >
              <Ionicons name="close-circle" size={18} color={tokens.colors.ink2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Cheapest Card */}
        {cheapestProduct && (
          <View style={styles.cheapestCard}>
            <View style={styles.cheapestContent}>
              {cheapestProduct.image_url && (
                <Image
                  source={{ uri: cheapestProduct.image_url }}
                  style={styles.cheapestImage}
                  resizeMode="cover"
                />
              )}

              <View style={styles.cheapestInfo}>
                <Text style={styles.cheapestTitle}>
                  Lowest priced butter near you
                </Text>

                <Text style={styles.cheapestProduct} numberOfLines={2}>
                  {cheapestProduct.name_with_brand}
                </Text>

                <Text style={styles.cheapestPrice}>
                  ${cheapestProduct.price.toFixed(2)}
                </Text>

                <Text style={styles.cheapestStore}>
                  at {cheapestProduct.brand || cheapestProduct.store}
                </Text>
              </View>
            </View>

            <View style={styles.cheapestActions}>
              <TouchableOpacity
                style={[
                  styles.addButton,
                  list.some(item => item.id === cheapestProduct.id) && styles.addButtonAdded
                ]}
                onPress={() => handleAddToList(cheapestProduct)}
                activeOpacity={0.85}
              >
                <Text style={styles.addButtonText}>
                  {list.some(item => item.id === cheapestProduct.id) ? 'In List' : 'Add to list'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.detailsButton}
                onPress={() => handleProductPress(cheapestProduct)}
                activeOpacity={0.85}
              >
                <Text style={styles.detailsButtonText}>View details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {/* Popular Picks */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Popular Picks</Text>

          <TouchableOpacity
            style={styles.sectionToggle}
            onPress={handleViewAllPress}
            activeOpacity={0.85}
          >
            <Text style={styles.sectionToggleText}>View all</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          {topProducts.map((product, idx) => (
            <View key={`top-${product.id}-${idx}`}>{renderHorizontalProductItem(product)}</View>
          ))}
        </ScrollView>

        {renderHeatmap()}
      </ScrollView>

      {/* Add tooltip */}

      {renderTooltip()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,

    backgroundColor: tokens.colors.bg,
  },

  stickyHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    paddingHorizontal: tokens.spacing.pad,

    paddingVertical: tokens.spacing.md,

    backgroundColor: tokens.colors.bg,

    borderBottomWidth: 1,

    borderBottomColor: tokens.colors.line,

    marginHorizontal: tokens.spacing.sm,

    borderRadius: tokens.radius.lg,

    zIndex: 1000,
  },

  stickySearchContainer: {
    paddingHorizontal: tokens.spacing.pad,

    paddingVertical: tokens.spacing.sm,

    backgroundColor: tokens.colors.bg,

    borderBottomWidth: 1,

    borderBottomColor: tokens.colors.line,

    zIndex: 999,
  },

  headerLeft: {
    flexDirection: "row",

    alignItems: "center",
  },

  greeting: {
    fontSize: tokens.text.title,

    fontWeight: "bold",

    color: tokens.colors.ink,
  },

  searchInputContainer: {
    flexDirection: "row",

    alignItems: "center",

    backgroundColor: tokens.colors.card,

    paddingHorizontal: tokens.spacing.md,

    paddingVertical: tokens.spacing.md,

    borderRadius: tokens.radius.lg,

    borderWidth: 1,

    borderColor: tokens.colors.line,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 1,
    },

    shadowOpacity: 0.05,

    shadowRadius: 2,

    elevation: 2,
  },

  searchIcon: {
    fontSize: 16,

    marginRight: tokens.spacing.sm,

    color: tokens.colors.ink2,
  },

  searchInput: {
    flex: 1,

    fontSize: tokens.text.body,

    color: tokens.colors.ink,

    padding: 0,
  },
  searchClearBtn: {
    marginLeft: tokens.spacing.xs,
  },

  cheapestCard: {
    backgroundColor: tokens.colors.card,

    marginHorizontal: tokens.spacing.md,

    marginVertical: tokens.spacing.sm,

    padding: tokens.spacing.lg,

    minHeight: 160,

    borderRadius: tokens.radius.xl,

    borderWidth: 1,

    borderColor: tokens.colors.line,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 4,
    },

    shadowOpacity: 0.15,

    shadowRadius: 8,

    elevation: 8,
  },

  cheapestContent: {
    flexDirection: "row",

    alignItems: "stretch",

    marginBottom: tokens.spacing.md,

    flex: 1,
  },

  cheapestImage: {
    width: "50%",

    height: 120,

    borderRadius: tokens.radius.lg,

    marginRight: tokens.spacing.md,

    backgroundColor: tokens.colors.bg,
  },

  cheapestInfo: {
    width: "50%",

    paddingLeft: tokens.spacing.sm,

    justifyContent: "space-between",

    paddingVertical: tokens.spacing.xs,
  },

  cheapestTitle: {
    fontSize: tokens.text.body,

    fontWeight: "700",

    color: tokens.colors.success,

    marginBottom: tokens.spacing.xs,

    textTransform: "uppercase",
  },

  cheapestProduct: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink,

    marginBottom: tokens.spacing.sm,

    lineHeight: 16,

    fontWeight: "600",
  },

  cheapestPrice: {
    fontSize: 18,

    fontWeight: "800",

    color: tokens.colors.success,

    marginBottom: tokens.spacing.sm,
  },

  cheapestStore: {
    fontSize: 10,

    color: tokens.colors.ink2,

    fontWeight: "600",
  },

  cheapestActions: {
    flexDirection: "row",

    justifyContent: "space-between",

    gap: tokens.spacing.sm,
  },

  addButton: {
    flex: 1,
    backgroundColor: tokens.colors.success,

    paddingVertical: tokens.spacing.sm,

    borderRadius: tokens.radius.lg,

    alignItems: "center",

    shadowColor: tokens.colors.success,

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.3,

    shadowRadius: 4,

    elevation: 4,
  },

  addButtonAdded: {
    backgroundColor: "#059669",
  },

  addButtonText: {
    color: "#ffffff",

    fontSize: tokens.text.tiny,

    fontWeight: "700",
  },

  detailsButton: {
    flex: 1,
    backgroundColor: tokens.colors.card,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    alignItems: "center",
    borderWidth: 2,
    borderColor: tokens.colors.pill,
  },

  detailsButtonText: {
    color: tokens.colors.pill,
    fontSize: tokens.text.tiny,
    fontWeight: "700",
  },

  quickCompareWrapper: {
    marginHorizontal: tokens.spacing.pad,
    marginTop: -tokens.spacing.xxl,
    paddingTop: tokens.spacing.xxl + tokens.spacing.sm,
    marginBottom: tokens.spacing.xl,
    zIndex: 5,
  },

  quickCompareHeader: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: tokens.spacing.sm,
  },

  quickCompareCard: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: 0,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
    overflow: "hidden",
  },

  sectionHeader: {
    flexDirection: "row",

    justifyContent: "space-between",

    alignItems: "center",

    margin: tokens.spacing.pad,

    marginBottom: tokens.spacing.sm,
  },

  sectionTitle: {
    fontSize: tokens.text.h2,

    fontWeight: "600",

    color: tokens.colors.ink,
  },

  sectionToggle: {
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.pill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },

  sectionToggleText: {
    color: '#ffffff',
    fontSize: tokens.text.body,
    fontWeight: '700',
  },

  horizontalScroll: {
    marginBottom: tokens.spacing.xxl,
  },

  horizontalContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.md,
    gap: tokens.spacing.sm,
  },

  horizontalProductCard: {
    backgroundColor: tokens.colors.card,

    borderRadius: tokens.radius.lg,

    borderWidth: 1,

    borderColor: tokens.colors.line,

    overflow: "hidden",

    position: "relative",

    width: 140,

    height: 160,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.1,

    shadowRadius: 3.84,

    elevation: 5,
  },

  horizontalProductImage: {
    width: "100%",

    height: 80,

    resizeMode: "cover",
  },

  horizontalProductInfo: {
    padding: tokens.spacing.sm,

    flex: 1,
  },

  horizontalProductName: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink,

    marginBottom: tokens.spacing.xs,

    fontWeight: "500",

    lineHeight: 14,
  },

  horizontalProductPrice: {
    fontSize: tokens.text.body,

    fontWeight: "bold",

    color: tokens.colors.success,

    marginBottom: tokens.spacing.xs,
  },

  horizontalProductStore: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink2,
  },

  horizontalAddToCartButton: {
    position: "absolute",

    top: tokens.spacing.sm,

    right: tokens.spacing.sm,

    backgroundColor: tokens.colors.card,
    borderWidth: 1,
    borderColor: tokens.colors.pill,

    width: 28,

    height: 28,

    borderRadius: 14,

    justifyContent: "center",

    alignItems: "center",
  },

  horizontalAddToCartButtonAdded: {
    backgroundColor: tokens.colors.pill,
    opacity: 0.85,
  },

  horizontalAddToCartText: {
    color: "#ffffff",

    fontSize: tokens.text.tiny,

    fontWeight: "bold",
  },

  scrollContent: {
    paddingBottom: tokens.spacing.xl,
  },

  topPicksList: {
    marginTop: tokens.spacing.sm,
  },

  productCard: {
    backgroundColor: tokens.colors.card,

    borderRadius: tokens.radius.lg,

    margin: tokens.spacing.xs,

    borderWidth: 1,

    borderColor: tokens.colors.line,

    overflow: "hidden",

    position: "relative",

    flex: 1,

    maxWidth: "48%",

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 2,
    },

    shadowOpacity: 0.1,

    shadowRadius: 3.84,

    elevation: 5,
  },

  productRow: {
    justifyContent: "space-between",
  },

  productsList: {
    marginTop: tokens.spacing.sm,
  },

  productImage: {
    width: "100%",

    height: 120,

    resizeMode: "cover",
  },

  productInfo: {
    padding: tokens.spacing.md,

    flex: 1,
  },

  productName: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink,

    marginBottom: tokens.spacing.xs,

    fontWeight: "500",
  },

  productPrice: {
    fontSize: tokens.text.body,

    fontWeight: "bold",

    color: tokens.colors.success,

    marginBottom: tokens.spacing.xs,
  },

  productStore: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink2,
  },

  addToCartButton: {
    position: "absolute",

    top: tokens.spacing.sm,

    right: tokens.spacing.sm,

    backgroundColor: tokens.colors.pill,

    width: 32,

    height: 32,

    borderRadius: 16,

    justifyContent: "center",

    alignItems: "center",
  },

  addToCartText: {
    color: "#ffffff",

    fontSize: tokens.text.body,

    fontWeight: "bold",
  },

  compareContainer: {
    backgroundColor: tokens.colors.card,

    borderRadius: tokens.radius.lg,

    borderWidth: 1,

    borderColor: tokens.colors.line,
  },

  compareHeader: {
    flexDirection: "row",

    padding: tokens.spacing.md,

    borderBottomWidth: 1,

    borderBottomColor: tokens.colors.line,
  },

  compareLabel: {
    flex: 1,

    fontSize: tokens.text.tiny,

    fontWeight: "600",

    color: tokens.colors.ink,

    textAlign: "center",
  },

  compareRow: {
    flexDirection: "row",

    padding: tokens.spacing.md,

    borderBottomWidth: 1,

    borderBottomColor: tokens.colors.line,
  },

  compareBrand: {
    flex: 1,

    fontSize: tokens.text.tiny,

    color: tokens.colors.ink,

    fontWeight: "500",
  },

  comparePrices: {
    flex: 3,

    flexDirection: "row",
  },

  comparePrice: {
    flex: 1,

    fontSize: tokens.text.tiny,

    color: tokens.colors.ink,

    textAlign: "center",
  },

  lowestPrice: {
    color: tokens.colors.success,

    fontWeight: "bold",
  },

  // Heatmap styles

  heatmapPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: tokens.spacing.xl,
    paddingHorizontal: tokens.spacing.pad,
    gap: tokens.spacing.md,
  },

  heatmapSpinner: {
    padding: tokens.spacing.sm,
    borderRadius: 50,
    backgroundColor: tokens.colors.bg,
  },

  heatmapPlaceholderText: {
    color: tokens.colors.ink2,
    fontSize: tokens.text.body,
    textAlign: 'center',
  },

  heatmapRefreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.pill,
  },

  heatmapRefreshIcon: {
    marginRight: tokens.spacing.xs,
  },

  heatmapRefreshText: {
    color: '#ffffff',
    fontSize: tokens.text.body,
    fontWeight: '700',
  },

  heatmapScrollContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.xs,
  },

  heatmapContainer: {
    backgroundColor: tokens.colors.card,

    borderRadius: tokens.radius.lg,

    borderWidth: 1,

    borderColor: tokens.colors.line,

    overflow: "hidden",
  },

  heatmapRow: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
    minHeight: 36,
  },

  heatmapProductCell: {
    width: BRAND_COLUMN_WIDTH,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.xs,
    backgroundColor: tokens.colors.bg,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
    justifyContent: "center",
    alignItems: "center",
  },

  heatmapHeaderCell: {
    width: STORE_COLUMN_WIDTH,
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    backgroundColor: tokens.colors.bg,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },

  heatmapCellContainer: {
    width: STORE_COLUMN_WIDTH,
    borderRightWidth: 1,
    borderRightColor: tokens.colors.line,
  },

  heatmapCellContainerLast: {
    borderRightWidth: 0,
  },

  heatmapCell: {
    width: "100%",
    paddingVertical: tokens.spacing.sm,
    paddingHorizontal: tokens.spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: tokens.colors.card,
    minHeight: 32,
  },

  heatmapCellCheapest: {
    backgroundColor: "#f0fdf4", // Light green background
  },

  heatmapHeaderText: {
    fontSize: tokens.text.tiny,

    fontWeight: "700",

    color: tokens.colors.ink,

    textAlign: "center",
  },

  heatmapProductText: {
    fontSize: tokens.text.tiny,

    fontWeight: "500",

    color: tokens.colors.ink,

    lineHeight: 14,
  },

  brandImageContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: tokens.spacing.xs,
    paddingVertical: tokens.spacing.xs,
    paddingHorizontal: tokens.spacing.xs,
  },

  heatmapProductLabel: {
    width: "100%",
    fontSize: tokens.text.tiny,
    textAlign: "center",
    color: tokens.colors.ink,
    fontWeight: "600",
    lineHeight: 14,
    paddingHorizontal: tokens.spacing.xs,
  },

  brandImage: {
    width: 28,

    height: 28,

    borderRadius: 14,
  },

  brandImageFallback: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.line,
    alignItems: "center",
    justifyContent: "center",
  },

  brandImageFallbackText: {
    fontSize: tokens.text.tiny,
    fontWeight: "700",
    color: tokens.colors.ink,
  },

  heatmapCellText: {
    fontSize: tokens.text.tiny,
    fontWeight: "700",
    color: tokens.colors.ink,
  },

  heatmapCellTextEmpty: {
    color: tokens.colors.ink2,
    fontWeight: "500",
  },

  heatmapCellTextCheapest: {
    color: tokens.colors.success,

    fontWeight: "700",
  },

  // Tooltip styles

  tooltipOverlay: {
    flex: 1,

    backgroundColor: "rgba(0, 0, 0, 0.5)",

    justifyContent: "center",

    alignItems: "center",
  },

  tooltip: {
    backgroundColor: tokens.colors.card,

    borderRadius: tokens.radius.xl,

    padding: tokens.spacing.lg,

    margin: tokens.spacing.md,

    shadowColor: "#000",

    shadowOffset: {
      width: 0,

      height: 8,
    },

    shadowOpacity: 0.25,

    shadowRadius: 12,

    elevation: 12,

    minWidth: 220,

    maxWidth: 280,
  },

  tooltipTitle: {
    fontSize: tokens.text.h2,

    fontWeight: "700",

    color: tokens.colors.ink,

    textAlign: "center",

    marginBottom: tokens.spacing.sm,
  },

  tooltipPrice: {
    fontSize: 28,

    fontWeight: "800",

    color: tokens.colors.success,

    textAlign: "center",

    marginBottom: tokens.spacing.sm,
  },

  tooltipProduct: {
    fontSize: tokens.text.body,

    color: tokens.colors.ink2,

    textAlign: "center",

    marginBottom: tokens.spacing.md,

    lineHeight: 18,
  },

  tooltipTimestamp: {
    fontSize: tokens.text.tiny,

    color: tokens.colors.ink2,

    textAlign: "center",

    marginBottom: tokens.spacing.sm,
  },

  tooltipStatus: {
    backgroundColor: tokens.colors.bg,

    padding: tokens.spacing.sm,

    borderRadius: tokens.radius.md,

    alignItems: "center",
  },

  tooltipStatusText: {
    fontSize: tokens.text.tiny,

    fontWeight: "600",
  },
});


















