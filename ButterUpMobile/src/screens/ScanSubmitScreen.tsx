import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  Dimensions,
  Animated,
  PanResponder,
  Image,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import type { BarcodeScanningResult } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../contexts/AppContext';
import { Picker } from '@react-native-picker/picker';
import LocationIndicator from '../components/LocationIndicator';
import ProductResultCard from '../components/ProductResultCard';
import StorePriceRow from '../components/StorePriceRow';
import {scanApi, getPricesByGTIN, offApi} from '../services/api';
import type { OFFProduct } from '../services/api';
import {tokens} from '../theme/tokens';
type Mode = 'menu' | 'result' | 'submit' | 'scanner';
type ProductResult = {
  id?: string | number;
  name_with_brand?: string;
  image_url?: string;
  quantity?: string | null;
  nutriScore?: string | null;
  nutriments?: any;
  source?: 'local' | 'off' | 'unknown';
  size_grams?: number | null;
};
interface StorePrice {
  store: string;
  price: number;
  distance_km?: number;
}

const NUTRIMENT_FIELDS: Array<{ key: string; label: string; unit: string }> = [
  { key: 'energy_kcal_100g', label: 'Energy (kcal)', unit: 'kcal' },
  { key: 'energy_kj_100g', label: 'Energy (kJ)', unit: 'kJ' },
  { key: 'fat_100g', label: 'Fat', unit: 'g' },
  { key: 'saturated_fat_100g', label: 'Saturated fat', unit: 'g' },
  { key: 'carbohydrates_100g', label: 'Carbohydrates', unit: 'g' },
  { key: 'sugars_100g', label: 'Sugars', unit: 'g' },
  { key: 'fiber_100g', label: 'Fibre', unit: 'g' },
  { key: 'proteins_100g', label: 'Protein', unit: 'g' },
  { key: 'salt_100g', label: 'Salt', unit: 'g' },
  { key: 'sodium_100g', label: 'Sodium', unit: 'g' },
];

const buildPriceView = (nearbyOptions: any[]) => {
  const toNum = (value: unknown) => {
    if (typeof value === 'number') {
      return value;
    }
    const parsed = parseFloat(String(value ?? '').replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : NaN;
  };

  const rows = (nearbyOptions || [])
    .map((option: any) => {
      const price = toNum(option?.price);
      if (!Number.isFinite(price)) {
        return null;
      }
      const store = [option?.store?.chain, option?.store?.name]
        .filter(Boolean)
        .join(' ') || 'Unknown store';
      const distanceKm = typeof option?.distance_m === 'number'
        ? option.distance_m / 1000
        : undefined;
      return { store, price, distanceKm };
    })
    .filter(Boolean) as Array<{ store: string; price: number; distanceKm?: number }>;

  let cheapest: { store?: string; price?: number } = {};
  let potentialSavings: number | null = null;

  if (rows.length) {
    const cheapestRow = rows.reduce(
      (min, row) => (row.price < min.price ? row : min),
      rows[0]
    );
    cheapest = { store: cheapestRow.store, price: cheapestRow.price };

    const nearest = rows
      .filter((row) => typeof row.distanceKm === 'number')
      .sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity))[0];

    const cheapestPrice = cheapestRow.price;
    if (nearest) {
      potentialSavings = Math.max(0, nearest.price - cheapestPrice);
    } else if (rows.length >= 2) {
      const prices = rows.map((row) => row.price).sort((a, b) => a - b);
      const mid = Math.floor(prices.length / 2);
      const median =
        prices.length % 2 === 1
          ? prices[mid]
          : (prices[mid - 1] + prices[mid]) / 2;
      potentialSavings = Math.max(0, median - cheapestPrice);
    }
    if (potentialSavings === 0) {
      potentialSavings = null;
    }
  }

  return { rows, cheapest, potentialSavings };
};

