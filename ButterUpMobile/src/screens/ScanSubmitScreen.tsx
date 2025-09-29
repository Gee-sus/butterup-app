import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {useApp} from '../contexts/AppContext';
import LocationIndicator from '../components/LocationIndicator';

type Mode = 'menu' | 'photo';

export default function ScanSubmitScreen() {
  const {addToList, showSnackbar} = useApp();
  const [mode, setMode] = useState<Mode>('menu');
  const [storeName, setStoreName] = useState('');
  const [price, setPrice] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);


  const requestImagePermission = async () => {
    const {status} = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return status === 'granted';
  };

  const handleScanBarcode = async () => {
    Alert.alert(
      'Coming Soon', 
      'Barcode scanning will be available in the next version. For now, you can use the photo submission feature.',
      [{text: 'OK'}]
    );
  };


  const handleUploadPhoto = async () => {
    const permission = await requestImagePermission();
    if (!permission) {
      Alert.alert('Permission Required', 'Photo library permission is needed');
      return;
    }

    Alert.alert(
      'Select Photo Source',
      'Choose how you want to add a photo',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Camera',
          onPress: () => pickImage('camera'),
        },
        {
          text: 'Photo Library',
          onPress: () => pickImage('library'),
        },
      ]
    );
  };

  const pickImage = async (source: 'camera' | 'library') => {
    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    };

    try {
      const result = source === 'camera' 
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
        setMode('photo');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const submitPhoto = () => {
    if (!imageUri || !storeName.trim()) {
      Alert.alert('Missing Information', 'Please provide store name');
      return;
    }

    const submissionData = {
      image: imageUri,
      store: storeName.trim(),
      date: new Date().toISOString().split('T')[0],
      price: price.trim() || null,
      timestamp: new Date().toISOString(),
    };

    console.log('ðŸ“¸ Photo submission:', submissionData);
    
    Alert.alert(
      'Submission Complete!',
      'Thank you for contributing to our database!',
      [
        {
          text: 'OK',
          onPress: () => {
            setMode('menu');
            setStoreName('');
            setPrice('');
            setImageUri(null);
            showSnackbar('Photo submitted successfully!');
          },
        },
      ]
    );
  };

  const resetMode = () => {
    setMode('menu');
    setStoreName('');
    setPrice('');
    setImageUri(null);
  };


  if (mode === 'photo') {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={resetMode}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Submit Photo</Text>
        </View>
        
        <View style={styles.photoContainer}>
          <LocationIndicator containerStyle={styles.locationIndicator} />
          {imageUri && (
            <View style={styles.imagePreview}>
              <Text style={styles.imageLabel}>Selected Photo:</Text>
              {/* Image preview would go here */}
            </View>
          )}
          
          <View style={styles.form}>
            <Text style={styles.label}>Store Name *</Text>
            <TextInput
              style={styles.input}
              value={storeName}
              onChangeText={setStoreName}
              placeholder="e.g., Pak'nSave Albany"
            />
            
            <Text style={styles.label}>Price (optional)</Text>
            <TextInput
              style={styles.input}
              value={price}
              onChangeText={setPrice}
              placeholder="e.g., $4.50"
              keyboardType="numeric"
            />
            
            <Text style={styles.label}>Date</Text>
            <Text style={styles.dateText}>
              {new Date().toLocaleDateString()}
            </Text>
            
            <TouchableOpacity style={styles.submitButton} onPress={submitPhoto}>
              <Text style={styles.submitButtonText}>Submit Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scan & Submit</Text>
        <Text style={styles.subtitle}>
          Help build our butter price database
        </Text>
      </View>

      <View style={styles.content}>
        <LocationIndicator containerStyle={styles.locationIndicator} />
        <TouchableOpacity style={styles.primaryButton} onPress={handleScanBarcode}>
          <Ionicons name="barcode-outline" size={28} color="#fff" />
          <Text style={styles.primaryButtonText}>Scan Barcode</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleUploadPhoto}>
          <Ionicons name="camera-outline" size={24} color="#f59e0b" />
          <Text style={styles.buttonText}>Upload Shelf Photo</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Scan barcodes to add products or submit shelf photos with prices
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#f59e0b',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  locationIndicator: {
    marginBottom: 20,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f59e0b',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  primaryButtonText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  buttonText: {
    marginLeft: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  footerText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  photoContainer: {
    flex: 1,
    padding: 20,
  },
  imagePreview: {
    marginBottom: 20,
  },
  imageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  form: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#6b7280',
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  submitButton: {
    backgroundColor: '#059669',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 30,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});





