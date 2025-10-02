import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Picker,
  Platform,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useApp} from '../contexts/AppContext';
import LocationIndicator from '../components/LocationIndicator';
import ProductResultCard from '../components/ProductResultCard';
import StorePriceRow from '../components/StorePriceRow';
import {scanApi} from '../services/api';
import {tokens} from '../theme/tokens';

type Mode = 'menu' | 'result' | 'submit';

interface IdentifiedProduct {
  id: number;
  name_with_brand: string;
  rating: number;
  image_url?: string;
}

interface StorePrice {
  store: string;
  price: number;
  distance_km?: number;
}

const MAIN_STORES = ["Pak'nSave", "Woolworths", "New World"];

export default function ScanSubmitScreen() {
  const {addToList, showSnackbar} = useApp();
  const insets = useSafeAreaInsets();
  const headerMargin = insets.top + tokens.spacing.md;

  const [mode, setMode] = useState<Mode>('menu');
  const [loading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  
  // Result state
  const [identifiedProduct, setIdentifiedProduct] = useState<IdentifiedProduct | null>(null);
  const [storePrices, setStorePrices] = useState<StorePrice[]>([]);
  
  // Submit state
  const [storeName, setStoreName] = useState('');
  const [price, setPrice] = useState('');
  const [note, setNote] = useState('');
  const [selectedStore, setSelectedStore] = useState('');
  const [productId, setProductId] = useState<number | undefined>(undefined);


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
      const location = await getCurrentLocation();
      const product = await scanApi.identifyByPhoto(uri, location || undefined);
      
      setIdentifiedProduct(product);
      
      // Fetch nearby prices
      const prices = await scanApi.nearbyPrices(product.id, location || undefined);
      setStorePrices(prices);
      
      setMode('result');
    } catch (error) {
      Alert.alert(
        'Identification Failed',
        'We couldn\'t identify this product. Please try again or submit it manually.',
        [
          {text: 'Try Again', onPress: () => setLoading(false)},
          {text: 'Submit Manually', onPress: () => {
            setMode('submit');
            setLoading(false);
          }},
        ]
      );
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

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setMode('submit');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
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
    setImageUri(null);
    setIdentifiedProduct(null);
    setStorePrices([]);
    setStoreName('');
    setPrice('');
    setNote('');
    setSelectedStore('');
    setProductId(undefined);
    setLoading(false);
  };

  const handleWrongPrice = () => {
    if (identifiedProduct) {
      setProductId(identifiedProduct.id);
    }
    setMode('submit');
  };


  if (mode === 'result' && identifiedProduct) {
    const lowestPrice = Math.min(...storePrices.map(p => p.price));
    
    return (
      <SafeAreaView style={styles.container}>
          <View style={[styles.header, { marginTop: headerMargin }]}>
            <View style={styles.headerRow}>
              <Text style={styles.title}>Product Found</Text>
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
                    name={identifiedProduct.name_with_brand}
                    rating={identifiedProduct.rating}
                    image_url={identifiedProduct.image_url}
                  />
                </View>
              </View>

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
                      isLowest={storePrice.price === lowestPrice}
                    />
                  ))
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No nearby prices yet—be the first to submit!</Text>
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





