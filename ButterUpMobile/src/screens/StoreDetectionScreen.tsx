import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {useLocation} from '../contexts/LocationContext';
import {tokens} from '../theme/tokens';
import {normalizeStoreName} from '../utils/stores';

const StoreDetectionScreen: React.FC = () => {
  const {nearbyStores} = useLocation();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // Simulate refresh
    setTimeout(() => setRefreshing(false), 1000);
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      
      <View style={styles.header}>
        <Text style={styles.title}>Store Detection</Text>
        <Text style={styles.subtitle}>Nearby stores in your area</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Detected Stores</Text>
        {nearbyStores.length > 0 ? (
          <View style={styles.storesContainer}>
            {nearbyStores.map((store: any, index: number) => (
              <View key={store.id || index} style={styles.storeCard}>
                <Text style={styles.storeName}>{normalizeStoreName(store.name)}</Text>
                <Text style={styles.storeChain}>{normalizeStoreName(store.chain)}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noStoresText}>No stores detected</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Store Chains</Text>
        <View style={styles.chainsContainer}>
          <View style={styles.chainBadge}>
            <Text style={styles.chainText}>Pak'nSave</Text>
          </View>
          <View style={styles.chainBadge}>
            <Text style={styles.chainText}>Woolworths</Text>
          </View>
          <View style={styles.chainBadge}>
            <Text style={styles.chainText}>New World</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    padding: tokens.spacing.pad,
    backgroundColor: tokens.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  title: {
    fontSize: tokens.text.title,
    fontWeight: 'bold',
    color: tokens.colors.ink,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    marginTop: 4,
  },
  section: {
    margin: tokens.spacing.pad,
  },
  sectionTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '600',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.md,
  },
  storesContainer: {
    marginTop: tokens.spacing.sm,
  },
  storeCard: {
    backgroundColor: tokens.colors.card,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  storeName: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
  },
  storeChain: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    textTransform: 'capitalize',
  },
  noStoresText: {
    textAlign: 'center',
    color: tokens.colors.ink2,
    fontSize: tokens.text.body,
    padding: tokens.spacing.pad,
    fontStyle: 'italic',
  },
  chainsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: tokens.spacing.sm,
  },
  chainBadge: {
    backgroundColor: tokens.colors.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    marginRight: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  chainText: {
    color: '#ffffff',
    fontSize: tokens.text.tiny,
    fontWeight: '600',
  },
});

export default StoreDetectionScreen;