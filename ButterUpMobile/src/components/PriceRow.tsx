import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Product, Store, Price} from '../types';

interface PriceRowProps {
  product: Product;
  stores: Store[];
  prices: {[storeId: number]: Price};
  key?: string | number;
}

const PriceRow: React.FC<PriceRowProps> = ({product, stores, prices}) => {
  const formatPrice = (price: number) => `$${price.toFixed(2)}`;
  
  const getPriceForStore = (storeId: number) => {
    const price = prices[storeId];
    if (!price) return '–';
    
    if (price.is_on_special && price.special_price) {
      return formatPrice(price.special_price);
    }
    return formatPrice(price.price);
  };

  return (
    <View style={styles.row}>
      {/* Product Info Column */}
      <View style={styles.productColumn}>
        <Text style={styles.brandText}>{product.brand}</Text>
        <Text style={styles.sizeText}>{product.weight_grams}g</Text>
        <Text style={styles.unitText}>{product.package_type}</Text>
      </View>
      
      {/* Store Price Columns */}
      {stores.map((store, index) => (
        <View key={`store-${store.id}-${index}`} style={styles.priceColumn} {...({} as any)}>
          <Text style={styles.priceText}>{getPriceForStore(store.id)}</Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
  },
  productColumn: {
    flex: 1,
    paddingRight: 8,
  },
  brandText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  sizeText: {
    fontSize: 12,
    color: '#374151',
    marginTop: 2,
  },
  unitText: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 1,
    textTransform: 'capitalize',
  },
  priceColumn: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  priceText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    textAlign: 'right',
  },
});

export default PriceRow;

