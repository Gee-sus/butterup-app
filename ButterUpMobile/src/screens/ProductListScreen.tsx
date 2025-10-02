import React, {useEffect, useMemo, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  SafeAreaView,
  TextInput,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';

import {productApi} from '../services/api';
import {tokens} from '../theme/tokens';
import LocationIndicator from '../components/LocationIndicator';
import {useLocation} from '../contexts/LocationContext';
import {useApp} from '../contexts/AppContext';

type ListRow = {
  id: string | number;
  name: string;
  brand?: string;
  image_url?: string | null;
  price?: number | null;
  store?: string | null;
  overall_score?: number | null;
  weight?: string | null;
  last_updated?: string | null;
  category?: 'Blocks' | 'Spreadables' | 'Non-dairy' | 'Other';
};

const formatPrice = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return '—';
  }
  return `$${Number(value).toFixed(2)}`;
};

const ProductListScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const {nearbyStoreChains} = useLocation();
  const {addToList, showSnackbar} = useApp();

  const [items, setItems] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [filterCategory, setFilterCategory] = useState<'All' | 'Blocks' | 'Spreadables' | 'Non-dairy'>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const inferCategory = (p: any): 'Blocks' | 'Spreadables' | 'Non-dairy' | 'Other' => {
    const text = `${String(p.category || p.package_type || '')} ${String(p.name || p.name_with_brand || '')}`.toLowerCase();
    if (/vegan|plant|margarine|non[- ]?dairy/.test(text)) return 'Non-dairy';
    if (/spread|spreadable/.test(text)) return 'Spreadables';
    if (/block|unsalted|salted|butter/.test(text)) return 'Blocks';
    return 'Other';
  };

  const formatRelativeTime = (iso?: string | null) => {
    if (!iso) return '';
    const then = new Date(iso).getTime();
    if (!then) return '';
    const now = Date.now();
    const diff = Math.max(0, now - then);
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);

        // fetch base products
        const {data: products} = await productApi.list();
        // fetch quick compare rows for lowest prices and possible ratings
        const {data: quickRows} = await productApi.quickCompare();

        const rows: ListRow[] = (products as any[]).map((p) => {
          // Try to find a quick-compare entry by brand/name similarity
          const qc = Array.isArray(quickRows)
            ? quickRows.find((r: any) => {
                const pn = String(p.name || p.name_with_brand || '').toLowerCase();
                const rb = String(r.brand_display_name || r.brand_name || '').toLowerCase();
                return pn && rb && (pn.includes(rb) || rb.includes(pn));
              })
            : null;

          // Compute lowest price among nearby chains if available
          let lowest: number | null = null;
          let lowestStore: string | null = null;
          let lowestUpdated: string | null = null;
          if (qc && Array.isArray(qc.stores)) {
            qc.stores.forEach((s: any) => {
              if (!s || s.price == null) return;
              if (nearbyStoreChains.length && !nearbyStoreChains.includes(String(s.store))) return;
              if (lowest === null || s.price < lowest) {
                lowest = Number(s.price);
                lowestStore = String(s.store);
                lowestUpdated = s.recorded_at || null;
              }
            });
          }

          return {
            id: p.id || p.slug || p.name,
            name: p.name_with_brand || p.name,
            brand: p.brand,
            image_url: p.image_url,
            weight: p.weight || p.product_size || null,
            overall_score: (p as any).blended_score || (qc as any)?.blended_score || null,
            price: lowest ?? p.price ?? null,
            store: lowestStore || p.store || null,
            last_updated: lowestUpdated || (qc?.stores?.[0]?.recorded_at ?? null) || null,
            category: inferCategory(p),
          } as ListRow;
        });

        if (!alive) return;
        setItems(rows);
      } catch (err) {
        if (!alive) return;
        setError('Unable to load products right now.');
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [nearbyStoreChains]);

  const handleAdd = (row: ListRow) => {
    addToList({
      id: row.id,
      name: row.name,
      brand: row.brand,
      price: Number(row.price || 0),
      image_url: row.image_url || undefined,
      store: row.store || 'Unknown',
      weight: row.weight || undefined,
    });
    showSnackbar(`${row.name} added to your list`);
  };

  const displayed = useMemo(() => {
    const text = searchQuery.trim().toLowerCase();
    const byText = items.filter((it) => {
      if (!text) return true;
      const hay = `${it.name || ''} ${it.brand || ''} ${it.store || ''}`.toLowerCase();
      return hay.includes(text);
    });
    const byCategory = byText.filter((it) =>
      filterCategory === 'All' ? true : it.category === filterCategory
    );
    return byCategory.sort((a, b) => {
      const ap = a.price ?? Number.POSITIVE_INFINITY;
      const bp = b.price ?? Number.POSITIVE_INFINITY;
      if (ap !== bp) return ap - bp;
      return String(a.name).localeCompare(String(b.name));
    });
  }, [items, filterCategory, searchQuery]);

  const renderItem = ({item}: {item: ListRow}) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ProductDetail', {product: item})}
      activeOpacity={0.85}
    >
      <View style={styles.imageWrap}>
        {item.image_url ? (
          <Image source={{uri: item.image_url}} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube-outline" size={28} color={tokens.colors.ink2} />
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
        {item.brand ? <Text style={styles.brand}>{item.brand}</Text> : null}
        {item.weight ? <Text style={styles.meta}>{item.weight}</Text> : null}

        <View style={styles.row}>
          <View style={styles.ratingPill}>
            <Ionicons name="star" size={12} color="#f59e0b" />
            <Text style={styles.ratingText}>
              {item.overall_score != null ? Number(item.overall_score).toFixed(1) : '—'}
            </Text>
          </View>
          <View style={styles.storeRow}>
            <Ionicons name="storefront-outline" size={14} color={tokens.colors.ink2} />
            <Text style={styles.storeText} numberOfLines={1}>{item.store || '—'}</Text>
          </View>
        </View>
        {item.last_updated ? (
          <Text style={styles.updatedText}>Updated {formatRelativeTime(item.last_updated)}</Text>
        ) : null}
      </View>

      <View style={styles.aside}>
        <Text style={styles.price}>{formatPrice(item.price)}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => handleAdd(item)} activeOpacity={0.9}>
          <Ionicons name="add" size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderGridItem = ({item}: {item: ListRow}) => (
    <TouchableOpacity
      style={styles.tile}
      onPress={() => navigation.navigate('ProductDetail', {product: item})}
      activeOpacity={0.9}
    >
      <View style={styles.tileImageWrap}>
        {item.image_url ? (
          <Image source={{uri: item.image_url}} style={styles.tileImage} resizeMode="contain" />
        ) : (
          <View style={styles.tileImagePlaceholder}>
            <Ionicons name="cube-outline" size={28} color={tokens.colors.ink2} />
          </View>
        )}
      </View>
      <Text style={styles.tileName} numberOfLines={2}>{item.name}</Text>
      <View style={styles.tileMetaRow}>
        <View style={styles.ratingPill}>
          <Ionicons name="star" size={12} color="#f59e0b" />
          <Text style={styles.ratingText}>
            {item.overall_score != null ? Number(item.overall_score).toFixed(1) : '—'}
          </Text>
        </View>
        <Text style={styles.tilePrice}>{formatPrice(item.price)}</Text>
      </View>
      <View style={styles.tileFooterRow}>
        <Text style={styles.tileStore} numberOfLines={1}>{item.store || '—'}</Text>
        <TouchableOpacity style={styles.tileAddBtn} onPress={() => handleAdd(item)}>
          <Ionicons name="add" size={16} color="#ffffff" />
        </TouchableOpacity>
      </View>
      {item.last_updated ? (
        <Text style={styles.tileUpdated}>Updated {formatRelativeTime(item.last_updated)}</Text>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>        
        <Text style={styles.title}>All Products</Text>
        <LocationIndicator variant="compact" containerStyle={styles.locationPill} />
      </View>

      <View style={styles.searchBarContainer}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color={tokens.colors.ink2} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={tokens.colors.ink2}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearBtn} accessibilityLabel="Clear search">
              <Ionicons name="close-circle" size={18} color={tokens.colors.ink2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.controlsRow}>
        <View style={styles.segmented}>
          {(['All','Blocks','Spreadables','Non-dairy'] as const).map((c, idx) => (
            <TouchableOpacity
              key={c}
              onPress={() => setFilterCategory(c)}
              style={[
                styles.segmentItem,
                filterCategory === c && styles.segmentItemActive,
                idx === 0 && { borderTopLeftRadius: tokens.radius.xl, borderBottomLeftRadius: tokens.radius.xl },
                idx === 3 && { borderRightWidth: 0 },
              ]}
              activeOpacity={0.85}
            >
              <Text style={[styles.segmentText, filterCategory === c && styles.segmentTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.viewToggle}>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'list' && styles.viewBtnActive]}
            onPress={() => setViewMode('list')}
            activeOpacity={0.85}
          >
            <Ionicons name="reorder-three" size={18} color={viewMode === 'list' ? '#111827' : tokens.colors.ink2} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.viewBtn, viewMode === 'grid' && styles.viewBtnActive]}
            onPress={() => setViewMode('grid')}
            activeOpacity={0.85}
          >
            <Ionicons name="grid-outline" size={16} color={viewMode === 'grid' ? '#111827' : tokens.colors.ink2} />
          </TouchableOpacity>
        </View>
      </View>

      {error ? (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={displayed}
        keyExtractor={(item) => String(item.id)}
        renderItem={viewMode === 'list' ? renderItem : renderGridItem}
        key={viewMode === 'list' ? 'list' : 'grid'}
        numColumns={viewMode === 'grid' ? 2 : 1}
        columnWrapperStyle={viewMode === 'grid' ? { gap: tokens.spacing.sm } : undefined}
        contentContainerStyle={[styles.listContent, viewMode === 'grid' ? { paddingBottom: tokens.spacing.xl, gap: tokens.spacing.sm } : null]}
        ItemSeparatorComponent={viewMode === 'list' ? () => <View style={{height: tokens.spacing.sm}} /> : undefined}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loading
            ? () => (
                <View style={styles.loadingCard}>
                  <Text style={styles.loadingText}>Loading products…</Text>
                </View>
              )
            : () => (
                <View style={styles.emptyCard}>
                  <Text style={styles.emptyTitle}>No products found</Text>
                  <Text style={styles.emptyBody}>
                    {searchQuery ? 'Try clearing your search or adjusting filters.' : 'Please adjust filters or try again.'}
                  </Text>
                </View>
              )
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.bg,
  },
  header: {
    paddingHorizontal: tokens.spacing.pad,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchBarContainer: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.sm,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.card,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  searchIcon: {
    marginRight: tokens.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    padding: 0,
  },
  clearBtn: {
    marginLeft: tokens.spacing.xs,
  },
  locationPill: {
    alignSelf: 'flex-end',
    shadowColor: 'rgba(15, 23, 42, 0.15)',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: tokens.text.title,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  listContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.xl,
  },
  controlsRow: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    flexWrap: 'wrap',
  },
  segmented: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: 'transparent',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  segmentItem: {
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radius.xl,
    backgroundColor: tokens.colors.card,
    marginRight: tokens.spacing.xs,
    marginBottom: tokens.spacing.xs,
  },
  segmentItemActive: {
    backgroundColor: tokens.colors.pill,
    borderColor: tokens.colors.pill,
  },
  segmentText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    fontWeight: '600',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    overflow: 'hidden',
    flexShrink: 0,
    marginLeft: tokens.spacing.sm,
    marginTop: tokens.spacing.xs,
  },
  viewBtn: {
    width: 40,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnActive: {
    backgroundColor: tokens.colors.bg,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.md,
  },
  imageWrap: {
    width: 80,
    height: 80,
    borderRadius: tokens.radius.lg,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  image: {
    width: 64,
    height: 64,
  },
  imagePlaceholder: {
    width: 60,
    height: 60,
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 18,
  },
  brand: {
    fontSize: 11,
    color: tokens.colors.ink2,
    fontWeight: '600',
  },
  meta: {
    fontSize: 10,
    color: tokens.colors.ink2,
    marginTop: 2,
    marginBottom: tokens.spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.md,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: tokens.radius.lg,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  ratingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#92400e',
  },
  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  storeText: {
    fontSize: 11,
    color: tokens.colors.ink2,
    maxWidth: 140,
  },
  updatedText: {
    marginTop: 4,
    fontSize: 10,
    color: tokens.colors.ink2,
  },
  aside: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    minWidth: 72,
    marginLeft: tokens.spacing.md,
  },
  price: {
    fontSize: 18,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  addBtn: {
    marginTop: tokens.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: tokens.colors.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderWidth: 1,
    marginHorizontal: tokens.spacing.pad,
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
  },
  errorText: {
    color: '#991b1b',
  },
  loadingCard: {
    marginHorizontal: tokens.spacing.pad,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    alignItems: 'center',
  },
  loadingText: {
    color: tokens.colors.ink2,
  },
  emptyCard: {
    marginHorizontal: tokens.spacing.pad,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    gap: 4,
  },
  emptyTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptyBody: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  // Grid tile styles
  tile: {
    flex: 1,
    minWidth: 0,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.md,
  },
  tileImageWrap: {
    width: '100%',
    aspectRatio: 1.2,
    borderRadius: tokens.radius.lg,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.sm,
  },
  tileImage: {
    width: '75%',
    height: '75%',
  },
  tileImagePlaceholder: {
    width: '70%',
    height: '70%',
    borderRadius: tokens.radius.md,
    backgroundColor: tokens.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    lineHeight: 18,
  },
  tileMetaRow: {
    marginTop: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tilePrice: {
    fontSize: 16,
    fontWeight: '800',
    color: tokens.colors.ink,
  },
  tileFooterRow: {
    marginTop: tokens.spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tileStore: {
    fontSize: 11,
    color: tokens.colors.ink2,
    flex: 1,
    marginRight: tokens.spacing.sm,
  },
  tileAddBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileUpdated: {
    marginTop: 4,
    fontSize: 10,
    color: tokens.colors.ink2,
  },
});

export default ProductListScreen;
