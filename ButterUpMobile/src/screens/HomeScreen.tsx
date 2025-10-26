import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import axios from "axios";
import { tokens } from "../theme/tokens";
import LocationIndicator from "../components/LocationIndicator";
import { useApp } from "../contexts/AppContext";
import { productApi } from "../services/api";
import { API_URLS } from "../config";
import { safeNavigate, BRAND_COLUMN_WIDTH, STORE_COLUMN_WIDTH } from "./home/utils/constants";
import { extractPrice, formatLastUpdated } from "./home/utils/helpers";
import { HorizontalProductCard } from "./home/components/HorizontalProductCard";
import { PriceTooltip } from "./home/components/PriceTooltip";
import { Heatmap } from "./home/components/Heatmap";
import { layout, header, search, cheapestCard, section } from "./HomeScreen.styles";

export default function HomeScreen() {
  const navigation = useNavigation();
  const { addToList, list, userProfile, loadUserProfile, showSnackbar } = useApp();
  const insets = useSafeAreaInsets();

  // ============================================================================
  // STATE
  // ============================================================================
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [quickCompareRows, setQuickCompareRows] = useState<any[]>([]);
  const [isQuickCompareLoading, setIsQuickCompareLoading] = useState(true);
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const [tooltipData, setTooltipData] = useState<{
    store: string;
    price: number;
    lastUpdated: string;
    product: string;
  } | null>(null);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  useEffect(() => {
    loadProducts();
    loadUserProfile();
    loadQuickCompare();
  }, []);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(
        (product) =>
          product.name_with_brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.store?.toLowerCase().includes(searchQuery.toLowerCase()),
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery, products]);

  // ============================================================================
  // DATA LOADING FUNCTIONS
  // ============================================================================
  // 🌐 API CALL #1: Fetches all butter products from backend via axios
  // Endpoint: GET /api/products/
  // Called on mount (line 50)
  const loadProducts = async () => {
    try {
      console.log(`[HomeScreen] Loading products from: ${API_URLS.PRODUCTS}`);
      // ← AXIOS GET REQUEST HERE
      const response = await axios.get(API_URLS.PRODUCTS);
      const productsData = response.data.results || response.data;
      console.log(`[HomeScreen] Loaded ${productsData.length || 0} products`);
      
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error("[HomeScreen] Error loading products:", error);
      // Fallback to empty array on error
      setProducts([]);
      setFilteredProducts([]);
    } finally {
      setIsLoading(false);
    }
  };

  // 🌐 API CALL #2: Fetches quick compare data (price heatmap) via axios
  // Endpoint: GET /api/quick-compare/
  // Called on mount (line 52) and when refresh button is pressed (line 306)
  const loadQuickCompare = async () => {
    setIsQuickCompareLoading(true);
    try {
      console.log(`[HomeScreen] Loading quick compare from: ${API_URLS.QUICK_COMPARE}`);
      // ← AXIOS GET REQUEST HERE
      const response = await axios.get(API_URLS.QUICK_COMPARE);
      const rows = response.data?.results ?? response.data;
      const rowCount = Array.isArray(rows) ? rows.length : 0;
      console.log(`[HomeScreen] Loaded ${rowCount} quick compare rows`);
      
      setQuickCompareRows(Array.isArray(rows) ? rows : []);
    } catch (error) {
      console.error("[HomeScreen] Error loading quick compare data:", error);
      setQuickCompareRows([]);
    } finally {
      setIsQuickCompareLoading(false);
    }
  };

  // ============================================================================
  // HANDLER FUNCTIONS
  // ============================================================================
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

  const handleQuickCompareRefresh = loadQuickCompare;

  const handleViewAllPress = () => {
    safeNavigate(navigation, "ProductList");
  };

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

  // ============================================================================
  // DATA PROCESSING
  // ============================================================================
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

  // ============================================================================
  // RETURN JSX
  // ============================================================================
  return (
    <View style={layout.container}>
      {/* Sticky Header */}
      <View
        style={[
          header.stickyHeader,
          { marginTop: insets.top + tokens.spacing.md },
        ]}
      >
        <View style={header.headerLeft}>
          <Text style={header.greeting}>
            Hello {userProfile?.name || "User"} !
          </Text>
        </View>
        <LocationIndicator variant="compact" />
      </View>

      {/* Sticky Search Bar */}
      <View style={search.stickySearchContainer}>
        <View style={search.searchInputContainer}>
          <Ionicons
            name="search"
            size={18}
            color={tokens.colors.ink2}
            style={search.searchIcon}
          />
          <TextInput
            style={search.searchInput}
            placeholder="Search your butter..."
            placeholderTextColor={tokens.colors.ink2}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery("")}
              style={search.searchClearBtn}
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
        contentContainerStyle={layout.scrollContent}
      >
        {/* Cheapest Card */}
        {cheapestProduct && (
          <View style={cheapestCard.card}>
            <View style={cheapestCard.content}>
              {cheapestProduct.image_url && (
                <Image
                  source={{ uri: cheapestProduct.image_url }}
                  style={cheapestCard.image}
                  resizeMode="cover"
                />
              )}
              <View style={cheapestCard.info}>
                <Text style={cheapestCard.title}>
                  Lowest priced butter near you
                </Text>
                <Text style={cheapestCard.product} numberOfLines={2}>
                  {cheapestProduct.name_with_brand}
                </Text>
                <Text style={cheapestCard.price}>
                  ${cheapestProduct.price.toFixed(2)}
                </Text>
                <Text style={cheapestCard.store}>
                  at {cheapestProduct.brand || cheapestProduct.store}
                </Text>
              </View>
            </View>

            <View style={cheapestCard.actions}>
              <TouchableOpacity
                style={[
                  cheapestCard.addButton,
                  list.some(item => item.id === cheapestProduct.id) && cheapestCard.addButtonAdded
                ]}
                onPress={() => handleAddToList(cheapestProduct)}
                activeOpacity={0.85}
              >
                <Text style={cheapestCard.addButtonText}>
                  {list.some(item => item.id === cheapestProduct.id) ? 'In List' : 'Add to list'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={cheapestCard.detailsButton}
                onPress={() => handleProductPress(cheapestProduct)}
                activeOpacity={0.85}
              >
                <Text style={cheapestCard.detailsButtonText}>View details</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Popular Picks */}
        <View style={section.header}>
          <Text style={section.title}>Popular Picks</Text>
          <TouchableOpacity
            style={section.toggle}
            onPress={handleViewAllPress}
            activeOpacity={0.85}
          >
            <Text style={section.toggleText}>View all</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: tokens.spacing.xxl }}
          contentContainerStyle={{
            paddingHorizontal: tokens.spacing.pad,
            paddingBottom: tokens.spacing.md,
            gap: tokens.spacing.sm,
          }}
        >
          {topProducts.map((product, idx) => (
            <View key={`top-${product.id}-${idx}`}>
              <HorizontalProductCard
                item={product}
                isInList={list.some(item => item.id === product.id)}
                onPress={handleProductPress}
                onAddToList={handleAddToList}
              />
            </View>
          ))}
        </ScrollView>

        {/* Heatmap */}
        <Heatmap
          quickCompareRows={quickCompareRows}
          isLoading={isQuickCompareLoading}
          onRefresh={handleQuickCompareRefresh}
          onPriceCellPress={handlePriceCellPress}
        />
      </ScrollView>

      {/* Price Tooltip */}
      <PriceTooltip
        visible={tooltipVisible}
        data={tooltipData}
        onClose={() => setTooltipVisible(false)}
      />
    </View>
  );
}


















