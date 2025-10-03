import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { tokens } from '../theme/tokens';

interface ProductResultCardProps {
  name: string;
  rating: number;
  image_url?: string;
}

export default function ProductResultCard({ name, rating, image_url }: ProductResultCardProps) {
  const renderStars = () => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(
          <Ionicons key={i} name="star" size={16} color="#F59E0B" />
        );
      } else if (i === fullStars && hasHalfStar) {
        stars.push(
          <Ionicons key={i} name="star-half" size={16} color="#F59E0B" />
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={16} color="#D1D5DB" />
        );
      }
    }

    return stars;
  };

  return (
    <View style={styles.container}>
      <View style={styles.imageContainer}>
        {image_url ? (
          <Image 
            source={{ uri: image_url }} 
            style={styles.productImage}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="cube-outline" size={24} color={tokens.colors.ink2} />
          </View>
        )}
      </View>
      
      <View style={styles.content}>
        <Text style={styles.productName} numberOfLines={2}>
          {name}
        </Text>
        
        <View style={styles.ratingRow}>
          <View style={styles.stars}>
            {renderStars()}
          </View>
          <Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
        </View>
        
        <Text style={styles.subtitle}>Prices near you</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    borderWidth: 1,
    borderColor: tokens.colors.line,
    padding: tokens.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    alignItems: 'flex-start',
    overflow: 'hidden',
    ...Platform.select({
      android: {
        elevation: 8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 1,
        shadowRadius: 0,
        borderWidth: 2,
        borderColor: tokens.colors.card,
      },
    }),
  },
  imageContainer: {
    width: 72,
    height: 72,
    backgroundColor: '#f8fafc',
    borderRadius: tokens.radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: tokens.spacing.md,
  },
  productImage: {
    width: 56,
    height: 56,
  },
  imagePlaceholder: {
    width: 56,
    height: 56,
    backgroundColor: tokens.colors.pill,
    borderRadius: tokens.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingTop: 4,
  },
  productName: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
    lineHeight: 18,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: tokens.spacing.xs,
  },
  stars: {
    flexDirection: 'row',
    marginRight: tokens.spacing.xs,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: tokens.colors.ink2,
  },
  subtitle: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    fontWeight: '500',
  },
});