const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];
export default function ScanSubmitScreen() {
  const {addToList, showSnackbar} = useApp();
  const insets = useSafeAreaInsets();
  const headerMargin = insets.top + tokens.spacing.md;
  const [cameraPermission, requestBarcodeCameraPermission] = useCameraPermissions();
  const [mode, setMode] = useState<Mode>('menu');
  const [resultSource, setResultSource] = useState<'photo' | 'barcode' | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  // Result state
  const [identifiedProduct, setIdentifiedProduct] = useState<ProductResult | null>(null);
  const [storePrices, setStorePrices] = useState<StorePrice[]>([]);
  // Submit state
  const [storeName, setStoreName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [productId, setProductId] = useState<number | undefined>(undefined);
  const [gtin, setGtin] = useState('');
  const [scanning, setScanning] = useState<boolean>(true);
  const [priceRows, setPriceRows] = useState<Array<{store: string; price: number; distanceKm?: number}>>([]);
  const [cheapest, setCheapest] = useState<{store?: string; price?: number}>({});
  const [potentialSavings, setPotentialSavings] = useState<number | null>(null);
  const [productSize, setProductSize] = useState<number | null>(null);
  const lastScanTimeRef = useRef<number>(0);
  const lastIgnoredDataRef = useRef<string>('');
  const screenH = Dimensions.get('window').height;
  const OPEN_Y = Math.round(screenH * 0.34);
  const CLOSED_Y = Math.round(screenH - 120);
  const sheetY = useRef(new Animated.Value(screenH)).current;
  const sheetYRef = useRef<number>(screenH);
  const panStartY = useRef(OPEN_Y);
  useEffect(() => {
    const listenerId = sheetY.addListener(({ value }) => {
      sheetYRef.current = value;
    });
    return () => {
      sheetY.removeListener(listenerId);
    };
  }, [sheetY]);
  useEffect(() => {
    if (mode !== 'scanner') {
      sheetY.setValue(screenH);
      sheetYRef.current = screenH;
    }
  }, [mode, screenH, sheetY]);
  const nutrimentEntries = useMemo(() => {
    if (!identifiedProduct?.nutriments) {
      return [];
    }
    const entries: Array<{ key: string; label: string; value: string }> = [];
    NUTRIMENT_FIELDS.forEach(({ key, label, unit }) => {
      const raw = identifiedProduct.nutriments?.[key];
      if (typeof raw !== 'number' || Number.isNaN(raw)) {
        return;
      }
      const numericValue = unit === 'kcal' || unit === 'kJ'
        ? Math.round(raw)
        : Number.parseFloat(raw.toFixed(1));
      entries.push({
        key,
        label,
        value: `${numericValue} ${unit}`,
      });
    });
    return entries;
  }, [identifiedProduct?.nutriments]);

  const fetchOffProduct = (code: string): Promise<OFFProduct | null> =>
    offApi
      .getProduct(code, {
        fields: ['name', 'brand', 'quantity', 'nutriScore', 'nutriments', 'image'],
      })
      .then((result) => {
        if (result.status === 404) {
          return null;
        }
        if (result.error) {
          console.warn('[ScanSubmitScreen] OFF product lookup error:', result.error);
        }
        return result.data ?? null;
      })
      .catch((error) => {
        console.warn('[ScanSubmitScreen] OFF product lookup failed:', error);
        return null;
      });

  const mergeOffDetails = (offProduct: OFFProduct | null) => {
    if (!offProduct) {
      return;
    }
    const fallbackName = `${offProduct.brand ?? ''} ${offProduct.name ?? ''}`.trim() || 'Product';
    setIdentifiedProduct((prev) => {
      const base: ProductResult = prev ?? {
        name_with_brand: fallbackName,
        source: 'off',
      };

      return {
        ...base,
        name_with_brand: base.name_with_brand || fallbackName,
        image_url: base.image_url || offProduct.image || undefined,
        quantity: offProduct.quantity ?? base.quantity ?? null,
        nutriScore: offProduct.nutriScore ?? base.nutriScore ?? null,
        nutriments: offProduct.nutriments ?? base.nutriments,
        source: base.source ?? 'off',
      };
    });
  };
  const requestImagePermission = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };
  const requestCameraPermission = async () => {
    const {status} = await ImagePicker.requestCameraPermissionsAsync();
    return status === 'granted';
  };
  const getCurrentLocation = async () => {
    try {
      const {status} = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        return null;
      }
      const location = await Location.getCurrentPositionAsync({});
      return {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
    } catch (error) {
      console.warn('[ScanSubmitScreen] Location access failed:', error);
      return null;
    }
  };
  const handleScanProduct = async () => {
    const cameraPermission = await requestCameraPermission();
    if (!cameraPermission) {
      Alert.alert('Permission Required', 'Camera permission is needed to scan products');
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        await identifyProduct(result.assets[0].uri);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };
  const handleSubmitPricePhoto = async () => {
    Alert.alert(
      'Select Photo Source',
      'Choose how you want to add a photo',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Camera',
          onPress: () => pickImageForSubmit('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImageForSubmit('library'),
        },
      ]
    );
  };

  const identifyProduct = async (uri: string) => {
    setLoading(true);
    try {
      setScanning(false);
      const location = await getCurrentLocation().catch(() => null);
      const identified = await scanApi.identifyByPhoto(uri, location ?? undefined);

      setIdentifiedProduct({
        id: identified?.id ?? undefined,
        name_with_brand: identified?.name_with_brand ?? identified?.name ?? 'Product',
        image_url: identified?.image_url ?? (identified as any)?.image ?? undefined,
        quantity:
          identified?.quantity ??
          (typeof identified?.size_grams === 'number' ? `${identified.size_grams} g` : null),
        nutriScore: identified?.nutriScore ?? (identified as any)?.nutriscore_grade ?? null,
        nutriments: identified?.nutriments ?? undefined,
        source: identified?.source ?? 'unknown',
        size_grams: typeof identified?.size_grams === 'number' ? identified.size_grams : null,
      });
      setProductSize(typeof identified?.size_grams === 'number' ? identified.size_grams : null);

      const nearby = await scanApi.nearbyPrices(identified?.id, location ?? undefined).catch(() => null);
      const options = Array.isArray(nearby)
        ? nearby
        : Array.isArray((nearby as any)?.nearby_options)
          ? (nearby as any)?.nearby_options
          : [];
      const { rows, cheapest: nextCheapest, potentialSavings: nextPotentialSavings } = buildPriceView(options);
      setPriceRows(rows);
      setCheapest(nextCheapest);
      setPotentialSavings(nextPotentialSavings);
      setStorePrices(
        rows.map((row) => ({
          store: row.store,
          price: row.price,
          distance_km: typeof row.distanceKm === 'number' ? row.distanceKm : undefined,
        }))
      );

      animateSheetTo(CLOSED_Y);
      setResultSource('photo');
      setMode('result');
    } catch (error) {
      console.warn('[ScanSubmitScreen] identifyProduct failed:', error);
      Alert.alert(
        'Identification Failed',
        "We couldn't identify this product. Showing limited details."
      );
      setIdentifiedProduct((prev) => prev ?? { name_with_brand: 'Product', source: 'unknown' });
      setPriceRows([]);
      setStorePrices([]);
      setCheapest({});
      setPotentialSavings(null);
      setResultSource('photo');
      setMode('result');
    } finally {
      setLoading(false);
    }
  };

  const pickImageForSubmit = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await requestCameraPermission()
      : await requestImagePermission();

    if (!permission) {
      Alert.alert('Permission Required', `${source === 'camera' ? 'Camera' : 'Photo library'} permission is needed`);
      return;
    }

    try {
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.8,
          });

      if (!result.canceled && result.assets?.[0]) {
        let nextUri = result.assets[0].uri;
        try {
          const manipulated = await ImageManipulator.manipulateAsync(
            nextUri,
            [],
            {compress: 0.7, format: ImageManipulator.SaveFormat.JPEG},
          );
          if (manipulated?.uri) {
            nextUri = manipulated.uri;
          }
        } catch (err) {
          console.warn('[ScanSubmitScreen] Image manipulation failed:', err);
        }

        setImageUri(nextUri);
        setMode('submit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  function animateSheetTo(target: number) {
    Animated.spring(sheetY, {
      toValue: target,
      useNativeDriver: true,
      bounciness: 0,
      speed: 18,
    }).start(() => {
      const isOpen = target === OPEN_Y;
      if (!isOpen) {
        setScanning(true);
      }
    });
  }
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderGrant: () => {
        panStartY.current = sheetYRef.current;
      },
      onPanResponderMove: (_, gestureState) => {
        const next = Math.min(
          Math.max(OPEN_Y, panStartY.current + gestureState.dy),
          CLOSED_Y,
        );
        sheetY.setValue(next);
      },
      onPanResponderRelease: (_, gestureState) => {
        const current = sheetYRef.current;
        const halfway = (OPEN_Y + CLOSED_Y) / 2;
        const shouldClose = gestureState.vy > 0.6 || current > halfway;
        animateSheetTo(shouldClose ? CLOSED_Y : OPEN_Y);
      },
    }),
  ).current;
  const openBarcodeScanner = async () => {
    try {
      if (!cameraPermission) {
        // Permission is still loading
        return;
      }
      
      if (!cameraPermission.granted) {
        const { granted } = await requestBarcodeCameraPermission();
        if (!granted) {
          Alert.alert('Camera', 'Enable camera to scan barcodes.');
          return;
        }
      }
      
      setMode('scanner');
      setResultSource(null);
      setGtin('');
      setScanning(true);
      setIdentifiedProduct(null);
      setPriceRows([]);
      setCheapest({});
      setPotentialSavings(null);
      setProductSize(null);
      sheetY.setValue(CLOSED_Y);
      sheetYRef.current = CLOSED_Y;
      lastScanTimeRef.current = 0;
    } catch (error) {
      console.warn('[ScanSubmitScreen] Unable to open barcode scanner:', error);
      Alert.alert('Error', 'Failed to open the barcode scanner. Please try again.');
    }
  };
  const onBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (!scanning) {
      return;
    }
    const now = Date.now();
    if (now - lastScanTimeRef.current < 1000) {
      return;
    }
    lastScanTimeRef.current = now;
    setScanning(false);
    const rawData = String(result?.data ?? '').trim();
    if (!rawData) {
      setScanning(true);
      return;
    }
    
    const digitsOnly = rawData.replace(/\D/g, '');

    // Only accept numeric barcodes of valid lengths (8, 12, 13, or 14 digits)
    if (!digitsOnly || ![8, 12, 13, 14].includes(digitsOnly.length)) {
      if (rawData.includes('://') || rawData.includes('http') || rawData.includes('www.')) {
        if (lastIgnoredDataRef.current !== rawData) {
          console.log('[ScanSubmitScreen] Ignoring URL/QR code:', rawData);
          lastIgnoredDataRef.current = rawData;
        }
      } else {
        console.log('[ScanSubmitScreen] Invalid barcode data:', rawData);
      }
      setScanning(true);
      return;
    }
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.warn('[ScanSubmitScreen] Haptics unavailable:', err);
    }
    lastIgnoredDataRef.current = '';
    setGtin(digitsOnly);
    const loc = await getCurrentLocation();
    if (!loc?.lat || !loc?.lng) {
      Alert.alert('Location', 'Turn on location to find nearby stores.');
      setScanning(true);
      return;
    }
    setLoading(true);
    setResultSource('barcode');
    const offPromise = fetchOffProduct(digitsOnly);
    try {
      const data = await getPricesByGTIN({ gtin: digitsOnly, lat: loc.lat, lng: loc.lng, radius_m: 5000 });
      const nameWithBrand = `${data.product.brand ?? ''} ${data.product.name ?? ''}`.trim() || 'Product';
      const sizeGrams = typeof data.product.size_grams === 'number' ? data.product.size_grams : null;
      const productDetails: any = data.product ?? {};
      setIdentifiedProduct({
        id: productDetails.id ?? data.product?.id,
        name_with_brand: nameWithBrand,
        image_url: productDetails.image ?? productDetails.image_url ?? undefined,
        quantity: typeof sizeGrams === 'number' ? `${sizeGrams} g` : productDetails.quantity ?? null,
        nutriScore: productDetails.nutriScore ?? productDetails.nutriscore_grade ?? null,
        nutriments: productDetails.nutriments ?? undefined,
        source: 'local',
        size_grams: sizeGrams,
      });
      setProductSize(sizeGrams);

      const options = data.nearby_options ?? [];
      const { rows, cheapest: nextCheapest, potentialSavings: nextPotentialSavings } = buildPriceView(options);
      setPriceRows(rows);
      setCheapest(nextCheapest);
      setPotentialSavings(nextPotentialSavings);
      setStorePrices(
        rows.map((row) => ({
          store: row.store,
          price: row.price,
          distance_km: typeof row.distanceKm === 'number' ? row.distanceKm : undefined,
        }))
      );
      setResultSource('barcode');
      animateSheetTo(OPEN_Y);
      const offProduct = await offPromise;
      mergeOffDetails(offProduct);
    } catch (error) {
      console.warn('[ScanSubmitScreen] getPricesByGTIN failed:', error);
      const message = (error && typeof error === 'object' && 'message' in error)
        ? String((error as any).message)
        : 'Failed to fetch prices';
      let handled = false;
      const offProduct = await offPromise;
      if (offProduct) {
        mergeOffDetails(offProduct);
        setStorePrices([]);
        setPriceRows([]);
        setCheapest({});
        setPotentialSavings(null);
        setProductSize(null);
        setResultSource('barcode');
        animateSheetTo(OPEN_Y);
        if (typeof showSnackbar === 'function') {
          showSnackbar('No ButterUp prices yet - showing Open Food Facts details.');
        }
        handled = true;
      }
      if (!handled) {
        Alert.alert('Scan error', message);
        setProductSize(null);
        setScanning(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitPriceCorrection = async () => {
    if (!imageUri || !price.trim()) {
      Alert.alert('Missing Information', 'Please provide price');
      return;
    }

    const finalStoreName = selectedStore || storeName.trim();
    if (!finalStoreName) {
      Alert.alert('Missing Information', 'Please select or enter a store name');
      return;
    }

    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await scanApi.submitPriceCorrection({
        product_id: productId,
        store: finalStoreName,
        price: parseFloat(price),
        imageUri,
        lat: location?.lat,
        lng: location?.lng,
        note: note.trim() || undefined,
      });

      showSnackbar('Price correction submitted successfully!');
      resetToMenu();
    } catch (error) {
      Alert.alert('Submission Failed', 'Failed to submit price correction. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetToMenu = () => {
    setMode('menu');
    setResultSource(null);
    setImageUri(null);
    setIdentifiedProduct(null);
    setStorePrices([]);
    setStoreName('');
    setPrice('');
    setNote('');
    setSelectedStore('');
    setProductId(undefined);
    setLoading(false);
    setGtin('');
    setScanning(true);
    setPriceRows([]);
    setCheapest({});
    setPotentialSavings(null);
    setProductSize(null);
    sheetY.setValue(screenH);
    sheetYRef.current = screenH;
    lastScanTimeRef.current = 0;
    lastIgnoredDataRef.current = '';
  };
  const handleWrongPrice = () => {
    if (identifiedProduct?.id) {
      setProductId(identifiedProduct.id);
    } else {
      setProductId(undefined);
    }
    setMode('submit');
  };
  if (mode === 'result') {
    if (resultSource === 'photo') {
      const sortedPriceRows = [...priceRows].sort(
        (a, b) =>
          a.price - b.price ||
          (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY)
      );

      return (
        <SafeAreaView style={styles.container}>
          <View style={[styles.photoHeader, { marginTop: headerMargin }]}>
            <TouchableOpacity style={styles.photoHeaderButton} onPress={resetToMenu}>
              <Text style={styles.photoHeaderButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.photoHeaderButton}
              onPress={() => {
                void openBarcodeScanner();
              }}
            >
              <Text style={styles.photoHeaderButtonText}>Rescan</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.photoScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {!!identifiedProduct?.image_url && (
              <Image source={{ uri: identifiedProduct.image_url }} style={styles.photoImage} />
            )}
            <Text style={styles.photoTitle}>{identifiedProduct?.name_with_brand ?? 'Product'}</Text>
            {!!identifiedProduct?.quantity && (
              <Text style={styles.photoSubtitle}>{identifiedProduct.quantity}</Text>
            )}
            {typeof productSize === 'number' && !identifiedProduct?.quantity && (
              <Text style={styles.photoSubtitle}>{productSize} g</Text>
            )}

            {(cheapest?.price != null || (potentialSavings != null && potentialSavings > 0)) && (
              <View style={styles.photoChipRow}>
                {cheapest?.price != null && (
                  <View style={styles.photoChip}>
                    <Text style={styles.photoChipText}>
                      {`Cheapest nearby: ${cheapest.store ?? 'Unknown'} - $${(cheapest.price ?? 0).toFixed(2)}`}
                    </Text>
                  </View>
                )}
                {potentialSavings != null && potentialSavings > 0 && (
                  <View style={styles.photoChip}>
                    <Text style={styles.photoChipText}>
                      {`Potential savings up to $${potentialSavings.toFixed(2)}`}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={styles.photoSection}>
              <Text style={styles.photoSectionTitle}>Prices Near You</Text>
              {sortedPriceRows.length ? (
                sortedPriceRows.map((row, index) => (
                  <View key={`${row.store}-${index}`} style={styles.photoPriceCard}>
                    <Text style={styles.photoPriceStore}>{row.store}</Text>
                    <Text style={styles.photoPriceMeta}>
                      ${row.price.toFixed(2)}
                      {typeof row.distanceKm === 'number' ? ` - ${row.distanceKm.toFixed(2)} km` : ''}
                    </Text>
                    {cheapest?.price != null && row.price > (cheapest.price ?? Infinity) && (
                      <Text style={styles.photoPriceSave}>
                        Save ${(row.price - (cheapest.price ?? row.price)).toFixed(2)} vs. here
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <View style={styles.photoEmptyCard}>
                  <Text style={styles.photoEmptyText}>No ButterUp prices yet nearby.</Text>
                  {identifiedProduct?.source === 'off' && (
                    <Text style={styles.photoEmptyHint}>Showing Open Food Facts details only.</Text>
                  )}
                </View>
              )}
            </View>

            {nutrimentEntries.length > 0 && (
              <View style={styles.photoSection}>
                <Text style={styles.photoSectionTitle}>Nutrition (per 100g)</Text>
                <View style={styles.photoNutritionCard}>
                  {nutrimentEntries.map((item) => (
                    <View key={item.key} style={styles.photoNutritionRow}>
                      <Text style={styles.photoNutritionLabel}>{item.label}</Text>
                      <Text style={styles.photoNutritionValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.photoActions}>
              <TouchableOpacity
                style={[styles.photoActionButton, styles.photoPrimaryAction]}
                onPress={handleWrongPrice}
              >
                <Text style={[styles.photoActionText, styles.photoActionTextPrimary]}>Submit a price</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoActionButton}
                onPress={() => {
                  void openBarcodeScanner();
                }}
              >
                <Text style={styles.photoActionText}>Scan another product</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    if (identifiedProduct) {
      const lowestPrice =
        storePrices.length > 0
          ? Math.min(...storePrices.map((p) => p.price))
          : undefined;
      return (
        <SafeAreaView style={styles.container}>
          <View style={[styles.header, { marginTop: headerMargin }]}>
            <View style={styles.headerRow}>
              <View style={styles.headerLeft}>
                <TouchableOpacity
                  style={styles.headerBackButton}
                  onPress={resetToMenu}
                  accessibilityLabel="Back to scan"
                >
                  <Ionicons name="chevron-back" size={20} color={tokens.colors.ink} />
                </TouchableOpacity>
                <Text style={styles.title}>Product Found</Text>
              </View>
              <LocationIndicator
                variant="compact"
                containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
              />
            </View>
          </View>
          <View style={[styles.mainContent, styles.resultContainer]}>
            <View style={styles.resultContentWrapper}>
              <ScrollView
                style={styles.resultScrollView}
                contentContainerStyle={styles.resultScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.productResultIsolationWrapper}>
                  <View style={styles.productResultWrapper}>
                    <ProductResultCard
                      name={identifiedProduct.name_with_brand ?? 'Product'}
                      rating={0}
                      image_url={identifiedProduct.image_url}
                    />
                  </View>
                </View>
                {identifiedProduct.source === 'off' ? (
                  <View style={styles.noticeCard}>
                    <Text style={styles.noticeTitle}>No ButterUp prices yet</Text>
                    <Text style={styles.noticeMessage}>
                      We pulled these details from Open Food Facts. Add a price to help the community.
                    </Text>
                  </View>
                ) : null}
                {(identifiedProduct.quantity || identifiedProduct.nutriScore) ? (
                  <View style={styles.metaRow}>
                    {identifiedProduct.quantity ? (
                      <Text style={styles.metaText}>Package size {identifiedProduct.quantity}</Text>
                    ) : null}
                    {identifiedProduct.nutriScore ? (
                      <View style={styles.nutriScorePill}>
                        <Text style={styles.nutriScoreLabel}>Nutri-Score</Text>
                        <Text style={styles.nutriScoreValue}>{identifiedProduct.nutriScore}</Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {nutrimentEntries.length > 0 ? (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Nutrition (per 100g)</Text>
                    <View style={styles.nutritionCard}>
                      {nutrimentEntries.map((item) => (
                        <View key={item.key} style={styles.nutrientRow}>
                          <Text style={styles.nutrientLabel}>{item.label}</Text>
                          <Text style={styles.nutrientValue}>{item.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Prices Near You</Text>
                  {storePrices.length > 0 ? (
                    storePrices
                      .sort((a, b) => a.price - b.price)
                      .map((storePrice, index) => (
                        <StorePriceRow
                          key={index}
                          store={storePrice.store}
                          price={storePrice.price}
                          distance_km={storePrice.distance_km}
                          isLowest={lowestPrice != null ? storePrice.price === lowestPrice : false}
                        />
                      ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyText}>No nearby prices yet - be the first to submit!</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.correctionButton} onPress={handleWrongPrice}>
                  <Text style={styles.correctionButtonText}>Wrong price? Submit a correction</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.photoHeader, { marginTop: headerMargin }]}>
          <TouchableOpacity style={styles.photoHeaderButton} onPress={resetToMenu}>
            <Text style={styles.photoHeaderButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  if (mode === 'scanner') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={[styles.header, { marginTop: headerMargin }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Scan Barcode</Text>
            <LocationIndicator
              variant="compact"
              containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
            />
          </View>
        </View>
        <View style={styles.scannerContainer}>
          <CameraView
            onBarcodeScanned={scanning ? onBarCodeScanned : undefined}
            style={StyleSheet.absoluteFillObject}
            barcodeScannerSettings={{
              barcodeTypes: ['ean13', 'ean8', 'upc_a', 'qr'],
            }}
          />
          <Animated.View
            style={[styles.quickCompareSheet, { transform: [{ translateY: sheetY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetHeading}>
              {(identifiedProduct?.name_with_brand ?? 'Product').trim()}
            </Text>
            {identifiedProduct?.source === 'off' ? (
              <Text style={styles.sheetNotice}>
                No ButterUp prices yet - data from Open Food Facts.
              </Text>
            ) : null}
            {gtin ? <Text style={styles.sheetSubheading}>GTIN {gtin}</Text> : null}
            {typeof productSize === 'number' && productSize > 0 ? (
              <Text style={styles.sheetMeta}>{productSize} g</Text>
            ) : identifiedProduct?.quantity ? (
              <Text style={styles.sheetMeta}>{identifiedProduct.quantity}</Text>
            ) : null}
            {identifiedProduct?.nutriScore ? (
              <View style={styles.sheetNutriScore}>
                <Text style={styles.sheetNutriScoreLabel}>Nutri-Score</Text>
                <Text style={styles.sheetNutriScoreValue}>{identifiedProduct.nutriScore}</Text>
              </View>
            ) : null}
            {cheapest?.store && typeof cheapest?.price === 'number' ? (
              <View style={styles.cheapestPill}>
                <Text style={styles.cheapestPillText}>
                  Cheapest nearby: {cheapest.store} - ${cheapest.price.toFixed(2)}
                </Text>
              </View>
            ) : null}
            {potentialSavings !== null ? (
              <Text style={styles.savingsText}>
                Potential savings up to ${potentialSavings.toFixed(2)}
              </Text>
            ) : null}
            <View style={styles.storeList}>
              {priceRows.map((row, index) => (
                <View key={`${row.store}-${index}`} style={styles.storeRow}>
                  <View>
                    <Text style={styles.storeName}>{row.store}</Text>
                    {typeof row.distanceKm === 'number' && (
                      <Text style={styles.storeDistance}>{row.distanceKm.toFixed(1)} km away</Text>
                    )}
                  </View>
                  <Text style={styles.storePrice}>${row.price.toFixed(2)}</Text>
                </View>
              ))}
              {priceRows.length === 0 && (
                <Text style={styles.emptyNearbyText}>No nearby prices yet.</Text>
              )}
            </View>
            {nutrimentEntries.length > 0 ? (
              <>
                <Text style={styles.sheetNutritionTitle}>Nutrition (per 100g)</Text>
                <View style={styles.nutritionCard}>
                  {nutrimentEntries.map((item) => (
                    <View key={item.key} style={styles.nutrientRow}>
                      <Text style={styles.nutrientLabel}>{item.label}</Text>
                      <Text style={styles.nutrientValue}>{item.value}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </Animated.View>
        </View>
        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        )}
      </SafeAreaView>
    );
  }
  if (mode === 'submit') {
    return (
      <SafeAreaView style={styles.container}>
          <View style={[styles.header, { marginTop: headerMargin }]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Submit Price</Text>
              <LocationIndicator
                variant="compact"
                containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
              />
            </View>
          </View>
        <View style={styles.mainContent}>
          <ScrollView 
            style={styles.resultScrollView} 
            contentContainerStyle={styles.resultScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {imageUri && (
              <View style={styles.imagePreview}>
                <Text style={styles.imageLabel}>Selected Photo:</Text>
                <View style={styles.imagePlaceholder}>
                  <Ionicons name="image-outline" size={32} color={tokens.colors.ink2} />
                </View>
              </View>
            )}
            <View style={styles.form}>
              <Text style={styles.label}>Store *</Text>
              <View style={styles.storeSelector}>
                <Picker
                  selectedValue={selectedStore}
                  onValueChange={setSelectedStore}
                  style={styles.picker}
                >
                  <Picker.Item label="Select a store..." value="" />
                  {MAIN_STORES.map(store => (
                    <Picker.Item key={store} label={store} value={store} />
                  ))}
                  <Picker.Item label="Other..." value="other" />
                </Picker>
              </View>
              {selectedStore === 'other' && (
                <TextInput
                  style={styles.input}
                  value={storeName}
                  onChangeText={setStoreName}
                  placeholder="Enter store name"
                />
              )}
              <Text style={styles.label}>Price *</Text>
              <TextInput
                style={styles.input}
                value={price}
                onChangeText={setPrice}
                placeholder="e.g., 4.50"
                keyboardType="numeric"
              />
              <Text style={styles.label}>Note (optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={note}
                onChangeText={setNote}
                placeholder="Any additional details..."
                multiline
                numberOfLines={3}
              />
              <TouchableOpacity 
                style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
                onPress={submitPriceCorrection}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Submit Price Correction</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.container}>
        <View style={[styles.header, { marginTop: headerMargin }]}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Scan & Submit</Text>
            <LocationIndicator
              variant="compact"
              containerStyle={[styles.locationPill, { alignSelf: 'auto', marginBottom: 0 }]}
            />
          </View>
        </View>
      <View style={styles.mainContent}>
        <View style={styles.welcomeSection}>
          <View style={styles.welcomeIcon}>
            <Ionicons name="scan" size={64} color={tokens.colors.accent} />
          </View>
          <Text style={styles.welcomeTitle}>Scan or Submit</Text>
          <Text style={styles.welcomeSubtitle}>
            Identify butter products by scanning them, or help improve our data by submitting shelf photos with prices
          </Text>
        </View>
      <View style={styles.featuresSection}>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(245, 158, 11, 0.1)' }]}>
            <Ionicons name="camera" size={24} color="#f59e0b" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Scan Product</Text>
            <Text style={styles.featureDescription}>Take a photo to identify the product and see nearby prices</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
            <Ionicons name="barcode-outline" size={24} color="#6366F1" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Scan Barcode</Text>
            <Text style={styles.featureDescription}>Scan GTIN barcodes for a quick price submission</Text>
          </View>
        </View>
        <View style={styles.featureItem}>
          <View style={[styles.featureIcon, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
            <Ionicons name="cloud-upload" size={24} color="#10B981" />
          </View>
          <View style={styles.featureContent}>
            <Text style={styles.featureTitle}>Submit Price</Text>
              <Text style={styles.featureDescription}>Upload shelf photos with prices to help improve our database</Text>
            </View>
          </View>
        </View>
      </View>
      {/* Bottom Action Buttons */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity style={styles.bottomPrimaryButton} onPress={handleScanProduct}>
          <View style={styles.bottomButtonContent}>
            <Ionicons name="camera" size={24} color="#fff" />
            <Text style={styles.bottomPrimaryButtonText}>Scan Product</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.bottomPrimaryButton, styles.bottomBarcodeButton]} onPress={openBarcodeScanner}>
          <View style={styles.bottomButtonContent}>
            <Ionicons name="barcode-outline" size={22} color="#fff" />
            <Text style={styles.bottomPrimaryButtonText}>Scan Barcode</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomSecondaryButton} onPress={handleSubmitPricePhoto}>
          <View style={styles.bottomButtonContent}>
            <Ionicons name="cloud-upload-outline" size={20} color="#6366F1" />
            <Text style={styles.bottomSecondaryButtonText}>Submit Price</Text>
          </View>
        </TouchableOpacity>
      </View>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#f59e0b" />
          <Text style={styles.loadingText}>Processing...</Text>
        </View>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  },
  headerBackButton: {
    width: 36,
    height: 36,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
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
  photoHeader: {
    paddingHorizontal: tokens.spacing.pad,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoHeaderButton: {
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.sm,
  },
  photoHeaderButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  photoScrollContent: {
    paddingHorizontal: tokens.spacing.pad,
    paddingBottom: tokens.spacing.xxl,
    gap: tokens.spacing.lg,
  },
  photoImage: {
    width: '100%',
    height: 220,
    borderRadius: tokens.radius.xl,
    backgroundColor: '#f8fafc',
  },
  photoTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  photoSubtitle: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
  },
  photoChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: tokens.spacing.sm,
  },
  photoChip: {
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.md,
    borderRadius: tokens.radius.full,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
  },
  photoChipText: {
    fontSize: tokens.text.tiny,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  photoSection: {
    gap: tokens.spacing.sm,
  },
  photoSectionTitle: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  photoPriceCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
    marginBottom: tokens.spacing.sm,
  },
  photoPriceStore: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  photoPriceMeta: {
    marginTop: 4,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  photoPriceSave: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.text.tiny,
    color: '#15803d',
    fontWeight: '600',
  },
  photoEmptyCard: {
    padding: tokens.spacing.md,
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
  },
  photoEmptyText: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '600',
  },
  photoEmptyHint: {
    marginTop: 4,
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  photoNutritionCard: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: '#f8fafc',
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    gap: tokens.spacing.xs,
  },
  photoNutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  photoNutritionLabel: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
  },
  photoNutritionValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  photoActions: {
    gap: tokens.spacing.sm,
    marginTop: tokens.spacing.lg,
  },
  photoActionButton: {
    paddingVertical: tokens.spacing.md,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
    alignItems: 'center',
  },
  photoPrimaryAction: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  photoActionText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  photoActionTextPrimary: {
    color: '#fff',
  },
  mainContent: {
    flex: 1,
    paddingHorizontal: tokens.spacing.pad,
  },
  resultScrollView: {
    flex: 1,
  },
  resultScrollContent: {
    paddingTop: tokens.spacing.md,
    paddingBottom: tokens.spacing.xl,
  },
  resultContainer: {
    // Keep minimal styling
  },
  resultContentWrapper: {
    flex: 1,
  },
  productResultIsolationWrapper: {
    backgroundColor: tokens.colors.bg,
    marginHorizontal: -tokens.spacing.pad,
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.lg,
    ...Platform.select({
      android: {
        elevation: 15,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 0,
        borderTopWidth: 2,
        borderBottomWidth: 2,
        borderColor: tokens.colors.bg,
      },
    }),
  },
  productResultWrapper: {
    marginBottom: 0,
    paddingHorizontal: 0,
  },
  welcomeSection: {
    alignItems: 'center',
    paddingVertical: tokens.spacing.xxl,
  },
  welcomeIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: tokens.spacing.lg,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: tokens.spacing.md,
  },
  featuresSection: {
    flex: 1,
    paddingHorizontal: tokens.spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    padding: tokens.spacing.lg,
    marginBottom: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
  },
  featureTitle: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    lineHeight: 18,
  },
  // Bottom Button Styles
  bottomButtonContainer: {
    paddingHorizontal: tokens.spacing.pad,
    paddingVertical: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
    backgroundColor: tokens.colors.bg,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
    gap: tokens.spacing.sm,
  },
  bottomPrimaryButton: {
    backgroundColor: '#f59e0b',
    borderRadius: tokens.radius.xl,
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  bottomBarcodeButton: {
    backgroundColor: '#6366F1',
    shadowColor: '#6366F1',
  },
  bottomSecondaryButton: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1.5,
    borderColor: '#6366F1',
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  bottomButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: tokens.spacing.lg,
    paddingHorizontal: tokens.spacing.lg,
    gap: tokens.spacing.sm,
  },
  bottomPrimaryButtonText: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: '#fff',
  },
  bottomSecondaryButtonText: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: '#6366F1',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
    position: 'relative',
  },
  quickCompareSheet: {
    position: 'absolute',
    left: tokens.spacing.pad,
    right: tokens.spacing.pad,
    bottom: 0,
    height: Math.round(Dimensions.get('window').height * 0.7),
    backgroundColor: tokens.colors.card,
    borderTopLeftRadius: tokens.radius.xl,
    borderTopRightRadius: tokens.radius.xl,
    paddingHorizontal: tokens.spacing.lg,
    paddingTop: tokens.spacing.lg,
    paddingBottom: tokens.spacing.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: '#d1d5db',
    marginBottom: tokens.spacing.md,
  },
  sheetHeading: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
  },
  sheetNotice: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginBottom: tokens.spacing.sm,
  },
  sheetSubheading: {
    marginTop: tokens.spacing.xs,
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    marginBottom: tokens.spacing.xs,
  },
  sheetMeta: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    marginBottom: tokens.spacing.sm,
  },
  sheetNutritionTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginTop: tokens.spacing.lg,
    marginBottom: tokens.spacing.sm,
  },
  sheetNutriScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: tokens.radius.full,
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  sheetNutriScoreLabel: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginRight: tokens.spacing.xs,
    fontWeight: '600',
  },
  sheetNutriScoreValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  savingsText: {
    color: tokens.colors.ink,
    fontWeight: '600',
    marginBottom: tokens.spacing.md,
  },
  cheapestPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  cheapestPillText: {
    color: '#1b5e20',
    fontWeight: '600',
    fontSize: tokens.text.body,
  },
  storeList: {
    marginTop: tokens.spacing.lg,
    gap: tokens.spacing.md,
  },
  storeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: tokens.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.line,
  },
  storeName: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
  },
  storeDistance: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginTop: tokens.spacing.xs / 2,
  },
  storePrice: {
    fontSize: tokens.text.h3,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptyNearbyText: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    marginTop: tokens.spacing.md,
  },
  // Result view styles
  section: {
    marginBottom: tokens.spacing.xl,
  },
  sectionTitle: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.md,
  },
  nutritionCard: {
    backgroundColor: '#f8fafc',
    borderRadius: tokens.radius.lg,
    paddingVertical: tokens.spacing.md,
    paddingHorizontal: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: tokens.spacing.sm,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  nutrientLabel: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '500',
  },
  nutrientValue: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: '#ecfeff',
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginBottom: tokens.spacing.lg,
  },
  noticeTitle: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.xs,
  },
  noticeMessage: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: tokens.spacing.lg,
  },
  metaText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginRight: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  nutriScorePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: tokens.radius.full,
    paddingVertical: 4,
    paddingHorizontal: tokens.spacing.md,
    marginBottom: tokens.spacing.xs,
  },
  nutriScoreLabel: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    marginRight: tokens.spacing.xs,
    fontWeight: '600',
  },
  nutriScoreValue: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  emptyState: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  emptyText: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
  },
  correctionButton: {
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  correctionButtonText: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: '#f59e0b',
  },
  // Submit view styles
  imagePreview: {
    marginBottom: tokens.spacing.lg,
  },
  imageLabel: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
  },
  imagePlaceholder: {
    height: 120,
    backgroundColor: '#f8fafc',
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: tokens.colors.line,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: tokens.text.body,
    fontWeight: '600',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
    marginTop: tokens.spacing.md,
  },
  storeSelector: {
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radius.lg,
    backgroundColor: tokens.colors.card,
  },
  picker: {
    height: 50,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.line,
    borderRadius: tokens.radius.lg,
    padding: tokens.spacing.md,
    fontSize: tokens.text.body,
    backgroundColor: tokens.colors.card,
    color: tokens.colors.ink,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#10B981',
    padding: tokens.spacing.lg,
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    marginTop: tokens.spacing.xl,
  },
  submitButtonDisabled: {
    backgroundColor: tokens.colors.ink2,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: tokens.text.body,
    fontWeight: '700',
  },
  // Loading overlay
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: tokens.text.body,
    fontWeight: '600',
    marginTop: tokens.spacing.md,
  },
});
