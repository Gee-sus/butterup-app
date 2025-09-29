import React, {useMemo} from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Ionicons} from '@expo/vector-icons';

import {useLocation} from '../contexts/LocationContext';
import {tokens} from '../theme/tokens';

interface LocationIndicatorProps {
  variant?: 'banner' | 'compact';
  containerStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

const formatStoreSummary = (chains: string[]) => {
  if (!chains.length) {
    return 'Prices from supermarkets near you.';
  }

  if (chains.length === 1) {
    return `Prices from ${chains[0]} near you.`;
  }

  if (chains.length === 2) {
    return `Prices from ${chains[0]} and ${chains[1]} near you.`;
  }

  const others = chains.slice(0, -1).join(', ');
  const last = chains[chains.length - 1];
  return `Prices from ${others}, and ${last} near you.`;
};

const LocationIndicator: React.FC<LocationIndicatorProps> = ({
  variant = 'banner',
  containerStyle,
  textStyle,
}) => {
  const navigation = useNavigation<any>();
  const {
    locationLabel,
    locationDescription,
    nearbyStoreChains,
  } = useLocation();

  const storeSummary = useMemo(
    () => formatStoreSummary(nearbyStoreChains),
    [nearbyStoreChains],
  );

  const handlePress = () => {
    if (navigation && typeof navigation.navigate === 'function') {
      navigation.navigate('StoreDetection');
    }
  };

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.pill, containerStyle]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name="navigate-outline"
          size={16}
          color="#ffffff"
          style={styles.pillIcon}
        />
        <Text style={[styles.pillText, textStyle]} numberOfLines={1}>
          {locationLabel}
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      style={[styles.banner, containerStyle]}
      onPress={handlePress}
      activeOpacity={0.85}
    >
      <View style={styles.pill}>
        <Ionicons
          name="navigate-outline"
          size={16}
          color="#ffffff"
          style={styles.pillIcon}
        />
        <Text style={[styles.pillText, textStyle]} numberOfLines={1}>
          {locationLabel}
        </Text>
      </View>
      <Text style={styles.bannerDescription}>{locationDescription}</Text>
      <Text style={styles.bannerStores}>{storeSummary}</Text>
      <Text style={styles.bannerHint}>Tap to adjust suburb and supermarkets</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: tokens.colors.pill,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.xl,
    alignSelf: 'flex-start',
  },
  pillIcon: {
    marginRight: tokens.spacing.xs,
  },
  pillText: {
    color: '#ffffff',
    fontSize: tokens.text.tiny,
    fontWeight: '600',
  },
  banner: {
    borderRadius: tokens.radius.lg,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    backgroundColor: tokens.colors.card,
    padding: tokens.spacing.md,
    gap: tokens.spacing.xs,
    alignSelf: 'stretch',
  },
  bannerDescription: {
    color: tokens.colors.ink2,
    fontSize: tokens.text.tiny,
    lineHeight: 18,
  },
  bannerStores: {
    color: tokens.colors.ink,
    fontSize: tokens.text.tiny,
    fontWeight: '600',
  },
  bannerHint: {
    color: tokens.colors.ink2,
    fontSize: 11,
  },
});

export default LocationIndicator;
