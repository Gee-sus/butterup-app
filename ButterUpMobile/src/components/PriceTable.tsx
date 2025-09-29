import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Product, Store, Price} from '../types';
import PriceRow from './PriceRow';

interface GroupedProduct {
  brand: string;
  size: number;
  unit: string;
  products: Product[];
}

interface PriceTableProps {
  products: Product[];
  selectedStores: Store[];
  prices: {[productId: number]: {[storeId: number]: Price}};
  onStoreToggle: (store: Store) => void;
}

const PriceTable: React.FC<PriceTableProps> = ({
  products,
  selectedStores,
  prices,
  onStoreToggle,
}) => {
  const maxCols = 3;
  const [expanded, setExpanded] = useState(false);
  
  const visibleStores = expanded ? selectedStores : selectedStores.slice(0, maxCols);
  const overflowCount = Math.max(0, selectedStores.length - visibleStores.length);

  // Group products by brand and size
  const groupProducts = (products: Product[]): GroupedProduct[] => {
    const grouped: {[key: string]: GroupedProduct} = {};
    
    products.forEach(product => {
      const key = `${product.brand}-${product.weight_grams}-${product.package_type}`;
      if (!grouped[key]) {
        grouped[key] = {
          brand: product.brand,
          size: product.weight_grams,
          unit: product.package_type,
          products: [],
        };
      }
      grouped[key].products.push(product);
    });
    
    // Sort by brand name, then by size
    return Object.values(grouped).sort((a, b) => {
      if (a.brand !== b.brand) {
        return a.brand.localeCompare(b.brand);
      }
      return a.size - b.size;
    });
  };

  const groupedProducts = groupProducts(products);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Price Comparison</Text>
        {overflowCount > 0 && (
          <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
            <Text style={styles.expandButtonText}>
              {expanded ? 'Collapse' : `+${overflowCount} more`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Store Chips Row */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeChipsContainer}>
        {selectedStores.map((store) => {
          const isVisible = visibleStores.some(s => s.id === store.id);
          return (
            <TouchableOpacity
              key={store.id}
              style={[
                styles.storeChip,
                isVisible ? styles.storeChipActive : styles.storeChipInactive,
              ]}
              onPress={() => onStoreToggle(store)}>
              <Text
                style={[
                  styles.storeChipText,
                  isVisible ? styles.storeChipTextActive : styles.storeChipTextInactive,
                ]}>
                {store.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <View style={styles.productHeaderColumn}>
          <Text style={styles.headerText}>Product</Text>
        </View>
        {visibleStores.map((store) => {
          return (
            <View key={store.id} style={styles.priceHeaderColumn} {...({} as any)}>
              <Text style={styles.headerText}>{store.name}</Text>
            </View>
          );
        })}
      </View>

      {/* Table Rows */}
      <ScrollView style={styles.tableBody}>
        {groupedProducts.map((group, index) => {
          // Use the first product from the group for display
          const representativeProduct = group.products[0];
          const productPrices = prices[representativeProduct.id] || {};
          
          return (
            <PriceRow
              key={index}
              product={representativeProduct}
              stores={visibleStores}
              prices={productPrices}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    margin: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  expandButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  expandButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
  storeChipsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  storeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  storeChipActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  storeChipInactive: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  storeChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  storeChipTextActive: {
    color: '#ffffff',
  },
  storeChipTextInactive: {
    color: '#6b7280',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  productHeaderColumn: {
    flex: 1,
    paddingRight: 8,
  },
  priceHeaderColumn: {
    width: 80,
    alignItems: 'flex-end',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tableBody: {
    maxHeight: 400,
  },
});

export default PriceTable;

