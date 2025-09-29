import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { TopBar } from '../components/TopBar';
import { Card, CardHeader, CardContent } from '../components/Card';
import { Snackbar } from '../components/Snackbar';
import { getStores, getGroupedPrices, GroupedProduct } from '../api/endpoints';

export const HomeScreen: React.FC = () => {
  const [groupedProducts, setGroupedProducts] = useState<GroupedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    visible: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'info',
  });

  const fetchData = async () => {
    try {
      setError(null);
      
      // Fetch stores first
      const stores = await getStores();
      console.log('📦 Fetched stores:', stores.length);
      
      // Get first 3 stores for price comparison
      const firstThreeStores = stores.slice(0, 3).map(store => store.id.toString());
      console.log('🏪 Using stores:', firstThreeStores);
      
      // Fetch grouped prices for these stores
      const prices = await getGroupedPrices(firstThreeStores);
      console.log('💰 Fetched grouped prices:', prices.length);
      
      setGroupedProducts(prices);
      
      if (prices.length === 0) {
        setSnackbar({
          visible: true,
          message: 'No price data available. Make sure the backend is running.',
          type: 'info',
        });
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setSnackbar({
        visible: true,
        message: 'Failed to load data. Check your connection.',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderProductItem = ({ item }: { item: GroupedProduct }) => {
    const { product, prices } = item;
    
    return (
      <Card style={styles.productCard}>
        <CardHeader
          title={`${product.brand} ${product.name}`}
          subtitle={`${product.weight_grams}g`}
        />
        <CardContent>
          <Text style={styles.pricesTitle}>Prices:</Text>
          {Object.entries(prices).map(([storeName, priceData]) => (
            <View key={storeName} style={styles.priceRow}>
              <Text style={styles.storeName}>{storeName}:</Text>
              <Text style={styles.price}>
                ${priceData.price}
                {priceData.is_on_special && priceData.special_price && (
                  <Text style={styles.specialPrice}>
                    {' '}(Special: ${priceData.special_price})
                  </Text>
                )}
              </Text>
            </View>
          ))}
        </CardContent>
      </Card>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {error ? 'Failed to load data' : 'No products found'}
      </Text>
      {error && (
        <Text style={styles.errorText}>{error}</Text>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <TopBar title="ButterUp" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Loading butter prices...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TopBar title="ButterUp" />
      
      <FlatList
        data={groupedProducts}
        renderItem={renderProductItem}
        keyExtractor={(item) => item.product.id.toString()}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
      />
      
      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        type={snackbar.type}
        onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  listContainer: {
    paddingVertical: 8,
  },
  productCard: {
    marginVertical: 4,
  },
  pricesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  storeName: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  price: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  specialPrice: {
    color: '#4CAF50',
    fontSize: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#F44336',
    textAlign: 'center',
  },
});
