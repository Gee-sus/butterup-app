import React, {useRef} from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {Ionicons} from '@expo/vector-icons';
import {tokens} from '../theme/tokens';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = 120;

type SwipeableProductCardProps = {
  product: {
    id: number | string;
    name: string;
    brand?: string;
    image_url?: string;
    price?: number;
    store?: string;
    rating?: number;
  };
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
  isLastCard?: boolean;
};

const SwipeableProductCard: React.FC<SwipeableProductCardProps> = ({
  product,
  onSwipeLeft,
  onSwipeRight,
  isLastCard = false,
}) => {
  const position = useRef(new Animated.ValueXY()).current;
  const rotate = position.x.interpolate({
    inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2],
    outputRange: ['-10deg', '0deg', '10deg'],
    extrapolate: 'clamp',
  });

  const likeOpacity = position.x.interpolate({
    inputRange: [0, SWIPE_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const nopeOpacity = position.x.interpolate({
    inputRange: [-SWIPE_THRESHOLD, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gesture) => {
        position.setValue({x: gesture.dx, y: gesture.dy});
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right - View more
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left - Skip
          forceSwipe('left');
        } else {
          // Return to center
          resetPosition();
        }
      },
    }),
  ).current;

  const forceSwipe = (direction: 'left' | 'right') => {
    const x = direction === 'right' ? SCREEN_WIDTH + 100 : -SCREEN_WIDTH - 100;
    Animated.timing(position, {
      toValue: {x, y: 0},
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      if (direction === 'right') {
        onSwipeRight();
      } else {
        onSwipeLeft();
      }
      position.setValue({x: 0, y: 0});
    });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: {x: 0, y: 0},
      useNativeDriver: true,
    }).start();
  };

  const cardStyle = {
    transform: [
      {translateX: position.x},
      {translateY: position.y},
      {rotate}
    ],
  };

  if (isLastCard) {
    return (
      <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
        <View style={styles.showMoreCard}>
          <Ionicons name="add-circle-outline" size={64} color={tokens.colors.pill} />
          <Text style={styles.showMoreTitle}>Show More</Text>
          <Text style={styles.showMoreSubtitle}>
            Swipe right to see products from the next cheapest supermarket
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, cardStyle]} {...panResponder.panHandlers}>
      {/* Swipe indicators */}
      <Animated.View style={[styles.likeLabel, {opacity: likeOpacity}]}>
        <Text style={styles.likeLabelText}>VIEW MORE</Text>
      </Animated.View>
      <Animated.View style={[styles.nopeLabel, {opacity: nopeOpacity}]}>
        <Text style={styles.nopeLabelText}>SKIP</Text>
      </Animated.View>

      {/* Card content */}
      <View style={styles.cardContent}>
        {product.image_url ? (
          <Image
            source={{uri: product.image_url}}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image-outline" size={48} color={tokens.colors.ink2} />
          </View>
        )}

        <View style={styles.productInfo}>
          {product.brand && <Text style={styles.brandText}>{product.brand}</Text>}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          <View style={styles.priceRow}>
            {product.price !== undefined && (
              <Text style={styles.priceText}>${product.price.toFixed(2)}</Text>
            )}
            {product.store && <Text style={styles.storeText}>at {product.store}</Text>}
          </View>

          {product.rating !== undefined && (
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color={tokens.colors.pill} />
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.ratingLabel}>Overall Rating</Text>
            </View>
          )}
        </View>

        {/* Swipe hint */}
        <View style={styles.swipeHint}>
          <View style={styles.hintItem}>
            <Ionicons name="arrow-back" size={20} color={tokens.colors.error} />
            <Text style={styles.hintText}>Skip</Text>
          </View>
          <View style={styles.hintItem}>
            <Ionicons name="arrow-forward" size={20} color={tokens.colors.success} />
            <Text style={styles.hintText}>View</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    width: SCREEN_WIDTH - 40,
    height: 500,
    backgroundColor: tokens.colors.card,
    borderRadius: tokens.radius.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  cardContent: {
    flex: 1,
    padding: tokens.spacing.lg,
  },
  productImage: {
    width: '100%',
    height: 240,
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.md,
  },
  placeholderImage: {
    width: '100%',
    height: 240,
    borderRadius: tokens.radius.lg,
    marginBottom: tokens.spacing.md,
    backgroundColor: tokens.colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productInfo: {
    flex: 1,
  },
  brandText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: tokens.spacing.xs,
  },
  productName: {
    fontSize: tokens.text.h2,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginBottom: tokens.spacing.sm,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    marginBottom: tokens.spacing.sm,
  },
  priceText: {
    fontSize: 24,
    fontWeight: '800',
    color: tokens.colors.success,
  },
  storeText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    marginBottom: tokens.spacing.md,
  },
  ratingText: {
    fontSize: tokens.text.body,
    fontWeight: '700',
    color: tokens.colors.ink,
  },
  ratingLabel: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  swipeHint: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: tokens.spacing.md,
    borderTopWidth: 1,
    borderTopColor: tokens.colors.line,
  },
  hintItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: tokens.spacing.xs,
  },
  hintText: {
    fontSize: tokens.text.tiny,
    color: tokens.colors.ink2,
  },
  likeLabel: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
    backgroundColor: tokens.colors.success,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    transform: [{rotate: '20deg'}],
  },
  likeLabelText: {
    fontSize: tokens.text.body,
    fontWeight: '800',
    color: '#ffffff',
  },
  nopeLabel: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 1000,
    backgroundColor: tokens.colors.error,
    paddingHorizontal: tokens.spacing.md,
    paddingVertical: tokens.spacing.sm,
    borderRadius: tokens.radius.lg,
    transform: [{rotate: '-20deg'}],
  },
  nopeLabelText: {
    fontSize: tokens.text.body,
    fontWeight: '800',
    color: '#ffffff',
  },
  showMoreCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: tokens.spacing.xl,
  },
  showMoreTitle: {
    fontSize: tokens.text.title,
    fontWeight: '700',
    color: tokens.colors.ink,
    marginTop: tokens.spacing.md,
    marginBottom: tokens.spacing.sm,
  },
  showMoreSubtitle: {
    fontSize: tokens.text.body,
    color: tokens.colors.ink2,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default SwipeableProductCard;
