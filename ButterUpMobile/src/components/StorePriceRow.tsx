import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { tokens } from '../theme/tokens';

interface StorePriceRowProps {
  store: string;
  price: number;
  distance_km?: number;
  isLowest?: boolean;
}

export default function StorePriceRow({ store, price, distance_km, isLowest }: StorePriceRowProps) {
  return (
    <View style={styles.container}>
      <View style={styles.storeInfo}>
        <Text style={styles.storeName}>{store}</Text>
        {distance_km && (
          <Text style={styles.distance}>~{distance_km.toFixed(1)} km</Text>
        )}
      </View>
      
      <Text style={[
        styles.price,
        isLowest && styles.lowestPrice
      ]}>
        ${price.toFixed(2)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    paddingHorizontal: tokens.spacing.lg,
    paddingVertical: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 2,
  },
  distance: {
    fontSize: 10,
    color: tokens.colors.ink2,
    fontWeight: '500',
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  lowestPrice: {
    color: '#10B981',
  },
});
