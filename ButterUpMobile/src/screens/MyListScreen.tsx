import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  useWindowDimensions,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp, ListItem} from '../contexts/AppContext';
import LocationIndicator from '../components/LocationIndicator';
import {tokens} from '../theme/tokens';

export default function MyListScreen() {
  const {list, removeFromList, total, totalSavings, showSnackbar} = useApp();
  const insets = useSafeAreaInsets();
  const {width, height} = useWindowDimensions();
  const headerMargin = insets.top + tokens.spacing.md;

  const handleRemoveItem = (id: string | number) => {
    const itemToRemove = list.find(item => item.id === id);
    console.log('[MyListScreen] Removing item with id:', id);
    removeFromList(id);
    console.log('[MyListScreen] Item removed, new list length:', list.length - 1);
    
    if (itemToRemove) {
      showSnackbar(`${itemToRemove.name} removed from your list`);
    }
  };

  const renderItem = ({item}: {item: ListItem}) => (
    <View style={styles.productCard}>
      <View style={styles.productImageContainer}>
        {item.image_url ? (
          <Image 
            source={{ uri: item.image_url }} 
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.productImagePlaceholder}>
            <Ionicons name="cube-outline" size={32} color={tokens.colors.ink2} />
          </View>
        )}
      </View>
      
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={2}>
          {item.name}
        </Text>
        {item.brand && (
          <Text style={styles.productBrand}>{item.brand}</Text>
        )}
        {item.weight && (
          <Text style={styles.productWeight}>{item.weight}</Text>
        )}
        
        <View style={styles.storeInfo}>
          <Ionicons name="storefront-outline" size={14} color={tokens.colors.ink2} />
          <Text style={styles.storeText}>{item.store}</Text>
        </View>
        
        <View style={styles.priceRow}>
          <Text style={styles.productPrice}>${item.price.toFixed(2)}</Text>
          {item.savings && item.savings > 0 && (
            <View style={styles.savingsChip}>
              <Text style={styles.savingsText}>Save ${item.savings.toFixed(2)}</Text>
            </View>
          )}
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveItem(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.removeButtonInner}>
          <Ionicons name="trash-outline" size={20} color="#ffffff" />
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="list-outline" size={64} color={tokens.colors.ink2} />
      </View>
      <Text style={styles.emptyTitle}>Your list is empty</Text>
      <Text style={styles.emptySubtitle}>
        Add items from the Explore screen to get started
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { marginTop: headerMargin }]}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Shopping List</Text>
          <LocationIndicator
            variant="compact"
            containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
          />
        </View>
      </View>

      {list.length > 0 ? (
        <>
          <FlatList
            data={list}
            renderItem={renderItem}
            keyExtractor={(item) => String(item.id)}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
          
          <View style={styles.footer}>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total ({list.length} items):</Text>
                <Text style={styles.summaryAmount}>${total().toFixed(2)}</Text>
              </View>
              {totalSavings() > 0 && (
                <View style={styles.savingsRow}>
                  <Ionicons name="trending-down" size={16} color="#10B981" />
                  <Text style={styles.savingsText}>You saved ${totalSavings().toFixed(2)}!</Text>
                </View>
              )}
            </View>
          </View>
        </>
      ) : (
        renderEmpty()
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
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
  title: {
    fontSize: tokens.text.title,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.xl,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'flex-start',
  },
  productImageContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#f8fafc',
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  productImage: {
    width: 60,
    height: 60,
  },
  productImagePlaceholder: {
    width: 60,
    height: 60,
    backgroundColor: tokens.colors.pill,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
    paddingTop: 4,
  },
  productName: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 4,
    lineHeight: 18,
  },
  productBrand: {
    fontSize: 11,
    color: tokens.colors.ink2,
    fontWeight: '600',
    marginBottom: 2,
  },
  productWeight: {
    fontSize: 10,
    color: tokens.colors.ink2,
    marginBottom: tokens.spacing.sm,
  },
  storeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
    gap: 4,
  },
  storeText: {
    fontSize: 11,
    color: tokens.colors.ink2,
    fontWeight: '500',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  savingsChip: {
    backgroundColor: 'rgba(16, 185, 129, 0.10)',
    borderRadius: tokens.radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
  },
  removeButton: {
    padding: tokens.spacing.sm,
    marginLeft: tokens.spacing.sm,
    alignSelf: 'flex-start',
  },
  removeButtonInner: {
    backgroundColor: '#ef4444',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  footer: {
    backgroundColor: tokens.colors.card,
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  summaryCard: {
    backgroundColor: tokens.colors.bg,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.sm,
  },
  summaryLabel: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  savingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: tokens.spacing.pad,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  emptyTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: tokens.spacing.lg,
  },
});






